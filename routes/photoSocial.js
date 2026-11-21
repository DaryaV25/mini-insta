const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const RELATED_LIMIT = 12;
const MAX_COMMENT = 500;

// Токен необязателен: гость просто увидит liked: false
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      // невалидный токен — считаем гостем
    }
  }
  next();
};

const serverError = (res, error) => {
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({ error: error.errors.map((e) => e.message) });
  }
  res.status(500).json({ error: "Ошибка сервера", details: error.message });
};

const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Находит фото по :id или сам отвечает 400/404 (тогда вернёт null)
const findPhotoOr404 = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Неверный формат id" });
    return null;
  }
  const photo = await db.Photo.findByPk(id);
  if (!photo) {
    res.status(404).json({ error: "Фотография не найдена" });
    return null;
  }
  return photo;
};

const commentInclude = [
  { model: db.User, as: "user", attributes: ["id", "email"] },
];

// Email наружу не отдаём — только имя до @
const serializeComment = (c) => ({
  id: c.id,
  photoId: c.photoId,
  userId: c.userId,
  author: c.user ? c.user.email.split("@")[0] : "удалённый пользователь",
  text: c.text,
  createdAt: c.createdAt,
  edited: c.updatedAt - c.createdAt > 1000,
});

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

/* ---------------- Похожие фото ---------------- */
router.get("/:id/related", async (req, res) => {
  try {
    const photo = await findPhotoOr404(req, res);
    if (!photo) return;

    const candidates = await db.Photo.findAll({
      where: {
        id: { [Op.ne]: photo.id },
        [Op.or]: [{ album: photo.album }, { filter: photo.filter }],
      },
      order: [
        ["likes", "DESC"],
        ["id", "ASC"],
      ],
      limit: 40,
    });

    // тот же альбом важнее, чем тот же фильтр
    const score = (p) =>
      (p.album === photo.album ? 2 : 0) + (p.filter === photo.filter ? 1 : 0);
    let related = candidates
      .sort((a, b) => score(b) - score(a) || b.likes - a.likes)
      .slice(0, RELATED_LIMIT);

    // если похожих мало — добираем самыми популярными
    if (related.length < RELATED_LIMIT) {
      const rest = await db.Photo.findAll({
        where: { id: { [Op.notIn]: [photo.id, ...related.map((p) => p.id)] } },
        order: [
          ["likes", "DESC"],
          ["id", "ASC"],
        ],
        limit: RELATED_LIMIT - related.length,
      });
      related = [...related, ...rest];
    }

    res.json(related);
  } catch (error) {
    serverError(res, error);
  }
});

/* ---------------- Лайки ---------------- */
router.get("/:id/like", optionalAuth, async (req, res) => {
  try {
    const photo = await findPhotoOr404(req, res);
    if (!photo) return;

    let liked = false;
    if (req.user) {
      liked = Boolean(
        await db.PhotoLike.findOne({
          where: { photoId: photo.id, userId: req.user.id },
        }),
      );
    }
    res.json({ liked, likes: photo.likes });
  } catch (error) {
    serverError(res, error);
  }
});

// Переключатель: нет лайка — поставить, есть — снять
router.post("/:id/like", authenticate, async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "Неверный формат id" });

    const result = await db.sequelize.transaction(async (t) => {
      const photo = await db.Photo.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!photo) return null;

      const where = { photoId: id, userId: req.user.id };
      const existing = await db.PhotoLike.findOne({ where, transaction: t });

      if (existing) {
        await existing.destroy({ transaction: t });
        await photo.update(
          { likes: Math.max(0, photo.likes - 1) },
          { transaction: t },
        );
        return { liked: false, likes: photo.likes };
      }

      await db.PhotoLike.create(where, { transaction: t });
      await photo.update({ likes: photo.likes + 1 }, { transaction: t });
      return { liked: true, likes: photo.likes };
    });

    if (!result) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json(result);
  } catch (error) {
    serverError(res, error);
  }
});

/* ---------------- Комментарии (CRUD) ---------------- */
router.get("/:id/comments", async (req, res) => {
  try {
    const photo = await findPhotoOr404(req, res);
    if (!photo) return;

    const comments = await db.Comment.findAll({
      where: { photoId: photo.id },
      include: commentInclude,
      order: [["createdAt", "ASC"]],
    });
    res.json(comments.map(serializeComment));
  } catch (error) {
    serverError(res, error);
  }
});

router.post("/:id/comments", authenticate, async (req, res) => {
  try {
    const photo = await findPhotoOr404(req, res);
    if (!photo) return;

    const text = cleanText(req.body?.text);
    if (!text || text.length > MAX_COMMENT) {
      return res.status(400).json({
        error: `Комментарий должен быть от 1 до ${MAX_COMMENT} символов`,
      });
    }

    const created = await db.Comment.create({
      photoId: photo.id,
      userId: req.user.id,
      text,
    });
    const comment = await db.Comment.findByPk(created.id, {
      include: commentInclude,
    });
    res.status(201).json(serializeComment(comment));
  } catch (error) {
    serverError(res, error);
  }
});

// Редактировать можно только свой комментарий
router.put("/:id/comments/:commentId", authenticate, async (req, res) => {
  try {
    const photoId = toId(req.params.id);
    const commentId = toId(req.params.commentId);
    if (!photoId || !commentId) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const comment = await db.Comment.findOne({
      where: { id: commentId, photoId },
      include: commentInclude,
    });
    if (!comment) {
      return res.status(404).json({ error: "Комментарий не найден" });
    }
    if (comment.userId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Можно редактировать только свои комментарии" });
    }

    const text = cleanText(req.body?.text);
    if (!text || text.length > MAX_COMMENT) {
      return res.status(400).json({
        error: `Комментарий должен быть от 1 до ${MAX_COMMENT} символов`,
      });
    }

    await comment.update({ text });
    res.json(serializeComment(comment));
  } catch (error) {
    serverError(res, error);
  }
});

// Удалить может автор комментария или администратор
router.delete("/:id/comments/:commentId", authenticate, async (req, res) => {
  try {
    const photoId = toId(req.params.id);
    const commentId = toId(req.params.commentId);
    if (!photoId || !commentId) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const comment = await db.Comment.findOne({
      where: { id: commentId, photoId },
    });
    if (!comment) {
      return res.status(404).json({ error: "Комментарий не найден" });
    }
    if (comment.userId !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Можно удалять только свои комментарии" });
    }

    await comment.destroy();
    res.json({ message: "Комментарий удалён", id: commentId });
  } catch (error) {
    serverError(res, error);
  }
});

module.exports = router;

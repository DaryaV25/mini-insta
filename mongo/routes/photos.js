const express = require("express");
const mongoose = require("mongoose");
const Photo = require("../models/Photo");

const router = express.Router();

const isValidId = (id) => mongoose.isValidObjectId(id);

const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: Object.values(error.errors).map((e) => e.message),
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ error: "Неверный формат данных" });
  }
  res.status(500).json({ error: "Ошибка сервера", details: error.message });
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------------- CRUD ---------------- */
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (typeof req.query.album === "string" && req.query.album.trim()) {
      filter.album = req.query.album.trim();
    }
    if (typeof req.query.tag === "string" && req.query.tag.trim()) {
      filter.tags = req.query.tag.trim();
    }
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const regex = new RegExp(escapeRegExp(req.query.search.trim()), "i");
      filter.$or = [{ title: regex }, { album: regex }];
    }

    const photos = await Photo.find(filter).sort({ createdAt: 1 });
    res.json(photos);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, imageUrl, filter, album, likes, tags, comments } =
      req.body || {};

    const photo = await Photo.create({
      title,
      imageUrl,
      filter,
      album,
      likes: likes ?? 0,
      tags: tags ?? [],
      comments: comments ?? [],
    });

    res.status(201).json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const { title, imageUrl, filter, album, likes, tags } = req.body;
    const update = { title, imageUrl, filter, album, likes, tags };
    Object.keys(update).forEach(
      (k) => update[k] === undefined && delete update[k],
    );

    const photo = await Photo.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json({ message: "Фотография удалена", deleted: photo });
  } catch (error) {
    handleError(res, error);
  }
});

/* ------- Работа с вложенными структурами (массивы) ------- */
router.post("/:id/comments", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const { author, text } = req.body;
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author, text } } },
      { new: true, runValidators: true },
    );
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.status(201).json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/:id/comments/:commentId", async (req, res) => {
  try {
    const { id, commentId } = req.params;
    if (!isValidId(id) || !isValidId(commentId)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Введите текст комментария" });
    }

    const photo = await Photo.findOneAndUpdate(
      { _id: id, "comments._id": commentId },
      { $set: { "comments.$.text": String(text).trim() } },
      { new: true, runValidators: true },
    );
    if (!photo) {
      return res
        .status(404)
        .json({ error: "Фотография или комментарий не найдены" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    const { id, commentId } = req.params;
    if (!isValidId(id) || !isValidId(commentId)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const photo = await Photo.findOneAndUpdate(
      { _id: id, "comments._id": commentId },
      { $pull: { comments: { _id: commentId } } },
      { new: true },
    );
    if (!photo) {
      return res
        .status(404)
        .json({ error: "Фотография или комментарий не найдены" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/:id/like", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true },
    );
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/:id/tags", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }
    const tag =
      typeof req.body.tag === "string" ? req.body.tag.trim().toLowerCase() : "";
    if (!tag) {
      return res.status(400).json({ error: "Поле tag обязательно" });
    }
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { tags: tag } },
      { new: true },
    );
    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }
    res.json(photo);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;

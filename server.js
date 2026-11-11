require("dotenv").config();
const authRoutes = require("./routes/auth");
const { authenticate, isAdmin } = require("./middleware/auth");
const express = require("express");
const { Op } = require("sequelize");
const db = require("./models");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use("/auth", authRoutes);

db.sequelize
  .authenticate()
  .then(() => console.log("Подключение к PostgreSQL успешно"))
  .catch((err) => console.error("Ошибка подключения к базе:", err));

app.get("/photos", async (req, res) => {
  try {
    const where = {};
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: pattern } },
        { album: { [Op.iLike]: pattern } },
      ];
    }

    const photos = await db.Photo.findAll({
      where,
      order: [["id", "ASC"]],
    });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.get("/photos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const photo = await db.Photo.findByPk(id);

    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }

    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: ["id", "email", "role", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.post("/photos", async (req, res) => {
  try {
    const { title, imageUrl, filter, album, likes } = req.body;

    if (!title || !imageUrl || !filter || !album) {
      return res.status(400).json({
        error: "Обязательные поля: title, imageUrl, filter, album",
      });
    }

    const allowedFilters = [
      "none",
      "sepia",
      "grayscale",
      "vintage",
      "warm",
      "cool",
    ];
    if (!allowedFilters.includes(filter)) {
      return res.status(400).json({
        error: `Недопустимый фильтр. Разрешены: ${allowedFilters.join(", ")}`,
      });
    }

    const newPhoto = await db.Photo.create({
      title,
      imageUrl,
      filter,
      album,
      likes: likes ?? 0,
    });

    res.status(201).json(newPhoto);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.put("/photos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const photo = await db.Photo.findByPk(id);

    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }

    const { title, imageUrl, filter, album, likes } = req.body;

    if (!title || !imageUrl || !filter || !album) {
      return res.status(400).json({
        error: "Обязательные поля: title, imageUrl, filter, album",
      });
    }

    const allowedFilters = [
      "none",
      "sepia",
      "grayscale",
      "vintage",
      "warm",
      "cool",
    ];
    if (!allowedFilters.includes(filter)) {
      return res.status(400).json({
        error: `Недопустимый фильтр. Разрешены: ${allowedFilters.join(", ")}`,
      });
    }

    await photo.update({
      title,
      imageUrl,
      filter,
      album,
      likes: likes !== undefined ? likes : photo.likes,
    });

    res.json(photo);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.delete("/photos/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Неверный формат id" });
    }

    const photo = await db.Photo.findByPk(id);

    if (!photo) {
      return res.status(404).json({ error: "Фотография не найдена" });
    }

    await photo.destroy();

    res.json({
      message: "Фотография удалена",
      deleted: photo,
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

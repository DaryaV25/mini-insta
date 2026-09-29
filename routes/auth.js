const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../models");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль должен быть не менее 6 символов" });
    }

    // Проверка уникальности email
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Пользователь с таким email уже существует" });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.User.create({
      email,
      passwordHash,
      role: role === "admin" ? "admin" : "user", // по умолчанию user
    });

    res.status(201).json({
      message: "Пользователь успешно зарегистрирован",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Сравнение пароля с хешем
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Генерация JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({
      message: "Успешный вход",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

module.exports = router;

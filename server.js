const express = require("express");
const app = express();

app.use(express.json());

const PORT = 3000;

// ===== Данные в памяти =====
let photos = [
  {
    id: 1,
    title: "Закат на море",
    imageUrl: "https://example.com/photos/sunset.jpg",
    filter: "vintage",
    album: "Путешествия",
    likes: 42,
  },
  {
    id: 2,
    title: "Кофе в городе",
    imageUrl: "https://example.com/photos/coffee.jpg",
    filter: "sepia",
    album: "Повседневность",
    likes: 18,
  },
  {
    id: 3,
    title: "Горы зимой",
    imageUrl: "https://example.com/photos/mountains.jpg",
    filter: "none",
    album: "Путешествия",
    likes: 67,
  },
];

let nextId = 4;

// ===== Маршруты =====

// 1. GET /photos — получить все фотографии
app.get("/photos", (req, res) => {
  res.json(photos);
});

// 2. GET /photos/:id — получить одну фотографию по id
app.get("/photos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Неверный формат id" });
  }

  const photo = photos.find((p) => p.id === id);

  if (!photo) {
    return res.status(404).json({ error: "Фотография не найдена" });
  }

  res.json(photo);
});

// 3. POST /photos — добавить новую фотографию
app.post("/photos", (req, res) => {
  const { title, imageUrl, filter, album, likes } = req.body;

  // Валидация обязательных полей
  if (!title || !imageUrl || !filter || !album) {
    return res.status(400).json({
      error: "Обязательные поля: title, imageUrl, filter, album",
    });
  }

  // Проверка допустимых фильтров
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

  const newPhoto = {
    id: nextId++,
    title,
    imageUrl,
    filter,
    album,
    likes: likes || 0, // если likes не передали — ставим 0
  };

  photos.push(newPhoto);
  res.status(201).json(newPhoto);
});

// 4. PUT /photos/:id — полное обновление фотографии
app.put("/photos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Неверный формат id" });
  }

  const index = photos.findIndex((p) => p.id === id);

  if (index === -1) {
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

  // Полностью заменяем объект (id оставляем старый)
  photos[index] = {
    id,
    title,
    imageUrl,
    filter,
    album,
    likes: likes !== undefined ? likes : photos[index].likes,
  };

  res.json(photos[index]);
});

// 5. DELETE /photos/:id — удалить фотографию
app.delete("/photos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Неверный формат id" });
  }

  const index = photos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Фотография не найдена" });
  }

  const deleted = photos.splice(index, 1)[0];
  res.json({ message: "Фотография удалена", deleted });
});

// ===== Глобальный обработчик ошибок =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

// ===== Запуск сервера =====
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

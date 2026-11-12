require("dotenv").config();
const mongoose = require("mongoose");
const Photo = require("./models/Photo");

const data = [
  {
    id: 1,
    title: "Закат на море",
    imageUrl:
      "https://img.magnific.com/free-photo/beautiful-shot-colorful-sunset-beach_181624-27368.jpg?semt=ais_hybrid&w=740&q=80",
    filter: "vintage",
    album: "Путешествия",
    likes: 42,
    tags: ["закат", "море", "лето"],
    comments: [
      { author: "anna", text: "Очень красивые цвета!" },
      { author: "ivan", text: "Где это снято?" },
    ],
  },
  {
    id: 2,
    title: "Кофе в городе",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZdduN4rshXLcQfFOhrvy5KU45xgz3Br-Ss92wyHWpTK1p0Pq51cMd2k1Z&s=10",
    filter: "sepia",
    album: "Повседневность",
    likes: 18,
    tags: ["кофе", "город"],
    comments: [{ author: "olga", text: "Люблю такой стиль" }],
  },
  {
    id: 3,
    title: "Горы зимой",
    imageUrl:
      "https://img.magnific.com/free-photo/beautiful-shot-mountains-trees-covered-snow-fog_181624-17590.jpg?semt=ais_hybrid&w=740&q=80",
    filter: "none",
    album: "Путешествия",
    likes: 67,
    tags: ["горы", "зима", "снег"],
    comments: [],
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Photo.deleteMany({});
    const created = await Photo.insertMany(data);
    console.log(`Добавлено документов: ${created.length}`);
  } catch (err) {
    console.error("Ошибка:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

const mongoose = require("mongoose");

const ALLOWED_FILTERS = [
  "none",
  "sepia",
  "grayscale",
  "vintage",
  "warm",
  "cool",
];

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: [true, "Укажите автора комментария"],
      trim: true,
    },
    text: {
      type: String,
      required: [true, "Введите текст комментария"],
      trim: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const photoSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Укажите название"], trim: true },
    imageUrl: {
      type: String,
      required: [true, "Укажите ссылку на изображение"],
    },
    filter: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_FILTERS,
        message: `Недопустимый фильтр. Разрешены: ${ALLOWED_FILTERS.join(", ")}`,
      },
      default: "none",
    },
    album: { type: String, required: [true, "Укажите альбом"], trim: true },
    likes: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [] },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true, collection: "photos" },
);

photoSchema.index({ album: 1 });
photoSchema.index({ tags: 1 });

const Photo = mongoose.model("Photo", photoSchema);

module.exports = Photo;
module.exports.ALLOWED_FILTERS = ALLOWED_FILTERS;

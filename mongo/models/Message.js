const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    // публичный идентификатор автора (хэш), по нему проверяем права
    authorId: { type: String, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    edited: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "messages" },
);

messageSchema.index({ room: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Message = require("./mongo/models/Message");

const DEFAULT_ROOM = "Общий";
const HISTORY_LIMIT = 50;

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// Что отправляем клиентам (без служебных полей Mongo)
const publicMessage = (m) => ({
  _id: m._id,
  room: m.room,
  author: m.author,
  authorId: m.authorId,
  text: m.text,
  edited: Boolean(m.edited),
  createdAt: m.createdAt,
});

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*" },
  });

  // socket.id -> { username, room }
  const users = new Map();

  // Идентификация: вошедший пользователь — по JWT, гость — по секретному
  // clientId вкладки. В сообщениях хранится только хэш, поэтому подделать
  // чужого автора, просто введя то же имя, нельзя.
  io.use((socket, next) => {
    const { token, clientId } = socket.handshake.auth || {};
    let key = null;

    if (typeof token === "string" && token) {
      try {
        key = `u:${jwt.verify(token, process.env.JWT_SECRET).id}`;
      } catch {
        // истёкший токен — считаем гостем
      }
    }
    if (!key && typeof clientId === "string" && clientId.length >= 8) {
      key = `g:${clientId.slice(0, 64)}`;
    }
    if (!key) return next(new Error("Не удалось определить пользователя"));

    socket.data.authorId = crypto
      .createHash("sha256")
      .update(key)
      .digest("hex")
      .slice(0, 16);
    next();
  });

  const usersInRoom = (room) =>
    [...users.entries()]
      .filter(([, u]) => u.room === room)
      .map(([id, u]) => ({ id, username: u.username }));

  const systemMessage = (room, text) =>
    io.to(room).emit("system message", { text, createdAt: new Date() });

  const sendUsers = (room) => io.to(room).emit("room users", usersInRoom(room));

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);
    socket.emit("identity", socket.data.authorId);

    const leaveCurrentRoom = () => {
      const user = users.get(socket.id);
      if (!user || !user.room) return;
      socket.leave(user.room);
      const oldRoom = user.room;
      user.room = null;
      systemMessage(oldRoom, `${user.username} покинул(а) комнату`);
      socket.to(oldRoom).emit("typing", {
        username: user.username,
        isTyping: false,
      });
      sendUsers(oldRoom);
    };

    // Вход в комнату (или переход в другую)
    socket.on("join", async ({ username, room } = {}) => {
      const name = clean(username, 30);
      const roomName = clean(room, 40) || DEFAULT_ROOM;
      if (!name) return;

      const existing = users.get(socket.id);
      if (existing && existing.room === roomName) return;
      if (existing) leaveCurrentRoom();

      users.set(socket.id, { username: name, room: roomName });
      socket.join(roomName);

      try {
        const history = await Message.find({ room: roomName })
          .sort({ createdAt: -1 })
          .limit(HISTORY_LIMIT)
          .lean();
        socket.emit("history", history.reverse().map(publicMessage));
      } catch (err) {
        console.error("Ошибка загрузки истории:", err.message);
        socket.emit("history", []);
      }

      systemMessage(roomName, `${name} присоединился(ась) к комнате`);
      sendUsers(roomName);
    });

    // CREATE: сообщение в комнату + сохранение в MongoDB
    socket.on("chat message", async (text) => {
      const user = users.get(socket.id);
      const body = clean(text, 1000);
      if (!user || !user.room || !body) return;

      try {
        const saved = await Message.create({
          room: user.room,
          author: user.username,
          authorId: socket.data.authorId,
          text: body,
        });
        io.to(user.room).emit("chat message", publicMessage(saved.toObject()));
      } catch (err) {
        console.error("Ошибка сохранения сообщения:", err.message);
        socket.emit("error message", "Не удалось отправить сообщение");
      }
    });

    // UPDATE: изменить своё сообщение
    socket.on("edit message", async ({ id, text } = {}) => {
      const user = users.get(socket.id);
      const body = clean(text, 1000);
      if (!user || !user.room || !body || !mongoose.isValidObjectId(id)) return;

      try {
        const updated = await Message.findOneAndUpdate(
          { _id: id, room: user.room, authorId: socket.data.authorId },
          { text: body, edited: true },
          { new: true, runValidators: true },
        ).lean();

        if (!updated) {
          return socket.emit("error message", "Нельзя изменить это сообщение");
        }
        io.to(user.room).emit("message edited", {
          _id: updated._id,
          text: updated.text,
          edited: true,
        });
      } catch (err) {
        console.error("Ошибка редактирования:", err.message);
        socket.emit("error message", "Не удалось изменить сообщение");
      }
    });

    // DELETE: удалить своё сообщение
    socket.on("delete message", async (id) => {
      const user = users.get(socket.id);
      if (!user || !user.room || !mongoose.isValidObjectId(id)) return;

      try {
        const deleted = await Message.findOneAndDelete({
          _id: id,
          room: user.room,
          authorId: socket.data.authorId,
        }).lean();

        if (!deleted) {
          return socket.emit("error message", "Нельзя удалить это сообщение");
        }
        io.to(user.room).emit("message deleted", String(deleted._id));
      } catch (err) {
        console.error("Ошибка удаления:", err.message);
        socket.emit("error message", "Не удалось удалить сообщение");
      }
    });

    // Приватное сообщение конкретному пользователю по socket.id
    socket.on("private message", ({ to, text } = {}) => {
      const user = users.get(socket.id);
      const body = clean(text, 1000);
      if (!user || !body || !users.has(to)) return;

      const payload = {
        from: user.username,
        fromId: socket.id,
        to: users.get(to).username,
        toId: to,
        text: body,
        createdAt: new Date(),
      };
      io.to(to).emit("private message", payload);
      if (to !== socket.id) socket.emit("private message", payload);
    });

    // Индикатор набора текста
    socket.on("typing", (isTyping) => {
      const user = users.get(socket.id);
      if (!user || !user.room) return;
      socket.to(user.room).emit("typing", {
        username: user.username,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
      leaveCurrentRoom();
      users.delete(socket.id);
    });
  });

  return io;
}

module.exports = initSocket;

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { socket } from "../socket";
import useAuth from "../hooks/useAuth";
import { ArrowLeftIcon, EditIcon, TrashIcon, CheckIcon, CloseIcon } from "./icons";

const ROOMS = ["Общий", "Путешествия", "Повседневность"];

const time = (d) =>
  new Date(d).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

// Секретный id вкладки для гостей (у вошедших личность подтверждает JWT)
const getClientId = () => {
  const fallback = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    let id = sessionStorage.getItem("chatClientId");
    if (!id) {
      id =
        typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : fallback();
      sessionStorage.setItem("chatClientId", id);
    }
    return id;
  } catch {
    return fallback();
  }
};

function Chat() {
  const { user, checking } = useAuth();

  // Имя: из аккаунта, а если не вошли — вводится вручную (гость)
  const [guestName, setGuestName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const username = user ? user.email.split("@")[0] : guestName;

  const [room, setRoom] = useState(ROOMS[0]);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [text, setText] = useState("");
  const [privateTo, setPrivateTo] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const roomRef = useRef(room);
  const typingTimer = useRef(null);
  const logRef = useRef(null);

  // Подключение и подписка на события сервера
  useEffect(() => {
    if (!username) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit("join", { username, room: roomRef.current });
    };
    const onDisconnect = () => {
      setConnected(false);
      setUsers([]);
      setTypingUsers([]);
    };
    const onIdentity = (authorId) => setMyId(authorId);
    const onHistory = (history) =>
      setMessages(history.map((m) => ({ ...m, type: "user", id: m._id })));
    const onMessage = (m) =>
      setMessages((prev) => [...prev, { ...m, type: "user", id: m._id }]);
    const onEdited = ({ _id, text: newText, edited }) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === _id ? { ...m, text: newText, edited } : m)),
      );
    const onDeleted = (id) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setEditingId((cur) => (cur === id ? null : cur));
    };
    const onSystem = (m) =>
      setMessages((prev) => [
        ...prev,
        { ...m, type: "system", id: `s-${Date.now()}-${Math.random()}` },
      ]);
    const onPrivate = (m) =>
      setMessages((prev) => [
        ...prev,
        { ...m, type: "private", id: `p-${Date.now()}-${Math.random()}` },
      ]);
    const onUsers = (list) => setUsers(list);
    const onTyping = ({ username: name, isTyping }) =>
      setTypingUsers((prev) =>
        isTyping
          ? prev.includes(name)
            ? prev
            : [...prev, name]
          : prev.filter((n) => n !== name),
      );
    const onError = (msg) => alert(msg);

    socket.on("connect", onConnect);
    socket.on("connect_error", onDisconnect);
    socket.on("disconnect", onDisconnect);
    socket.on("identity", onIdentity);
    socket.on("history", onHistory);
    socket.on("chat message", onMessage);
    socket.on("message edited", onEdited);
    socket.on("message deleted", onDeleted);
    socket.on("system message", onSystem);
    socket.on("private message", onPrivate);
    socket.on("room users", onUsers);
    socket.on("typing", onTyping);
    socket.on("error message", onError);

    // кто мы: токен (если вошли) или секретный id вкладки (гость)
    socket.auth = {
      token: localStorage.getItem("token"),
      clientId: getClientId(),
    };
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onDisconnect);
      socket.off("disconnect", onDisconnect);
      socket.off("identity", onIdentity);
      socket.off("history", onHistory);
      socket.off("chat message", onMessage);
      socket.off("message edited", onEdited);
      socket.off("message deleted", onDeleted);
      socket.off("system message", onSystem);
      socket.off("private message", onPrivate);
      socket.off("room users", onUsers);
      socket.off("typing", onTyping);
      socket.off("error message", onError);
      socket.disconnect();
    };
  }, [username]);

  // Автопрокрутка вниз (только внутри окна чата)
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const changeRoom = (newRoom) => {
    if (newRoom === room) return;
    roomRef.current = newRoom;
    setRoom(newRoom);
    setMessages([]);
    setTypingUsers([]);
    setPrivateTo(null);
    setEditingId(null);
    if (socket.connected) socket.emit("join", { username, room: newRoom });
  };

  const handleGuestLogin = (e) => {
    e.preventDefault();
    if (nameInput.trim()) setGuestName(nameInput.trim());
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    socket.emit("typing", true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing", false), 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !connected) return;

    if (privateTo) {
      socket.emit("private message", { to: privateTo.id, text: body });
    } else {
      socket.emit("chat message", body);
    }

    clearTimeout(typingTimer.current);
    socket.emit("typing", false);
    setText("");
  };

  // ---- редактирование и удаление своих сообщений ----
  const startEdit = (m) => {
    setEditingId(m.id);
    setEditText(m.text);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    const body = editText.trim();
    if (!body) return;

    const current = messages.find((m) => m.id === editingId);
    if (current && current.text !== body) {
      socket.emit("edit message", { id: editingId, text: body });
    }
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Удалить сообщение?")) {
      socket.emit("delete message", id);
    }
  };

  const back = (
    <Link to="/" className="back-link">
      <ArrowLeftIcon /> На главную
    </Link>
  );

  if (checking) return null;

  // Нет имени — просим войти или представиться
  if (!username) {
    return (
      <div className="container">
        {back}
        <div className="page-head">
          <div>
            <h1>Чат</h1>
            <p className="muted">Общение в реальном времени</p>
          </div>
        </div>
        <form className="chat-join" onSubmit={handleGuestLogin}>
          <label className="field">
            <span>Ваше имя в чате</span>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Например, Анна"
              maxLength={30}
              autoFocus
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            Войти в чат
          </button>
          <p className="hint chat-join-hint">
            или{" "}
            <Link to="/login" className="link-inline">
              войдите в аккаунт
            </Link>
            , и имя подставится автоматически
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      {back}
      <div className="page-head">
        <div>
          <h1>Чат</h1>
          <p className="muted">
            Вы в чате как <b>{username}</b>{" "}
            <span className={`chat-status${connected ? " is-online" : ""}`}>
              {connected ? "онлайн" : "нет соединения"}
            </span>
          </p>
        </div>
        {!user && (
          <button className="btn btn-ghost" onClick={() => setGuestName("")}>
            Сменить имя
          </button>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Комнаты">
        {ROOMS.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={room === r}
            className={`tab${room === r ? " is-active" : ""}`}
            onClick={() => changeRoom(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="chat">
        <section className="chat-panel" aria-label={`Комната ${room}`}>
          <div className="chat-log" ref={logRef}>
            {messages.length === 0 && (
              <p className="chat-empty muted">
                Сообщений пока нет — напишите первым
              </p>
            )}
            {messages.map((m) => {
              if (m.type === "system") {
                return (
                  <div key={m.id} className="msg-system">
                    {m.text}
                  </div>
                );
              }
              if (m.type === "private") {
                return (
                  <div key={m.id} className="msg msg-private">
                    <div className="msg-meta">
                      🔒 личное · {m.from} → {m.to} · {time(m.createdAt)}
                    </div>
                    {m.text}
                  </div>
                );
              }

              const own = Boolean(myId) && m.authorId === myId;
              const editing = editingId === m.id;

              return (
                <div key={m.id} className={`msg${own ? " is-own" : ""}`}>
                  <div className="msg-meta">
                    {m.author} · {time(m.createdAt)}
                    {m.edited && " · изменено"}
                  </div>

                  {editing ? (
                    <form className="msg-edit" onSubmit={saveEdit}>
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                        maxLength={1000}
                        aria-label="Изменить сообщение"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="icon-btn"
                        title="Сохранить"
                        aria-label="Сохранить"
                      >
                        <CheckIcon width={18} height={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditingId(null)}
                        title="Отмена"
                        aria-label="Отмена"
                      >
                        <CloseIcon width={18} height={18} />
                      </button>
                    </form>
                  ) : (
                    m.text
                  )}

                  {own && !editing && (
                    <div className="msg-actions">
                      <button
                        className="icon-btn"
                        onClick={() => startEdit(m)}
                        title="Изменить"
                        aria-label="Изменить сообщение"
                      >
                        <EditIcon width={16} height={16} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleDelete(m.id)}
                        title="Удалить"
                        aria-label="Удалить сообщение"
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="chat-typing" aria-live="polite">
            {typingUsers.length > 0 && `${typingUsers.join(", ")} печатает…`}
          </div>

          {privateTo && (
            <div className="chat-private-bar">
              <span>
                Личное сообщение для <b>{privateTo.username}</b>
              </span>
              <button
                type="button"
                className="link"
                onClick={() => setPrivateTo(null)}
              >
                отмена
              </button>
            </div>
          )}

          <form className="chat-form" onSubmit={handleSend}>
            <input
              value={text}
              onChange={handleTextChange}
              placeholder={privateTo ? "Личное сообщение…" : "Сообщение…"}
              maxLength={1000}
              aria-label="Сообщение"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!connected || !text.trim()}
            >
              Отправить
            </button>
          </form>
        </section>

        <aside className="chat-side">
          <h3>В комнате · {users.length}</h3>
          <ul className="chat-users">
            {users.map((u) => (
              <li key={u.id}>
                <span className="avatar" aria-hidden="true">
                  {u.username[0].toUpperCase()}
                </span>
                <span className="chat-user-name">
                  {u.username}
                  {u.id === socket.id && " (вы)"}
                </span>
                {u.id !== socket.id && (
                  <button
                    className="link"
                    onClick={() => setPrivateTo(u)}
                    title="Написать лично"
                  >
                    ЛС
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default Chat;

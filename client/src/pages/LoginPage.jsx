import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../api";
import { LogoIcon } from "../components/icons";

// Три «отпечатка» для левой панели — собраны на CSS, без внешних картинок
const PRINTS = [
  { cls: "print-1", filter: "vintage", label: "Винтаж", css: "sepia(0.35) contrast(1.1) saturate(0.8)" },
  { cls: "print-2", filter: "grayscale", label: "Чёрно-белый", css: "grayscale(1)" },
  { cls: "print-3", filter: "warm", label: "Тёплый", css: "sepia(0.25) saturate(1.4) hue-rotate(-12deg)" },
];

function LoginPage() {
  const { user, checking, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!checking && user) return <Navigate to="/" replace />;

  const isLogin = mode === "login";

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, role);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <div className="brand brand-on-dark">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          Кадр
        </div>

        <div className="prints" aria-hidden="true">
          {PRINTS.map((p) => (
            <figure key={p.cls} className={`print ${p.cls}`}>
              <div className="print-img" style={{ filter: p.css }} />
              <figcaption>{p.label}</figcaption>
            </figure>
          ))}
        </div>

        <div className="auth-copy">
          <h2>Фото, фильтры и альбомы в одном месте</h2>
          <p>Загружайте снимки, подбирайте фильтр и раскладывайте по альбомам.</p>
        </div>
      </aside>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="brand auth-brand-mobile">
            <span className="brand-mark">
              <LogoIcon />
            </span>
            Кадр
          </div>

          <h1>{isLogin ? "С возвращением" : "Создайте аккаунт"}</h1>
          <p className="muted">
            {isLogin
              ? "Войдите, чтобы управлять своими фотографиями."
              : "Это займёт меньше минуты."}
          </p>

          <div className="segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={isLogin ? "is-active" : ""}
              onClick={() => switchMode("login")}
            >
              Вход
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={!isLogin ? "is-active" : ""}
              onClick={() => switchMode("register")}
            >
              Регистрация
            </button>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "Ваш пароль" : "Не менее 6 символов"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 6}
              required
            />
          </label>

          {!isLogin && (
            <label className="field">
              <span>Роль</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </select>
              <small className="hint">
                Удалять фотографии может только администратор.
              </small>
            </label>
          )}

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Подождите…" : isLogin ? "Войти" : "Создать аккаунт"}
          </button>

          <p className="auth-switch">
            {isLogin ? "Ещё нет аккаунта?" : "Уже зарегистрированы?"}{" "}
            <button
              type="button"
              className="link"
              onClick={() => switchMode(isLogin ? "register" : "login")}
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;

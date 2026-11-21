import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { LogoIcon, LogoutIcon } from "./icons";

function Header() {
  const { user, checking, signOut } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          Кадр
        </Link>

        <div className="header-user">
          <Link to="/chat" className="btn btn-ghost header-link">
            Чат
          </Link>
          {checking ? null : user ? (
            <>
              <span className="avatar" aria-hidden="true">
                {user.email[0].toUpperCase()}
              </span>
              <span className="user-email">{user.email}</span>
              <span className={`role role-${user.role}`}>{user.role}</span>
              <button
                className="icon-btn"
                onClick={signOut}
                title="Выйти"
                aria-label="Выйти"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

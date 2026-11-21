import { createContext, useState, useEffect } from "react";
import { login, register, getProfile } from "../api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(
    () => !!localStorage.getItem("token"),
  );

  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    getProfile()
      .then((res) => setUser(res.data))
      .catch((err) => {
        if (err.response?.status === 401) localStorage.removeItem("token");
      })
      .finally(() => setChecking(false));
  }, []);

  const signIn = async (email, password) => {
    const res = await login(email, password);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  const signUp = async (email, password, role) => {
    await register(email, password, role);
    await signIn(email, password);
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

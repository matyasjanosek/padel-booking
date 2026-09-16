import { createContext, useContext, useEffect, useState } from "react";
import {
  register as registerRequest,
  login as loginRequest,
  logout as logoutRequest,
  fetchMe,
} from "../api/auth.js";

// The default value applies when a component reads this outside <AuthProvider>,
// so a missing provider fails quiet instead of crashing on a null context.
const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const loggedInUser = await loginRequest(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(details) {
    const newUser = await registerRequest(details);
    setUser(newUser);
    return newUser;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log("AuthContext: Checking session...");
      const res = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          meta: "userinfo",
          uiprop: "groups|rights|editcount|registration|email|realname",
          format: "json",
        },
        withCredentials: true,
        validateStatus: () => true,
      });
      const status = res.status;
      const info = res.data?.query?.userinfo;
      if (status >= 200 && status < 300 && info && info.id !== 0) {
        setUser(info);
        console.log("AuthContext: User logged in as:", info.name);
      } else {
        setUser(null);
        if (res.data?.error) {
          console.warn(
            "AuthContext: Session check non-OK:",
            status,
            res.data?.error,
          );
        } else {
          console.log("AuthContext: User not logged in or request blocked");
        }
      }
    } catch (e) {
      console.warn("AuthContext: Session check network error:", e.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const loginRes = await axios.post(
        "/api/bot/login",
        { username, password },
        { validateStatus: () => true },
      );

      if (loginRes.status === 200 && loginRes.data?.status === "success") {
        await checkSession();
        return true;
      } else {
        const msg =
          loginRes.data?.error ||
          loginRes.data?.details ||
          `Login failed (status ${loginRes.status})`;
        throw new Error(msg);
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(
        error.message ||
          "Unable to continue login. Your session most likely timed out.",
      );
    }
  };

  const logout = async () => {
    try {
      await axios.get("/api/justapedia", {
        params: { action: "logout", format: "json" },
        withCredentials: true,
      });
      setUser(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, checkSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

const Ctx = createContext(null);

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.get("/profile"),
        api.get("/dashboard/summary"),
      ]);
      setProfile(p.data);
      setSummary(s.data);
    } catch (e) {
      console.error("profile refresh failed", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  return <Ctx.Provider value={{ profile, summary, refresh }}>{children}</Ctx.Provider>;
};

export const useProfile = () => useContext(Ctx);

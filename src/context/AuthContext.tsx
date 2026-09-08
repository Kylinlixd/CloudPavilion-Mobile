import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loginAccount, logoutAccount, registerAccount } from "../lib/auth";
import { setSessionInvalidationHandler } from "../lib/api";
import { clearSession, getSession } from "../lib/storage";

type AuthValue = {
  isAuthenticated: boolean;
  hydrating: boolean;
  hydrationError: string | null;
  retryHydration: () => void;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<{
    access: string | null;
    refresh: string | null;
  }>({ access: null, refresh: null });
  const [hydrating, setHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const restore = useCallback(async () => {
    setHydrating(true);
    setHydrationError(null);
    try {
      const saved = await getSession();
      setSessionState({ access: saved.access, refresh: saved.refresh });
    } catch {
      setHydrationError("无法读取登录信息，请重试。");
    } finally {
      setHydrating(false);
    }
  }, []);
  useEffect(() => {
    setSessionInvalidationHandler(() =>
      setSessionState({ access: null, refresh: null }),
    );
    void restore();
    return () => setSessionInvalidationHandler(undefined);
  }, [restore]);
  const login = useCallback(async (username: string, password: string) => {
    const access = await loginAccount(username, password);
    setSessionState({ access, refresh: null });
  }, []);
  const register = useCallback(
    async (username: string, password: string, passwordConfirm: string) => {
      const access = await registerAccount(username, password, passwordConfirm);
      setSessionState({ access, refresh: null });
    },
    [],
  );
  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      await clearSession();
      setSessionState({ access: null, refresh: null });
    }
  }, []);
  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session.access || session.refresh),
      hydrating,
      hydrationError,
      retryHydration: () => {
        void restore();
      },
      login,
      register,
      logout,
    }),
    [session, hydrating, hydrationError, restore, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

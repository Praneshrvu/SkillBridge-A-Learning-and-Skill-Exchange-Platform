import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

const DEMO_USERS = {
  alice:       { email: 'alice@skillbridge.dev',             password: 'pass123' },
  bob:         { email: 'bob@skillbridge.dev',               password: 'pass123' },
  confidential:{ email: 'anonymous_guru@skillbridge.dev',    password: 'pass123' },
  maya:        { email: 'maya.learner@skillbridge.dev',      password: 'pass123' },
  sarah:       { email: 'sarah.google@skillbridge.dev',      password: 'pass123' },
  rahul:       { email: 'rahul.amazon@skillbridge.dev',      password: 'pass123' },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('skillbridge_token'));
  const [loading, setLoading] = useState(true);

  const saveToken = (t) => {
    setToken(t);
    if (t) localStorage.setItem('skillbridge_token', t);
    else localStorage.removeItem('skillbridge_token');
  };

  const fetchMe = useCallback(async () => {
    try {
      const user = await authApi.me();
      setCurrentUser(user);
      return user;
    } catch {
      saveToken(null);
      setCurrentUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    saveToken(data.access_token);
    const user = await authApi.me();
    setCurrentUser(user);
    return user;
  }, []);

  const switchDemoPersona = useCallback(async (key) => {
    const demo = DEMO_USERS[key];
    if (!demo) return;
    return login(demo.email, demo.password);
  }, [login]);

  const logout = useCallback(() => {
    saveToken(null);
    setCurrentUser(null);
  }, []);

  // On mount: validate stored token or fall back to demo "alice"
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (token) {
        const user = await fetchMe();
        if (!user) await switchDemoPersona('alice');
      } else {
        await switchDemoPersona('alice');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout, fetchMe, switchDemoPersona, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { DEMO_USERS };

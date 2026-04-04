import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const data = await api.verify(token);
      if (data.user) {
        setUser(data.user);
        setProfile(data.user);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.user);
      return { success: true };
    }
    return { success: false, error: data.message };
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.user);
      return { success: true };
    }
    return { success: false, error: data.message };
  };

  const logout = async () => {
    if (user?.user_id) {
      await api.logout(user.user_id, token);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
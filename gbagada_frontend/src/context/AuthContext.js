import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup axios interceptors: one to attach the token to every outgoing
  // request, and one to catch an expired/invalid token on ANY response.
  // Most pages call axios directly (not through authenticatedRequest
  // below), so this response interceptor is the only place that catches
  // a 401 app-wide instead of failing silently on each page.
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // A failed login attempt (wrong password) also returns 401 —
        // that's a normal, expected response, not an expired session.
        // Never wipe the token or redirect for that case.
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        const isAlreadyOnLoginPage = window.location.pathname === '/login';

        if (error.response?.status === 401 && !isLoginRequest && !isAlreadyOnLoginPage) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          window.location.href = '/login?expired=1';
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const fetchUser = async (authToken) => {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axios.post(`${API_URL}/auth/login`, formData.toString(), {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      const userData = await fetchUser(access_token);
      
      if (userData) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to fetch user data' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed. Please check your credentials.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Helper to make authenticated requests
  const authenticatedRequest = async (method, url, data = null) => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      throw new Error('No token available');
    }
    
    try {
      const config = {
        headers: { Authorization: `Bearer ${currentToken}` }
      };
      
      let response;
      if (method === 'get') {
        response = await axios.get(`${API_URL}${url}`, config);
      } else if (method === 'post') {
        response = await axios.post(`${API_URL}${url}`, data, config);
      } else if (method === 'put') {
        response = await axios.put(`${API_URL}${url}`, data, config);
      } else if (method === 'delete') {
        response = await axios.delete(`${API_URL}${url}`, config);
      }
      
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    setUser,
    fetchUser,
    authenticatedRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
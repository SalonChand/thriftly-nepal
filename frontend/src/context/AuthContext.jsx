import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in when page loads
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            console.log("Error parsing user data", e);
        }
    }
    setLoading(false);
  }, []);

  const login = (response) => {
    // ⚠️ CRITICAL FIX: 
    // The backend sends { Status: "Success", user: { role: 'admin'... }, token: '...' }
    // We must ensure we are saving just the 'user' object, OR handling the structure consistently.
    
    let userData;
    
    // Check if the data is wrapped inside a 'user' property (New Backend style)
    if (response.user) {
        userData = response.user;
    } else {
        // Fallback for Old Backend style
        userData = response;
    }

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    if (response.token) {
        localStorage.setItem('token', response.token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
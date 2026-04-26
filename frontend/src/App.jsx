import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Room from './pages/Room';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Room />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
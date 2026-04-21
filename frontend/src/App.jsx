import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { fixAutofillColors, forceAutofillTextColor } from './utils/autofillFix';
import Room from './pages/Room';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

function App() {
  useEffect(() => {
    // Применяем фикс автозаполнения
    fixAutofillColors();
    
    // Проверяем каждые 300ms на наличие автозаполненных полей
    const interval = setInterval(() => {
      forceAutofillTextColor();
    }, 300);
    
    // Наблюдатель за изменением темы
    const observer = new MutationObserver(() => {
      forceAutofillTextColor();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Запускаем сразу при загрузке
    setTimeout(() => {
      forceAutofillTextColor();
    }, 100);
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

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
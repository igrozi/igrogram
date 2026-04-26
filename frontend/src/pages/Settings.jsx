import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Save, User, Bell, ShieldCheck, Mail, Lock, 
  Camera, Eye, EyeOff, Zap, LogOut, Sun, Moon, CheckCircle, 
  Loader2, Activity, Shield, Key, Phone, LockKeyhole, Pencil, 
  X, Fingerprint, Cpu, Layers, Globe, ArrowLeft, Trash2, AlertTriangle
} from 'lucide-react';

const heartBeat = { scale: [1, 1.2, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } };

const formatPhoneNumber = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 1) return '+7 ';
  let result = '+7 ';
  if (numbers.length > 1) result += '(' + numbers.substring(1, 4);
  if (numbers.length >= 5) result += ') ' + numbers.substring(4, 7);
  if (numbers.length >= 8) result += '-' + numbers.substring(7, 9);
  if (numbers.length >= 10) result += '-' + numbers.substring(9, 11);
  return result;
};

const SectionHeader = ({ icon: Icon, text, animate = heartBeat }) => (
  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10 relative z-10">
    <motion.div animate={animate} className="bg-indigo-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.5)]">
      <Icon size={20} className="md:size-6 text-white fill-current" />
    </motion.div>
    <div className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">
        <span>{text}</span>
    </div>
  </div>
);

// Модальное окно удаления аккаунта (без изменений)
const DeleteAccountModal = ({ show, onClose, onConfirm, loading, error, darkMode }) => {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => { if (error) setLocalError(error); }, [error]);
  useEffect(() => { if (!show) { setPassword(''); setShowPass(false); setLocalError(''); } }, [show]);

  const handleConfirm = () => {
    if (!password) { setLocalError('Введите пароль'); return; }
    onConfirm(password);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 20 }} className="w-full max-w-md bg-white dark:bg-slate-900 border-4 border-red-500/30 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="absolute -top-10 -right-10 opacity-[0.05] pointer-events-none"><AlertTriangle size={200} className="text-red-500" /></div>
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="p-3 bg-red-500/10 rounded-2xl border-2 border-red-500/30"><Trash2 size={24} className="text-red-500" /></motion.div>
            <div><h3 className="text-lg md:text-xl font-black uppercase tracking-wider dark:text-white">Удаление аккаунта</h3><p className="text-[9px] md:text-[10px] font-bold text-red-500 uppercase tracking-wider">Необратимое действие</p></div>
          </div>
          <div className="p-3 md:p-4 bg-red-500/5 rounded-2xl border-2 border-red-500/20 mb-6 relative z-10"><p className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase leading-relaxed"><span className="text-red-500">⚠ ВНИМАНИЕ:</span> Все ваши данные, посты, сообщения и файлы будут безвозвратно удалены.</p></div>
          <div className="relative z-10 mb-4">
            <label className="text-[9px] md:text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Введите пароль для подтверждения</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setLocalError(''); }} placeholder="••••••••" className={`w-full bg-gray-100 dark:bg-slate-800 border-2 p-4 pl-12 pr-12 rounded-xl font-bold text-base dark:text-white outline-none transition-all ${localError ? 'border-red-500' : 'border-gray-200 dark:border-slate-700 focus:border-red-500'}`} onKeyPress={(e) => { if (e.key === 'Enter') handleConfirm(); }} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
            </div>
            {localError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[10px] font-bold uppercase mt-2 ml-4">{localError}</motion.p>}
          </div>
          <div className="flex gap-3 relative z-10">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">ОТМЕНА</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConfirm} disabled={loading} className="flex-1 py-3 md:py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-xs md:text-sm hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /><span>УДАЛИТЬ</span></>}</motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile: userProfile, loading: authLoading, token, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [activeNotification, setActiveNotification] = useState(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [profile, setProfile] = useState({
    name: '',
    avatar_url: '',
    username: '',
    notifications: true,
    phone: '',
    bio: ''
  });

  const [secureData, setSecureData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '',
    newEmail: ''
  });

  // ===== JavaScript-фикс автозаполнения (аналогично Auth.jsx) =====
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `input:-webkit-autofill { transition: background-color 999999s ease-in-out 0s !important; }`;
    document.head.appendChild(style);

    const forceCorrectColors = () => {
      document.querySelectorAll('input, textarea').forEach(el => {
        if (el.matches(':-webkit-autofill')) {
          const isDark = document.documentElement.classList.contains('dark');
          el.style.webkitTextFillColor = isDark ? '#ffffff' : '#111827';
          el.style.color = isDark ? '#ffffff' : '#111827';
          el.style.caretColor = isDark ? '#ffffff' : '#111827';
          el.style.boxShadow = isDark ? '0 0 0 1000px #1e293b inset' : '0 0 0 1000px #f3f4f6 inset';
        }
      });
    };

    forceCorrectColors();
    const animationHandler = () => forceCorrectColors();
    document.addEventListener('animationstart', animationHandler, true);
    const interval = setInterval(forceCorrectColors, 500);

    return () => {
      document.removeEventListener('animationstart', animationHandler, true);
      clearInterval(interval);
      style.remove();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    darkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const profileData = await api.getProfile(user.username, token);
        setSecureData(prev => ({ ...prev, email: profileData.email || user.email }));
        setProfile({
          name: profileData.name || '',
          username: profileData.username,
          avatar_url: profileData.avatar_url,
          notifications: profileData.notifications ?? true,
          phone: profileData.phone ? formatPhoneNumber(profileData.phone) : '',
          bio: profileData.bio || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        navigate('/auth');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, navigate, token]);

  const handleLogOut = async () => { await logout(); navigate('/auth'); };

  const handleDeleteAccount = async (password) => {
    setDeleteLoading(true); setDeleteError('');
    try {
      const response = await api.verifyPassword(user.user_id, password, token);
      if (response.valid) {
        await api.deleteAccount(user.user_id, token);
        setShowDeleteModal(false);
        setActiveNotification({ type: 'success', message: 'АККАУНТ УДАЛЁН' });
        setTimeout(async () => { await logout(); navigate('/auth'); }, 2000);
      } else {
        setDeleteError('Неверный пароль');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'Ошибка удаления');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setAvatarLoading(true);
    try {
      const uploadResult = await api.uploadFile(file, 'avatar', token);
      const avatarUrl = uploadResult.url;
      await api.updateProfile({ userId: user.user_id, avatar_url: avatarUrl }, token);
      setProfile(prev => ({ ...prev, avatar_url: `${avatarUrl}?t=${Date.now()}` }));
      setActiveNotification({ type: 'success', message: 'AVATAR UPDATED' });
    } catch (error) {
      console.error('Error updating avatar:', error);
      setActiveNotification({ type: 'error', message: 'UPLOAD FAILED' });
    } finally {
      setAvatarLoading(false);
      setTimeout(() => setActiveNotification(null), 3000);
    }
  };

  // ===== ИСПРАВЛЕННОЕ СОХРАНЕНИЕ (email + смена пароля) =====
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (secureData.newPassword && secureData.newPassword !== secureData.confirmPassword) {
      setPasswordError('Пароли не совпадают');
      setActiveNotification({ type: 'error', message: 'PASSWORDS DO NOT MATCH' });
      setTimeout(() => setActiveNotification(null), 3000);
      return;
    }
    if (secureData.newPassword && !secureData.currentPassword) {
      setPasswordError('Введите текущий пароль для смены пароля');
      return;
    }

    setPasswordError('');
    setLoading(true);

    try {
      // 1. Обновление профиля (email тоже здесь)
      const profilePayload = {
        userId: user.user_id,
        name: profile.name,
        bio: profile.bio,
        phone: profile.phone.replace(/\D/g, ''),
        notifications: profile.notifications,
      };
      if (editingEmail && secureData.newEmail && secureData.newEmail !== secureData.email) {
        profilePayload.email = secureData.newEmail;
      }
      await api.updateProfile(profilePayload, token);

      // 2. Смена пароля (отдельный запрос)
      if (secureData.newPassword) {
        await api.changePassword({
          userId: user.user_id,
          currentPassword: secureData.currentPassword,
          newPassword: secureData.newPassword
        }, token);
      }

      setActiveNotification({ type: 'success', message: 'CHANGES APPLIED' });

      if (editingEmail && secureData.newEmail) {
        setSecureData(prev => ({ ...prev, email: secureData.newEmail }));
        setEditingEmail(false);
      }
      setSecureData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      setActiveNotification({ type: 'error', message: error.message?.toUpperCase() || 'UPDATE FAILED' });
    } finally {
      setLoading(false);
      setTimeout(() => setActiveNotification(null), 3000);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-[#020617]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!user) return null;

  // ==================== МОБИЛЬНАЯ ВЕРСИЯ ====================
  if (isMobile) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'} pb-20`}>
        <DeleteAccountModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} loading={deleteLoading} error={deleteError} darkMode={darkMode} />
        <style>{`@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .animated-bg { position: fixed; inset: 0; z-index: 0; background: ${darkMode ? 'linear-gradient(-45deg, #020617, #1e1b4b, #0f172a, #020617)' : 'linear-gradient(-45deg, #f3f4f6, #e5e7eb, #d1d5db, #f3f4f6)'}; background-size: 400% 400%; animation: gradientShift 15s ease infinite; opacity: 0.8; }`}</style>
        <div className="animated-bg" />

        <AnimatePresence>
          {activeNotification && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
              <div className={`backdrop-blur-xl border-4 rounded-3xl p-3 shadow-2xl flex items-center gap-3 max-w-sm w-full bg-white/90 dark:bg-slate-900/90 ${activeNotification.type === 'success' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                {activeNotification.type === 'success' ? <CheckCircle size={16} /> : <Shield size={16} />}
                <p className="text-xs font-bold uppercase tracking-widest">{activeNotification.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl">
              <ArrowLeft size={20} className="dark:text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Zap size={18} className="text-white" />
              </div>
              <span className="text-lg font-black uppercase tracking-wider dark:text-white">НАСТРОЙКИ</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 py-4 space-y-4">
          {/* Профиль */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-[2rem] p-6 text-center">
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
            <motion.div whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="relative w-24 h-24 mx-auto mb-4 cursor-pointer">
              <div className="w-full h-full rounded-[1.5rem] border-4 border-indigo-600 p-1 overflow-hidden bg-gray-200 dark:bg-slate-800">
                {avatarLoading ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-white" size={24} /></div>
                ) : (
                  <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=4f46e5&color=fff&size=512`} className="w-full h-full object-cover rounded-[1.25rem]" alt="Avatar" />
                )}
              </div>
            </motion.div>
            <h2 className="text-xl font-black dark:text-white">{profile.name || 'User'}</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs tracking-widest">@{profile.username}</p>
          </div>

          {/* Тема */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-indigo-600" /> : <Sun size={18} className="text-indigo-600" />}
              <span className="text-sm font-black uppercase dark:text-white">{darkMode ? 'НОЧЬ' : 'ДЕНЬ'}</span>
            </div>
            <div onClick={() => setDarkMode(!darkMode)} className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <motion.div layout className="bg-white w-5 h-5 rounded-full shadow-lg" animate={{ x: darkMode ? 20 : 0 }} />
            </div>
          </div>

          {/* Уведомления */}
          <div onClick={() => setProfile({...profile, notifications: !profile.notifications})} className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer ${profile.notifications ? 'border-indigo-600 bg-indigo-600/5' : 'border-gray-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${profile.notifications ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}>
                <Bell size={16} />
              </div>
              <span className="text-sm font-black uppercase dark:text-white">УВЕДОМЛЕНИЯ</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 ${profile.notifications ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <motion.div animate={{ x: profile.notifications ? 16 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-lg" />
            </div>
          </div>

          {/* Личные данные */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-indigo-600" />
              <span className="text-sm font-black uppercase dark:text-white">ЛИЧНЫЕ ДАННЫЕ</span>
            </div>
            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="Имя" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm text-gray-900 dark:text-white placeholder:text-gray-500" />
            <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: formatPhoneNumber(e.target.value)})} placeholder="+7 (___) ___-__" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm text-gray-900 dark:text-white placeholder:text-gray-500" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-gray-500">ПОЧТА</span>
                <button type="button" onClick={() => { setEditingEmail(!editingEmail); if(!editingEmail) setSecureData({...secureData, newEmail: secureData.email}); }} className={`text-xs font-black uppercase ${editingEmail ? 'text-red-500' : 'text-indigo-600'}`}>{editingEmail ? 'CANCEL' : 'EDIT'}</button>
              </div>
              <input type="email" value={editingEmail ? secureData.newEmail : secureData.email} onChange={e => setSecureData({...secureData, newEmail: e.target.value})} readOnly={!editingEmail} className={`w-full p-3 rounded-xl font-bold text-sm border ${editingEmail ? 'bg-white dark:bg-slate-800 border-indigo-600 text-gray-900 dark:text-white' : 'bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400'}`} />
            </div>
          </div>

          {/* Безопасность */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-indigo-600" />
              <span className="text-sm font-black uppercase dark:text-white">БЕЗОПАСНОСТЬ</span>
            </div>

            {/* Текущий пароль (новый) */}
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={secureData.currentPassword} onChange={e => setSecureData({...secureData, currentPassword: e.target.value})} placeholder="Текущий пароль" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm text-gray-900 dark:text-white placeholder:text-gray-500" />
            </div>

            {/* Новый пароль */}
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={secureData.newPassword} onChange={e => setSecureData({...secureData, newPassword: e.target.value})} placeholder="Новый пароль" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 pr-12 rounded-xl font-bold text-sm text-gray-900 dark:text-white placeholder:text-gray-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            {secureData.newPassword && (
              <div>
                <input type={showPass ? "text" : "password"} value={secureData.confirmPassword} onChange={e => setSecureData({...secureData, confirmPassword: e.target.value})} placeholder="Подтвердите пароль" className={`w-full bg-gray-100 dark:bg-slate-800 border p-3 rounded-xl font-bold text-sm text-gray-900 dark:text-white ${passwordError ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'}`} />
                {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
              </div>
            )}
          </div>

          {/* Инфо */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2"><Activity size={18} className="text-indigo-600" /><span className="text-sm font-black uppercase dark:text-white">ИНФОРМАЦИЯ</span></div>
            <div className="flex items-center gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/20"><ShieldCheck className="text-green-500" size={16} /><div><p className="font-black text-xs uppercase dark:text-white">Active Node</p><p className="text-[10px] text-green-600 font-bold uppercase">Nominal</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20"><Fingerprint className="text-amber-500" size={16} /><div><p className="font-black text-xs uppercase dark:text-white">Secure ID</p><p className="text-[10px] text-amber-600 font-bold uppercase">Protected</p></div></div>
          </div>

          {/* Кнопки */}
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleUpdate} disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/><span>СОХРАНИТЬ</span></>}
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setShowDeleteModal(true)} className="w-full p-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <Trash2 size={16} /><span>УДАЛИТЬ АККАУНТ</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} onClick={handleLogOut} className="w-full p-4 rounded-2xl border-2 border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <LogOut size={16} /> <span>ВЫЙТИ</span>
          </motion.button>

          <div className="p-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-2 text-indigo-600"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase">Privacy Protocol</span></div>
            <p className="text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">Your data is strictly encrypted using military-grade standards.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ДЕСКТОПНАЯ ВЕРСИЯ ====================
  return (
    <div className={`flex h-screen overflow-hidden relative transition-colors duration-500 ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'}`}>
      <DeleteAccountModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} loading={deleteLoading} error={deleteError} darkMode={darkMode} />
      <style>{`@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .animated-bg { position: absolute; inset: 0; z-index: 0; background: ${darkMode ? 'linear-gradient(-45deg, #020617, #1e1b4b, #0f172a, #020617)' : 'linear-gradient(-45deg, #f3f4f6, #e5e7eb, #d1d5db, #f3f4f6)'}; background-size: 400% 400%; animation: gradientShift 15s ease infinite; opacity: 0.8; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <div className="animated-bg" />

      <AnimatePresence>
        {activeNotification && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0 }} className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
            <div className={`backdrop-blur-xl border-4 rounded-[2rem] p-4 shadow-2xl flex items-center gap-4 max-w-sm w-full mx-4 bg-white/90 dark:bg-slate-900/90 ${activeNotification.type === 'success' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
              {activeNotification.type === 'success' ? <CheckCircle size={18} /> : <Shield size={18} />}
              <p className="text-sm font-bold uppercase tracking-widest">{activeNotification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-96 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r-4 border-gray-300 dark:border-slate-800 flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b-4 border-gray-300 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"><Layers size={200} /></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <button onClick={() => navigate(-1)} className="p-3 bg-white/80 dark:bg-slate-900/50 border-2 border-gray-300 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all shadow-lg hover:scale-105 cursor-pointer backdrop-blur-sm">
              <ChevronLeft className="dark:text-white text-gray-600" size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20"><Zap size={20} className="text-white" /></div>
              <span className="text-xl font-black uppercase tracking-wider dark:text-white">НАСТРОЙКИ</span>
            </div>
          </div>

          <div className="text-center relative z-10">
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="relative w-40 h-40 mx-auto mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[2.5rem] border-[6px] border-indigo-600 p-1.5 shadow-2xl overflow-hidden relative bg-gray-200 dark:bg-slate-800">
                {avatarLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/20"><Loader2 className="animate-spin text-white" size={40} /></div>
                ) : (
                  <img key={profile.avatar_url} src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=4f46e5&color=fff&size=512`} className="w-full h-full object-cover rounded-[2rem]" alt="Avatar" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=4f46e5&color=fff&size=512`; }} />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[2rem]">
                  <motion.div animate={heartBeat}><Camera className="text-white" size={28} /></motion.div>
                </div>
              </div>
            </motion.div>
            <h2 className="text-3xl font-black tracking-tighter truncate dark:text-white">{profile.name || 'User'}</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs tracking-widest mt-1">@{profile.username}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 flex flex-col no-scrollbar relative">
          {/* Тема */}
          <div className="bg-gray-100 dark:bg-slate-800 p-5 rounded-[2rem] border-2 border-gray-200 dark:border-slate-700 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><Sun size={60} /></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="text-indigo-600 dark:text-indigo-400">{darkMode ? <Moon size={18} /> : <Sun size={18} />}</div>
              <span className="text-sm font-black uppercase tracking-widest dark:text-white">{darkMode ? 'НОЧЬ' : 'ДЕНЬ'}</span>
            </div>
            <div onClick={() => setDarkMode(!darkMode)} className={`relative z-10 w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <motion.div layout className="bg-white w-5 h-5 rounded-full shadow-lg" animate={{ x: darkMode ? 20 : 0 }} />
            </div>
          </div>

          {/* Уведомления */}
          <div onClick={() => setProfile({...profile, notifications: !profile.notifications})} className={`cursor-pointer p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all relative overflow-hidden ${profile.notifications ? 'border-indigo-600 bg-indigo-600/5' : 'border-gray-200 dark:border-slate-800'}`}>
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><Bell size={60} /></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className={`p-2.5 rounded-xl ${profile.notifications ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}><Bell size={18} /></div>
              <span className="text-sm font-black uppercase tracking-widest dark:text-white">УВЕДОМЛЕНИЯ</span>
            </div>
            <div className={`w-11 h-6 rounded-full p-1 transition-colors relative z-10 ${profile.notifications ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}>
              <motion.div animate={{ x: profile.notifications ? 18 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-lg" />
            </div>
          </div>

          {/* Удалить аккаунт */}
          <motion.div whileHover={{ scale: 1.01 }} className="p-5 bg-red-500/5 rounded-[2rem] border-2 border-red-500/20 relative overflow-hidden group hover:border-red-500/40 transition-all cursor-pointer" onClick={() => setShowDeleteModal(true)}>
            <div className="absolute -right-4 -bottom-4 opacity-[0.05] pointer-events-none"><Trash2 size={60} className="text-red-500" /></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/30"><Trash2 size={18} className="text-red-500" /></div>
              <div>
                <span className="text-sm font-black uppercase tracking-widest text-red-500 dark:text-red-400">УДАЛИТЬ АККАУНТ</span>
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Необратимое действие</p>
              </div>
            </div>
          </motion.div>

          {/* Выход */}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleLogOut} className="w-full p-4 text-red-500 bg-transparent border-2 border-red-500/20 rounded-[2rem] font-black uppercase tracking-widest shadow-lg hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-center gap-3 cursor-pointer text-sm">
            <LogOut size={18} /> ВЫЙТИ
          </motion.button>

          {/* Privacy */}
          <div className="mt-auto p-5 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-[2rem] bg-white/50 dark:bg-slate-900/50 relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none"><Globe size={60} /></div>
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 relative z-10"><LockKeyhole size={16} /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Privacy Protocol</span></div>
            <p className="text-[10px] font-bold leading-relaxed text-gray-600 dark:text-gray-300 uppercase relative z-10">Your data is strictly encrypted using military-grade standards.</p>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto p-12 relative z-10 no-scrollbar">
        <form onSubmit={handleUpdate} className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {/* Личные данные */}
              <motion.section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-4 border-gray-300 dark:border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"><Cpu size={180} /></div>
                <SectionHeader icon={User} text="ЛИЧНЫЕ ДАННЫЕ" animate={heartBeat} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-6 mb-3">ОТОБРАЖАЕМОЕ ИМЯ</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                      <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-100 dark:bg-slate-800 border-4 border-gray-200 dark:border-slate-700 p-6 pl-16 rounded-[2rem] font-bold text-lg text-gray-900 dark:text-white focus:border-indigo-600 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-6 mb-3">ТЕЛЕФОН</label>
                    <div className="relative">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                      <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: formatPhoneNumber(e.target.value)})} placeholder="+7 (___) ___-__" className="w-full bg-gray-100 dark:bg-slate-800 border-4 border-gray-200 dark:border-slate-700 p-6 pl-16 rounded-[2rem] font-bold text-lg text-gray-900 dark:text-white focus:border-indigo-600 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between ml-6 mb-3">
                      <label className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">ПОЧТА</label>
                      <button type="button" onClick={() => { setEditingEmail(!editingEmail); if(!editingEmail) setSecureData({...secureData, newEmail: secureData.email}); }} className={`text-xs font-black uppercase flex items-center gap-2 cursor-pointer ${editingEmail ? 'text-red-500' : 'text-indigo-600'}`}>{editingEmail ? <><X size={12}/> CANCEL</> : <><Pencil size={12}/> EDIT</>}</button>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                      <input type="email" value={editingEmail ? secureData.newEmail : secureData.email} onChange={e => setSecureData({...secureData, newEmail: e.target.value})} readOnly={!editingEmail} className={`w-full p-6 pl-16 rounded-[2rem] font-bold text-lg border-4 transition-all ${editingEmail ? 'bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600 shadow-xl' : 'bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-500'}`} />
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Безопасность + Пароль */}
              <motion.section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-4 border-gray-300 dark:border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"><Shield size={180} /></div>
                <SectionHeader icon={Shield} text="БЕЗОПАСНОСТЬ" />
                
                <div className="flex flex-col relative z-10">
                  {/* Текущий пароль */}
                  <div className="mb-4">
                    <label className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-6 mb-3 block">ТЕКУЩИЙ ПАРОЛЬ</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24}/>
                      <input type={showPass ? "text" : "password"} value={secureData.currentPassword} onChange={e => setSecureData({...secureData, currentPassword: e.target.value})} placeholder="••••••••" className="w-full bg-gray-100 dark:bg-slate-800 border-4 border-gray-200 dark:border-slate-700 p-6 pl-16 rounded-[2rem] font-bold text-lg text-gray-900 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 placeholder:text-sm" />
                    </div>
                  </div>

                  {/* Смена пароля */}
                  <label className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-6 mb-3">СМЕНА ПАРОЛЯ</label>
                  <div className="relative mb-4">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24}/>
                    <input type={showPass ? "text" : "password"} value={secureData.newPassword} onChange={e => setSecureData({...secureData, newPassword: e.target.value})} placeholder="НОВЫЙ ПАРОЛЬ" className="w-full bg-gray-100 dark:bg-slate-800 border-4 border-gray-200 dark:border-slate-700 p-6 pl-16 rounded-[2rem] font-bold text-lg text-gray-900 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 placeholder:text-sm" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600">{showPass ? <EyeOff size={24}/> : <Eye size={24}/>}</button>
                  </div>
                  
                  {secureData.newPassword && (
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24}/>
                      <input type={showPass ? "text" : "password"} value={secureData.confirmPassword} onChange={e => setSecureData({...secureData, confirmPassword: e.target.value})} placeholder="ПОДТВЕРДИТЕ ПАРОЛЬ" className={`w-full bg-gray-100 dark:bg-slate-800 border-4 p-6 pl-16 rounded-[2rem] font-bold text-lg text-gray-900 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 placeholder:text-sm ${passwordError ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'}`} />
                      {passwordError && <p className="text-red-500 text-xs mt-1 ml-6 font-bold">{passwordError}</p>}
                    </div>
                  )}
                </div>
              </motion.section>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <motion.div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-4 border-gray-300 dark:border-slate-800 rounded-[3.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"><Activity size={150} /></div>
                <SectionHeader icon={Activity} text="ИНФОРМАЦИЯ" />
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4 p-5 bg-green-500/5 rounded-[2.5rem] border-4 border-green-500/20 transition-all hover:bg-green-500/10"><ShieldCheck className="text-green-500" size={24} /><div><p className="font-black text-xs uppercase dark:text-white">Active Node</p><p className="text-[10px] text-green-600 font-bold uppercase">Nominal</p></div></div>
                  <div className="flex items-center gap-4 p-5 bg-amber-500/5 rounded-[2.5rem] border-4 border-amber-500/20 transition-all hover:bg-amber-500/10"><Fingerprint className="text-amber-500" size={24} /><div><p className="font-black text-xs uppercase dark:text-white">Secure ID</p><p className="text-[10px] text-amber-600 font-bold uppercase">Protected</p></div></div>
                </div>
              </motion.div>

              <motion.div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3.5rem] p-5 shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 pointer-events-none"><Zap size={100}/></div>
                <div className="text-center mb-6 relative z-10">
                  <motion.div animate={heartBeat} className="inline-flex p-3 rounded-2xl bg-white/10 mb-3"><Key size={24} /></motion.div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">СОХРАНЕНИЕ</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-white text-indigo-600 py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 relative z-10 cursor-pointer">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : <><Save size={24}/><span>СОХРАНИТЬ ИЗМЕНЕНИЯ</span></>}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </form>
      </main>
    </div>
  );
};

export default Settings;
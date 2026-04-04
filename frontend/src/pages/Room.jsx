import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import { 
  Send, Search, LogOut, Sun, Moon, Paperclip, MessagesSquare, Zap, 
  Settings, X, Loader2, Check, CheckCheck, User, Trash2, Reply, 
  Menu, Users, Phone, Archive, MoreVertical, Globe, MessageCircle, Heart 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const checkIsOnline = (profile) => {
  if (!profile?.is_online) return false;
  if (!profile?.last_seen) return false;
  const lastSeen = new Date(profile.last_seen).getTime();
  const now = new Date().getTime();
  return (now - lastSeen) < 3 * 60 * 1000;
};

const formatLastSeen = (dateString) => {
  if (!dateString) return 'Был(а) недавно';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  const timeString = date.toLocaleTimeString('ru-RU', timeOptions);
  if (isToday) return `Сегодня в ${timeString}`;
  const dateOptions = { day: 'numeric', month: 'short' };
  return `${date.toLocaleDateString('ru-RU', dateOptions)} в ${timeString}`;
};

const MessageMenu = ({ message, isMe, onDelete, onReply, onClose, position }) => {
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <motion.div 
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`absolute z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden min-w-[160px] ${position}`}
    >
      <button 
        onClick={() => { onReply(); onClose(); }}
        className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-black text-xs uppercase tracking-wider cursor-pointer"
      >
        <Reply size={16} className="text-indigo-600" />
        <span>ОТВЕТИТЬ</span>
      </button>
      {isMe && (
        <button 
          onClick={() => { onDelete(); onClose(); }}
          className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-black text-xs uppercase tracking-wider text-red-600 cursor-pointer"
        >
          <Trash2 size={16} />
          <span>УДАЛИТЬ</span>
        </button>
      )}
    </motion.div>
  );
};

const Room = () => {
  const { user, profile: userProfile, loading: authLoading, token, logout } = useAuth();
  const [recentChats, setRecentChats] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState('right-0 top-0');
  const [replyingTo, setReplyingTo] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Socket.io connection
  useEffect(() => {
    if (!user || !token) return;
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join', user.user_id);
    });
    
    newSocket.on('new_message', (data) => {
      if (selectedContact && data.sender_id === selectedContact.user_id) {
        setMessages(prev => [...prev, data]);
      }
      loadChats();
    });
    
    newSocket.on('message_sent', (data) => {
      if (selectedContact && data.receiver_id === selectedContact.user_id) {
        setMessages(prev => [...prev, data]);
      }
    });
    
    newSocket.on('messages_read', (data) => {
      if (data.receiver_id === user.user_id) {
        setMessages(prev => prev.map(msg => 
          msg.sender_id === data.receiver_id ? { ...msg, is_read: true } : msg
        ));
        setUnreadCounts(prev => ({ ...prev, [data.receiver_id]: 0 }));
      }
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user, token, selectedContact]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && token) {
      loadChats();
      loadAllUsers();
    }
  }, [user, token]);

  useEffect(() => {
    if (location.state?.openContact) {
      setSelectedContact(location.state.openContact);
      markMessagesAsRead(location.state.openContact.user_id);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedContact && user && token) {
      loadMessages(selectedContact.user_id);
      markMessagesAsRead(selectedContact.user_id);
    }
  }, [selectedContact, user, token]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const loadAllUsers = async () => {
    try {
      const users = await api.getUsers(token);
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error("Error loading users:", err);
      setAllUsers([]);
    }
  };

  const loadChats = async () => {
    try {
      const chats = await api.getChats(token);
      console.log('Loaded chats:', chats);
      setRecentChats(Array.isArray(chats) ? chats : []);
      
      const counts = {};
      if (Array.isArray(chats)) {
        chats.forEach(chat => {
          if (chat.unread_count > 0) {
            counts[chat.user_id] = chat.unread_count;
          }
        });
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error("Error loading chats:", err);
      setRecentChats([]);
    }
  };

  const loadMessages = async (contactId) => {
    try {
      const msgs = await api.getMessages(contactId, token);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error("Error loading messages:", err);
      setMessages([]);
    }
  };

  const markMessagesAsRead = async (senderId) => {
    try {
      await api.markAsRead(senderId, token);
      if (socket) {
        socket.emit('mark_read', { sender_id: senderId, receiver_id: user.user_id });
      }
      setUnreadCounts(prev => ({ ...prev, [senderId]: 0 }));
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageBody.trim() && !imageFile) || !selectedContact || isSending) return;
    
    setIsSending(true);
    
    try {
      let imageUrl = null;
      if (imageFile) {
        const uploadResult = await api.uploadFile(imageFile, 'chat', token);
        imageUrl = uploadResult.url;
      }
      
      const messageData = {
        receiverId: selectedContact.user_id,
        body: messageBody,
        imageUrl: imageUrl,
        replyToId: replyingTo?.id,
        replyToBody: replyingTo?.body?.substring(0, 50) + (replyingTo?.body?.length > 50 ? '...' : ''),
        replyToSender: replyingTo?.sender_name
      };
      
      const sentMessage = await api.sendMessage(messageData, token);
      
      if (socket) {
        socket.emit('send_message', {
          ...sentMessage,
          sender_id: user.user_id,
          receiver_id: selectedContact.user_id
        });
      }
      
      setMessages(prev => [...prev, sentMessage]);
      setMessageBody('');
      setImageFile(null);
      setImagePreview(null);
      setReplyingTo(null);
      loadChats();
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    setDeletingMessage(messageId);
    
    setTimeout(async () => {
      try {
        await api.deleteMessage(messageId, token);
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setActiveMenu(null);
        loadChats();
      } catch (err) {
        console.error("Error deleting message:", err);
      } finally {
        setDeletingMessage(null);
      }
    }, 400);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    const isMe = msg.sender_id === user?.user_id;
    const position = isMe ? 'right-0 top-0' : 'left-0 top-0';
    setMenuPosition(position);
    setActiveMenu(msg.id);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await api.searchUsers(query, token);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startChatWithUser = (contact) => {
    const existingChat = recentChats.find(c => c.user_id === contact.user_id);
    if (!existingChat) {
      setRecentChats(prev => [contact, ...prev]);
    }
    setSelectedContact(contact);
    setSearchQuery('');
    setReplyingTo(null);
    markMessagesAsRead(contact.user_id);
  };

  const handleLogOut = async () => {
    await logout();
    navigate('/auth');
  };

  const sidebarTopItems = [
    { id: 'profile', icon: User, label: 'ПРОФИЛЬ', action: () => navigate(`/profile/${userProfile?.username}`) },
    { id: 'saved', icon: Archive, label: 'АРХИВ', action: () => {} },
    { id: 'contacts', icon: Users, label: 'КОНТАКТЫ', action: () => {} },
    { id: 'calls', icon: Phone, label: 'ЗВОНКИ', action: () => {} },
    { id: 'settings', icon: Settings, label: 'НАСТРОЙКИ', action: () => navigate('/settings') },
    { id: 'theme', icon: darkMode ? Sun : Moon, label: darkMode ? 'СВЕТЛАЯ ТЕМА' : 'ТЁМНАЯ ТЕМА', action: () => setDarkMode(!darkMode) },
  ];

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-[#020617]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'}`}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
        <motion.div className="absolute -bottom-20 -right-20 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 flex flex-col shadow-2xl z-30 shrink-0"
        animate={{ width: isSidebarExpanded ? 260 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="flex items-center gap-3 cursor-pointer group">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:bg-indigo-500 transition-all">
              <Zap size={26} className="text-white fill-current" />
            </div>
            <motion.span
              initial={false}
              animate={{ opacity: isSidebarExpanded ? 1 : 0, width: isSidebarExpanded ? 'auto' : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-black tracking-tighter dark:text-white whitespace-nowrap overflow-hidden"
            >
              IGROGRAM
            </motion.span>
          </div>
        </div>

        {/* ТОЛЬКО ЭТОТ БЛОК ИЗМЕНЕН - добавлен justify-center */}
        <div className="flex-1 flex flex-col justify-center py-6 space-y-2">
          {sidebarTopItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Icon size={24} />
                <motion.span
                  initial={false}
                  animate={{ opacity: isSidebarExpanded ? 1 : 0, width: isSidebarExpanded ? 'auto' : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-black uppercase tracking-wider whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        <div className="p-2 pb-4">
          <motion.button
            whileHover={{ scale: 1.02, x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={24} />
            <motion.span
              initial={false}
              animate={{ opacity: isSidebarExpanded ? 1 : 0, width: isSidebarExpanded ? 'auto' : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-black uppercase tracking-wider whitespace-nowrap overflow-hidden"
            >
              ВЫХОД
            </motion.span>
          </motion.button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden relative z-20">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 h-full" style={{ width: '380px', minWidth: '380px' }}>
          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
            <div className="relative">
              {isSearching ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={18} /> : <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
              <input
                type="text"
                placeholder="ПОИСК ПОЛЬЗОВАТЕЛЕЙ ПО ИМЕНИ ИЛИ USERNAME..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-black tracking-wide"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {searchQuery.trim() ? (
              <>
                <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center gap-2 sticky top-0 z-10">
                  <Globe size={14} className="text-indigo-600" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">ГЛОБАЛЬНЫЙ ПОИСК • {searchResults.length} НАЙДЕНО</span>
                </div>
                {searchResults.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => startChatWithUser(contact)}
                    className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800 ${
                      selectedContact?.user_id === contact.user_id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                        alt=""
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`;
                        }}
                      />
                      {checkIsOnline(contact) && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-base text-gray-900 dark:text-white truncate">{contact.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">@{contact.username}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center text-gray-500 text-sm py-12 font-black">
                    <Search size={32} className="mx-auto mb-3 opacity-30" />
                    ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2 sticky top-0 z-10">
                  <MessageCircle size={14} className="text-indigo-600" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">ВАШИ ДИАЛОГИ • {recentChats.length}</span>
                </div>
                {recentChats.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => { 
                      setSelectedContact(contact); 
                      setReplyingTo(null);
                      markMessagesAsRead(contact.user_id);
                    }}
                    className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800 ${
                      selectedContact?.user_id === contact.user_id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                        alt=""
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`;
                        }}
                      />
                      {checkIsOnline(contact) && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-base text-gray-900 dark:text-white truncate">{contact.name}</span>
                        {unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {unreadCounts[contact.user_id]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">@{contact.username}</span>
                      </div>
                      {contact.last_message && (
                        <div className="mt-2">
                          <p className={`text-xs font-bold truncate ${
                            unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id 
                              ? 'text-gray-900 dark:text-white font-black' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {contact.last_message.sender_id === user?.user_id ? `Вы: ` : ''}
                            {contact.last_message.body 
                              ? (contact.last_message.body.length > 35 
                                  ? contact.last_message.body.substring(0, 35) + '...' 
                                  : contact.last_message.body)
                              : (contact.last_message.image_url ? '📷 Изображение' : 'Нет сообщений')}
                          </p>
                          {contact.last_message.created_at && (
                            <span className="text-[8px] font-black text-gray-400">
                              {new Date(contact.last_message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                        </div>
                      )}
                      {!checkIsOnline(contact) && !contact.last_message && (
                        <div className="mt-1">
                          <span className="text-[8px] font-black text-gray-400">{formatLastSeen(contact.last_seen)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {recentChats.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-12 font-black">
                    <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
                    НЕТ АКТИВНЫХ ДИАЛОГОВ
                    <div className="text-[9px] mt-2 text-gray-400">ИСПОЛЬЗУЙТЕ ПОИСК, ЧТОБЫ НАЙТИ ДРУЗЕЙ</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-900/50 h-full overflow-hidden">
          {selectedContact ? (
            <>
              <div className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 shadow-sm shrink-0">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${selectedContact.username}`)}>
                  <img
                    src={selectedContact.avatar_url || `https://ui-avatars.com/api/?name=${selectedContact.name}&background=4f46e5&color=fff&size=128`}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-indigo-500"
                    alt=""
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${selectedContact.name}&background=4f46e5&color=fff&size=128`;
                    }}
                  />
                  <div>
                    <h2 className="font-black text-base text-gray-900 dark:text-white">{selectedContact.name}</h2>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${checkIsOnline(selectedContact) ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {checkIsOnline(selectedContact) ? 'В СЕТИ' : formatLastSeen(selectedContact.last_seen)}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar flex flex-col">
                <AnimatePresence>
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.user_id;
                    const isDeleting = deletingMessage === msg.id;

                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={isDeleting ? {
                          scale: [1, 1.2, 0.8, 1.5, 0],
                          rotate: [0, 5, -5, 10, 0],
                          opacity: [1, 0.8, 0.6, 0.3, 0],
                          transition: { duration: 0.4 }
                        } : { opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0, rotate: 20 }}
                        transition={{ duration: 0.2 }}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} relative group`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        <div className={`relative max-w-[75%] shadow-lg transition-all ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md ml-12' : 'bg-white border border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 rounded-2xl rounded-tl-md mr-12'}`}>
                          {msg.reply_to && (
                            <div className={`px-4 pt-2 pb-1 text-[10px] border-b ${isMe ? 'border-indigo-500' : 'border-gray-200 dark:border-slate-700'}`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <Reply size={10} className={isMe ? 'text-indigo-200' : 'text-gray-500'} />
                                <span className={`font-black text-[8px] uppercase tracking-wider ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                  ОТВЕТ {msg.reply_to_sender === user?.name ? 'СЕБЕ' : msg.reply_to_sender}
                                </span>
                              </div>
                              <p className={`italic truncate text-[9px] ${isMe ? 'text-indigo-100' : 'text-gray-400'}`}>
                                {msg.reply_to_body || 'СООБЩЕНИЕ УДАЛЕНО'}
                              </p>
                            </div>
                          )}
                          {msg.image_url && (
                            <div className="p-1.5">
                              <img src={msg.image_url} className="max-w-full max-h-48 rounded-lg object-cover" alt="" />
                            </div>
                          )}
                          <div className="px-4 py-2 pb-5 relative min-w-[80px]">
                            {msg.body && <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>}
                            <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-60">
                              <span className="text-[8px] font-black">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              {isMe && (msg.is_read ? <CheckCheck size={10} className="text-white" /> : <Check size={10} className="text-white/60" />)}
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const position = isMe ? 'right-0 top-0' : 'left-0 top-0';
                            setMenuPosition(position);
                            setActiveMenu(activeMenu === msg.id ? null : msg.id);
                          }}
                          className={`absolute top-1 ${isMe ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-200 dark:bg-slate-700 rounded-lg shadow-md z-10 cursor-pointer`}
                        >
                          <MoreVertical size={12} />
                        </button>
                        
                        <AnimatePresence>
                          {activeMenu === msg.id && (
                            <MessageMenu 
                              message={msg}
                              isMe={isMe}
                              onDelete={() => handleDeleteMessage(msg.id)}
                              onReply={() => setReplyingTo(msg)}
                              onClose={() => setActiveMenu(null)}
                              position={menuPosition}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="sticky bottom-0 left-0 right-0 mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Reply size={14} className="text-indigo-600" />
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            ОТВЕТ {replyingTo.sender_name === user?.name ? 'СЕБЕ' : replyingTo.sender_name}
                          </span>
                          <p className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-xs font-bold">
                            {replyingTo.body || 'ИЗОБРАЖЕНИЕ'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors cursor-pointer">
                        <X size={14} className="text-indigo-600" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 shrink-0">
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border-2 border-indigo-600 shadow-lg">
                      <img src={imagePreview} className="h-14 w-auto rounded-lg object-cover" alt="" />
                      <button onClick={() => {setImageFile(null); setImagePreview(null)}} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full border-2 border-white shadow-md hover:bg-red-600 transition-colors cursor-pointer">
                        <X size={10}/>
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                    }} />
                    <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer">
                      <Paperclip size={18} />
                    </button>
                    <input 
                      type="text" 
                      placeholder={replyingTo ? "НАПИШИТЕ ОТВЕТ..." : "СООБЩЕНИЕ..."} 
                      className="flex-1 bg-transparent outline-none text-sm font-black tracking-wide py-1.5" 
                      value={messageBody} 
                      onChange={(e) => setMessageBody(e.target.value)} 
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    type="submit" 
                    disabled={isSending || (!messageBody.trim() && !imageFile)} 
                    className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </motion.button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div animate={{ rotate: [0, 5, 0, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} className="w-40 h-40 bg-white dark:bg-slate-800 rounded-[50px] flex items-center justify-center mb-6 shadow-2xl border-4 border-gray-200 dark:border-slate-700">
                <MessagesSquare size={60} className="text-indigo-600 opacity-20"/>
              </motion.div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">ВЫБЕРИТЕ ЧАТ</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-black">ИСПОЛЬЗУЙТЕ ПОИСК, ЧТОБЫ НАЙТИ ДРУЗЕЙ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
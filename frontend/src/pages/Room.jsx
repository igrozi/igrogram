import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import { 
  Send, Search, LogOut, Sun, Moon, Paperclip, MessagesSquare, Zap, 
  Settings, X, Loader2, Check, CheckCheck, User, Trash2, Reply, 
  Users, Phone, Archive, Globe, MessageCircle, MoreVertical, ArrowLeft 
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
  if (isToday) return `сегодня в ${timeString}`;
  const dateOptions = { day: 'numeric', month: 'short' };
  return `${date.toLocaleDateString('ru-RU', dateOptions)} в ${timeString}`;
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, message: null });
  
  // Mobile states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeMobileTab, setActiveMobileTab] = useState('chats');
  const [showMobileChatList, setShowMobileChatList] = useState(true);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      loadChats();
    });
    
    newSocket.on('message_sent', (data) => {
      if (selectedContact && data.receiver_id === selectedContact.user_id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
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
    
    newSocket.on('message_deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      if (replyingTo?.id === data.messageId) {
        setReplyingTo(null);
      }
      loadChats();
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
      setShowMobileChatList(false);
      markMessagesAsRead(location.state.openContact.user_id);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedContact && user && token) {
      loadMessages(selectedContact.user_id);
      markMessagesAsRead(selectedContact.user_id);
      if (isMobile) {
        setShowMobileChatList(false);
      }
    }
  }, [selectedContact, user, token, isMobile]);

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

  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0, message: null });
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      
      let replyText = null;
      if (replyingTo) {
        if (replyingTo.body) {
          replyText = replyingTo.body.substring(0, 50) + (replyingTo.body.length > 50 ? '...' : '');
        } else if (replyingTo.image_url) {
          replyText = '📷 Изображение';
        }
      }
      
      const messageData = {
        receiverId: selectedContact.user_id,
        body: messageBody,
        imageUrl: imageUrl,
        replyToId: replyingTo?.id,
        replyToBody: replyText,
        replyToSender: replyingTo?.sender_name
      };
      
      const sentMessage = await api.sendMessage(messageData, token);
      
      setMessages(prev => {
        if (prev.some(m => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });
      
      if (socket) {
        socket.emit('send_message', {
          ...sentMessage,
          sender_id: user.user_id,
          receiver_id: selectedContact.user_id
        });
      }
      
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
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        if (replyingTo?.id === messageId) {
          setReplyingTo(null);
        }
        if (socket && selectedContact) {
          socket.emit('delete_message', {
            messageId: messageId,
            chatId: selectedContact.user_id
          });
        }
        loadChats();
      } catch (err) {
        console.error("Error deleting message:", err);
      } finally {
        setDeletingMessage(null);
        setContextMenu({ visible: false, x: 0, y: 0, message: null });
      }
    }, 500);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, message: null });
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
    { id: 'contacts', icon: Users, label: 'КОНТАКТЫ', action: () => {} },
    { id: 'calls', icon: Phone, label: 'ЗВОНКИ', action: () => {} },
    { id: 'saved', icon: Archive, label: 'СОХР.', action: () => {} },
    { id: 'settings', icon: Settings, label: 'НАСТРОЙКИ', action: () => navigate('/settings') },
    { id: 'theme', icon: darkMode ? Sun : Moon, label: darkMode ? 'СВЕТЛАЯ ТЕМА' : 'ТЁМНАЯ ТЕМА', action: () => setDarkMode(!darkMode) },
  ];

  const mobileBottomTabs = [
    { id: 'chats', icon: MessageCircle, label: 'Чаты', action: () => { setActiveMobileTab('chats'); setSelectedContact(null); setShowMobileChatList(true); } },
    { id: 'contacts', icon: Users, label: 'Контакты', action: () => { setActiveMobileTab('contacts'); setSelectedContact(null); setShowMobileChatList(true); } },
    { id: 'settings', icon: Settings, label: 'Настройки', action: () => navigate('/settings') },
    { id: 'profile', icon: User, label: 'Профиль', action: () => navigate(`/profile/${userProfile?.username}`) },
  ];

  const ContextMenuComponent = ({ x, y, message, onClose }) => {
    const menuRef = useRef(null);
    const isMe = message?.sender_id === user?.user_id;
    
    useEffect(() => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = x;
        let newY = y;
        
        if (x + rect.width > viewportWidth) {
          newX = viewportWidth - rect.width - 10;
        }
        if (y + rect.height > viewportHeight) {
          newY = viewportHeight - rect.height - 10;
        }
        
        menuRef.current.style.left = `${newX}px`;
        menuRef.current.style.top = `${newY}px`;
      }
    }, [x, y]);
    
    return (
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden min-w-[160px]"
        style={{ position: 'fixed', left: x, top: y }}
      >
        <button 
          onClick={() => {
            if (message) {
              setReplyingTo(message);
              onClose();
            }
          }}
          className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-black text-xs uppercase tracking-wider cursor-pointer"
        >
          <Reply size={16} className="text-indigo-600" />
          <span>ОТВЕТИТЬ</span>
        </button>
        {isMe && (
          <button 
            onClick={() => {
              if (message) handleDeleteMessage(message.id);
              onClose();
            }}
            className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-black text-xs uppercase tracking-wider text-red-600 cursor-pointer"
          >
            <Trash2 size={16} />
            <span>УДАЛИТЬ</span>
          </button>
        )}
      </motion.div>
    );
  };

  if (authLoading) {
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
      <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-[#020617]">
        {/* Фоновые эффекты */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
          <motion.div className="absolute -bottom-20 -right-20 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        {/* Верхний хедер (только на главных экранах) */}
        {(!selectedContact || showMobileChatList) && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 px-4 py-3 shrink-0 relative z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                <Zap size={22} className="text-white fill-current" />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">
                IGROGRAM
              </span>
            </div>
          </div>
        )}

        {/* Основной контент */}
        <div className="flex-1 flex flex-col relative z-20 overflow-hidden">
          {/* Список чатов */}
          {activeMobileTab === 'chats' && showMobileChatList && (
            <div className="flex-1 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                <div className="relative">
                  {isSearching ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={18} /> : <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
                  <input
                    type="text"
                    placeholder="ПОИСК ПОЛЬЗОВАТЕЛЕЙ..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-black tracking-wide"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {searchQuery.trim() ? (
                  <>
                    <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30">
                      <Globe size={14} className="inline text-indigo-600 mr-2" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">ГЛОБАЛЬНЫЙ ПОИСК • {searchResults.length} НАЙДЕНО</span>
                    </div>
                    {searchResults.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => startChatWithUser(contact)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                            alt=""
                          />
                          {checkIsOnline(contact) && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-black text-base text-gray-900 dark:text-white truncate block">{contact.name}</span>
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-500 mt-0.5 block">@{contact.username}</span>
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && !isSearching && (
                      <div className="text-center text-gray-500 text-sm py-12 font-black">
                        <Search size={36} className="mx-auto mb-3 opacity-30" />
                        ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-100 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                      <MessageCircle size={14} className="inline text-indigo-600 mr-2" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">ДИАЛОГИ • {recentChats.length}</span>
                    </div>
                    {recentChats.map(contact => {
                      const isUserOnline = checkIsOnline(contact);
                      const lastMsg = contact.last_message;
                      const lastMsgText = lastMsg?.body 
                        ? (lastMsg.body.length > 35 ? lastMsg.body.substring(0, 35) + '...' : lastMsg.body)
                        : (lastMsg?.image_url ? '📷 Изображение' : 'Нет сообщений');
                      const lastMsgTime = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                      
                      return (
                        <div
                          key={contact.id}
                          onClick={() => startChatWithUser(contact)}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                              alt=""
                            />
                            {isUserOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-black text-base text-gray-900 dark:text-white truncate">{contact.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black uppercase tracking-wider text-indigo-500">@{contact.username}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className={`text-xs font-bold truncate flex-1 ${
                                unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {lastMsg?.sender_id === user?.user_id ? `Вы: ${lastMsgText}` : lastMsgText}
                              </p>
                              {lastMsgTime && (
                                <span className="text-[10px] font-black text-gray-400 whitespace-nowrap shrink-0">
                                  {lastMsgTime}
                                </span>
                              )}
                            </div>
                            {unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id && (
                              <div className="mt-1 flex justify-end">
                                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                  {unreadCounts[contact.user_id]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recentChats.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-12 font-black">
                        <MessageCircle size={44} className="mx-auto mb-3 opacity-30" />
                        НЕТ ДИАЛОГОВ
                        <div className="text-[10px] mt-2 text-gray-400">ИСПОЛЬЗУЙТЕ ПОИСК</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Контакты */}
          {activeMobileTab === 'contacts' && (
            <div className="flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-y-auto">
              <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                <Users size={14} className="inline text-indigo-600 mr-2" />
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">ВСЕ КОНТАКТЫ • {allUsers.filter(u => u.user_id !== user.user_id).length}</span>
              </div>
              {allUsers.filter(u => u.user_id !== user.user_id).map(contact => (
                <div
                  key={contact.id}
                  onClick={() => {
                    startChatWithUser(contact);
                    setActiveMobileTab('chats');
                  }}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <div className="relative">
                    <img
                      src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.name}&background=4f46e5&color=fff&size=128`}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                      alt=""
                    />
                    {checkIsOnline(contact) && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                  </div>
                  <div className="flex-1">
                    <span className="font-black text-base text-gray-900 dark:text-white block">{contact.name}</span>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-500">@{contact.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ЭКРАН ЧАТА */}
          {selectedContact && activeMobileTab === 'chats' && !showMobileChatList && (
            <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-900/50 overflow-hidden">
              {/* Хедер чата */}
              <div className="h-14 flex items-center px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 shrink-0">
                <button 
                  onClick={() => { setShowMobileChatList(true); setSelectedContact(null); }}
                  className="p-2 -ml-2 mr-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} className="dark:text-white" />
                </button>
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => navigate(`/profile/${selectedContact.username}`)}>
                  <img
                    src={selectedContact.avatar_url || `https://ui-avatars.com/api/?name=${selectedContact.name}&background=4f46e5&color=fff&size=128`}
                    className="w-9 h-9 rounded-xl object-cover border-2 border-indigo-500"
                    alt=""
                  />
                  <div>
                    <h2 className="font-black text-base text-gray-900 dark:text-white">{selectedContact.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${checkIsOnline(selectedContact) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {checkIsOnline(selectedContact) ? 'В СЕТИ' : formatLastSeen(selectedContact.last_seen)}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.user_id;
                    const isDeleting = deletingMessage === msg.id;

                    return (
                      <motion.div 
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} relative group`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        <div 
                          className={`relative max-w-[85%] shadow-lg transition-all overflow-hidden ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md' 
                              : 'bg-white border border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 rounded-2xl rounded-tl-md'
                          }`}
                          style={{ borderRadius: '16px' }}
                        >
                          <div className="message-content relative z-0">
                            {msg.reply_to && (
                              <div className={`px-3 pt-1.5 pb-1 text-[9px] border-b ${isMe ? 'border-indigo-500' : 'border-gray-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Reply size={9} className={isMe ? 'text-indigo-200' : 'text-gray-500'} />
                                  <span className={`font-black text-[7px] uppercase tracking-wider ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                    ОТВЕТ {msg.reply_to_sender === user?.name ? 'СЕБЕ' : msg.reply_to_sender}
                                  </span>
                                </div>
                                <p className={`italic truncate text-[8px] ${isMe ? 'text-indigo-100' : 'text-gray-400'}`}>
                                  {msg.reply_to_body || 'СООБЩЕНИЕ УДАЛЕНО'}
                                </p>
                              </div>
                            )}
                            {msg.image_url && (
                              <div className="p-1">
                                <img 
                                  src={msg.image_url} 
                                  className="max-w-full max-h-60 rounded-lg object-cover cursor-pointer" 
                                  alt=""
                                  onClick={() => window.open(msg.image_url, '_blank')}
                                />
                              </div>
                            )}
                            <div className="px-3 py-2 pb-5 relative min-w-[70px]">
                              {msg.body && <p className="text-sm font-extrabold leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>}
                              <div className="absolute bottom-0.5 right-1.5 flex items-center gap-1 opacity-60">
                                <span className="text-[7px] font-black">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {isMe && (msg.is_read ? <CheckCheck size={8} className="text-white" /> : <Check size={8} className="text-white/60" />)}
                              </div>
                            </div>
                          </div>

                          {isDeleting && (
                            <motion.div
                              initial={{ clipPath: 'inset(0% 0% 100% 0%)', backgroundColor: '#ef4444' }}
                              animate={{ 
                                clipPath: [
                                  'inset(0% 0% 100% 0%)',
                                  'inset(0% 0% 0% 0%)',
                                  'inset(0% 0% 0% 0%)',
                                  'inset(100% 0% 0% 0%)'
                                ]
                              }}
                              transition={{ 
                                duration: 0.5, 
                                times: [0, 0.3, 0.7, 1],
                                ease: "easeInOut" 
                              }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                borderRadius: '16px',
                                zIndex: 5,
                                pointerEvents: 'none'
                              }}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* ПОЛЕ ВВОДА СООБЩЕНИЯ - ФИКСИРОВАНО ВНИЗУ */}
              <div className="shrink-0 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800">
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border-l-4 border-indigo-500 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Reply size={12} className="text-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            ОТВЕТ ДЛЯ {replyingTo.sender_name?.toUpperCase()}
                          </span>
                          <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">
                            {replyingTo.body 
                              ? (replyingTo.body.length > 30 
                                  ? replyingTo.body.substring(0, 30) + '...' 
                                  : replyingTo.body)
                              : (replyingTo.image_url ? '📷 Изображение' : 'Сообщение')}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setReplyingTo(null)} 
                        className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
                      >
                        <X size={12} className="text-indigo-600" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border-2 border-indigo-600 shadow-lg">
                      <img src={imagePreview} className="h-12 w-auto rounded-lg object-cover" alt="" />
                      <button onClick={() => {setImageFile(null); setImagePreview(null)}} className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full border-2 border-white shadow-md hover:bg-red-600 transition-colors">
                        <X size={9}/>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2 px-3 py-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                    }} />
                    <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Paperclip size={16} />
                    </button>
                    <input 
                      type="text" 
                      placeholder={replyingTo ? "НАПИШИТЕ ОТВЕТ..." : "СООБЩЕНИЕ..."} 
                      className="flex-1 bg-transparent outline-none text-sm font-black tracking-wide py-1 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500" 
                      value={messageBody} 
                      onChange={(e) => setMessageBody(e.target.value)} 
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSending || (!messageBody.trim() && !imageFile)} 
                    className="mb-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Пустой чат */}
          {!selectedContact && activeMobileTab === 'chats' && !showMobileChatList && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div animate={{ rotate: [0, 5, 0, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[40px] flex items-center justify-center mb-4 shadow-2xl border-4 border-gray-200 dark:border-slate-700">
                <MessagesSquare size={44} className="text-indigo-600 opacity-20"/>
              </motion.div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">ВЫБЕРИТЕ ЧАТ</h2>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black">ИСПОЛЬЗУЙТЕ ПОИСК, ЧТОБЫ НАЙТИ ДРУЗЕЙ</p>
              <button 
                onClick={() => setShowMobileChatList(true)}
                className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm"
              >
                ВЕРНУТЬСЯ К СПИСКУ ЧАТОВ
              </button>
            </div>
          )}
        </div>

        {/* Нижнее меню */}
        <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 flex items-center justify-around py-2 relative z-50" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {mobileBottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {contextMenu.visible && contextMenu.message && (
            <ContextMenuComponent 
              x={contextMenu.x}
              y={contextMenu.y}
              message={contextMenu.message}
              onClose={closeContextMenu}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==================== ДЕСКТОПНАЯ ВЕРСИЯ ====================
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
          <div onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className={`flex items-center gap-3 cursor-pointer group ${!isSidebarExpanded ? 'justify-center' : ''}`}>
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

        <div className="flex-1 flex flex-col py-6 space-y-2">
          {sidebarTopItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.action}
                className="w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer text-gray-700 dark:text-gray-300"
                style={{ 
                  justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                  paddingLeft: isSidebarExpanded ? '18px' : '0px',
                  paddingRight: isSidebarExpanded ? '0px' : '0px',
                  paddingTop: '12px',
                  paddingBottom: '12px'
                }}
              >
                <Icon size={24} strokeWidth={1.8} />
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
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogOut}
            className="w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer text-red-500"
            style={{ 
              justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
              paddingLeft: isSidebarExpanded ? '18px' : '0px',
              paddingRight: isSidebarExpanded ? '0px' : '0px',
              paddingTop: '12px',
              paddingBottom: '12px'
            }}
          >
            <LogOut size={24} strokeWidth={1.8} />
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
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 h-full" style={{ width: '400px', minWidth: '400px' }}>
          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
            <div className="relative">
              {isSearching ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={20} /> : <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />}
              <input
                type="text"
                placeholder="ПОИСК ПОЛЬЗОВАТЕЛЕЙ..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-base font-black tracking-wide"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {searchQuery.trim() ? (
              <>
                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center gap-2 sticky top-0 z-10">
                  <Globe size={16} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">ГЛОБАЛЬНЫЙ ПОИСК • {searchResults.length} НАЙДЕНО</span>
                </div>
                {searchResults.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => startChatWithUser(contact)}
                    className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800 ${
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
                      <span className="font-black text-lg text-gray-900 dark:text-white truncate block">{contact.name}</span>
                      <span className="text-sm font-black uppercase tracking-wider text-indigo-500 mt-0.5 block">@{contact.username}</span>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center text-gray-500 text-base py-12 font-black">
                    <Search size={40} className="mx-auto mb-3 opacity-30" />
                    ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-4 py-3 bg-gray-100 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2 sticky top-0 z-10">
                  <MessageCircle size={16} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">ДИАЛОГИ • {recentChats.length}</span>
                </div>
                {recentChats.map(contact => {
                  const isUserOnline = checkIsOnline(contact);
                  const lastMsg = contact.last_message;
                  const lastMsgText = lastMsg?.body 
                    ? (lastMsg.body.length > 50 ? lastMsg.body.substring(0, 50) + '...' : lastMsg.body)
                    : (lastMsg?.image_url ? '📷 Изображение' : 'Нет сообщений');
                  const lastMsgTime = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                  
                  return (
                    <div
                      key={contact.id}
                      onClick={() => { 
                        setSelectedContact(contact); 
                        setReplyingTo(null);
                        markMessagesAsRead(contact.user_id);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-slate-800 ${
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
                        {isUserOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-black text-lg text-gray-900 dark:text-white truncate">{contact.name}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-sm font-black uppercase tracking-wider text-indigo-500">@{contact.username}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className={`text-sm font-bold truncate flex-1 ${
                            unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {lastMsg?.sender_id === user?.user_id ? `Вы: ${lastMsgText}` : lastMsgText}
                          </p>
                          {lastMsgTime && (
                            <span className="text-xs font-black text-gray-400 whitespace-nowrap shrink-0">
                              {lastMsgTime}
                            </span>
                          )}
                        </div>
                        {unreadCounts[contact.user_id] > 0 && selectedContact?.user_id !== contact.user_id && (
                          <div className="mt-1.5 flex justify-end">
                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              {unreadCounts[contact.user_id]}
                            </span>
                          </div>
                        )}
                        {!isUserOnline && !lastMsg && (
                          <p className="text-xs font-black text-gray-400 mt-1.5">{formatLastSeen(contact.last_seen)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {recentChats.length === 0 && (
                  <div className="text-center text-gray-500 text-base py-12 font-black">
                    <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
                    НЕТ ДИАЛОГОВ
                    <div className="text-[11px] mt-2 text-gray-400">ИСПОЛЬЗУЙТЕ ПОИСК</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-900/50 h-full overflow-hidden">
          {selectedContact ? (
            <>
              <div className="h-20 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 shadow-sm shrink-0">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${selectedContact.username}`)}>
                  <img
                    src={selectedContact.avatar_url || `https://ui-avatars.com/api/?name=${selectedContact.name}&background=4f46e5&color=fff&size=128`}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-500"
                    alt=""
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${selectedContact.name}&background=4f46e5&color=fff&size=128`;
                    }}
                  />
                  <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white">{selectedContact.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${checkIsOnline(selectedContact) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {checkIsOnline(selectedContact) ? 'В СЕТИ' : formatLastSeen(selectedContact.last_seen)}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <MoreVertical size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.user_id;
                    const isDeleting = deletingMessage === msg.id;

                    return (
                      <motion.div 
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ 
                          opacity: 0, 
                          scale: 0,
                          transition: { duration: 0.2 }
                        }}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} relative group`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        <div 
                          className={`relative max-w-[75%] shadow-lg transition-all overflow-hidden ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md' 
                              : 'bg-white border border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 rounded-2xl rounded-tl-md'
                          }`}
                          style={{ borderRadius: '18px' }}
                        >
                          <div className="message-content relative z-0">
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
                                <img 
                                  src={msg.image_url} 
                                  className="max-w-full max-h-80 rounded-lg object-cover cursor-pointer" 
                                  alt=""
                                  onClick={() => window.open(msg.image_url, '_blank')}
                                />
                              </div>
                            )}
                            <div className="px-4 py-2 pb-5 relative min-w-[80px]">
                              {msg.body && <p className="text-base font-extrabold leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>}
                              <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-60">
                                <span className="text-[8px] font-black">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {isMe && (msg.is_read ? <CheckCheck size={10} className="text-white" /> : <Check size={10} className="text-white/60" />)}
                              </div>
                            </div>
                          </div>

                          {isDeleting && (
                            <motion.div
                              initial={{ clipPath: 'inset(0% 0% 100% 0%)', backgroundColor: '#ef4444' }}
                              animate={{ 
                                clipPath: [
                                  'inset(0% 0% 100% 0%)',
                                  'inset(0% 0% 0% 0%)',
                                  'inset(0% 0% 0% 0%)',
                                  'inset(100% 0% 0% 0%)'
                                ]
                              }}
                              transition={{ 
                                duration: 0.5, 
                                times: [0, 0.3, 0.7, 1],
                                ease: "easeInOut" 
                              }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                borderRadius: '18px',
                                zIndex: 5,
                                pointerEvents: 'none'
                              }}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 shrink-0">
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="mb-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border-l-4 border-indigo-500 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Reply size={16} className="text-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              ОТВЕТ ДЛЯ {replyingTo.sender_name?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                            {replyingTo.body 
                              ? (replyingTo.body.length > 50 
                                  ? replyingTo.body.substring(0, 50) + '...' 
                                  : replyingTo.body)
                              : (replyingTo.image_url ? '📷 Изображение' : 'Сообщение')}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setReplyingTo(null)} 
                        className="p-1.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        <X size={14} className="text-indigo-600" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                    className="mb-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      <AnimatePresence>
        {contextMenu.visible && contextMenu.message && (
          <ContextMenuComponent 
            x={contextMenu.x}
            y={contextMenu.y}
            message={contextMenu.message}
            onClose={closeContextMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room;
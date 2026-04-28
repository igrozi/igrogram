import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, MessageCircle, Star, Zap, Heart, MessageSquare, Send, 
  Pencil, Check, X, Calendar, Trash2, Image as ImageIcon, Loader2, 
  Reply, Pin, PinOff, Users, BarChart3
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://igrogram-production.up.railway.app';

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

// Компактный формат даты для мобильной версии
const formatDateCompact = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatDateWithTime = (dateString) => {
  return new Date(dateString).toLocaleString('ru-RU', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Компактная диаграмма оценок
const CompactRatingChart = ({ stats, total, average, darkMode }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    setAnimated(true);
  }, []);

  const ratings = [
    { stars: 5, count: stats[5] || 0, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500' },
    { stars: 4, count: stats[4] || 0, color: 'from-indigo-400 to-indigo-500', bg: 'bg-indigo-400' },
    { stars: 3, count: stats[3] || 0, color: 'from-violet-400 to-violet-500', bg: 'bg-violet-400' },
    { stars: 2, count: stats[2] || 0, color: 'from-purple-400 to-purple-500', bg: 'bg-purple-400' },
    { stars: 1, count: stats[1] || 0, color: 'from-fuchsia-400 to-fuchsia-500', bg: 'bg-fuchsia-400' }
  ];

  const getPercentage = (count) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  if (total === 0) {
    return (
      <div className="mt-6 p-4 sm:p-6 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <BarChart3 size={16} className="text-white" />
          </div>
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-gray-600 dark:text-slate-400">
            Статистика оценок
          </h3>
        </div>
        <p className="text-center text-xs font-black uppercase text-gray-400 dark:text-slate-500 py-4">
          Пока нет оценок
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 p-4 sm:p-6 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <BarChart3 size={16} className="text-white" />
          </div>
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-gray-600 dark:text-slate-400">
            Статистика оценок
          </h3>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Users size={12} className="text-indigo-400 dark:text-indigo-500" />
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400">
              {total}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200 dark:border-indigo-800/50">
            <Star size={12} className="text-indigo-500 fill-indigo-500" />
            <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              {average.toFixed(1)}
            </span>
            <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 dark:text-slate-500">/5</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {ratings.map((rating, index) => (
          <motion.div
            key={rating.stars}
            initial={{ opacity: 0, x: -10 }}
            animate={animated ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="group"
            onMouseEnter={() => setHoveredBar(rating.stars)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 sm:gap-1.5 w-10 sm:w-12">
                <span className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-slate-400">
                  {rating.stars}
                </span>
                <Star size={12} className="text-indigo-400 fill-indigo-400" />
              </div>

              <div className="flex-1">
                <div className="relative h-6 sm:h-7 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={animated ? { width: `${getPercentage(rating.count)}%` } : { width: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${rating.color} shadow-md`}
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-3">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-slate-300 z-10">
                      {rating.count}
                    </span>
                    <AnimatePresence>
                      {hoveredBar === rating.stars && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-[8px] sm:text-[10px] font-black text-gray-500 dark:text-slate-400 z-10 bg-white/80 dark:bg-slate-900/80 px-1.5 sm:px-2 py-0.5 rounded-full"
                        >
                          {getPercentage(rating.count).toFixed(0)}%
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {ratings.reduce((max, r) => r.count > max ? r.count : max, 0)}
            </div>
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
              Макс. голосов
            </div>
          </div>
          <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {((stats[5] || 0) + (stats[4] || 0))}
            </div>
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
              4-5 звёзд
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, loading: authLoading, token, logout } = useAuth();
  const fileInputRef = useRef(null);
  const bioInputRef = useRef(null);
  
  const [profile, setProfile] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [myVote, setMyVote] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [showComments, setShowComments] = useState({});
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const [ratingStats, setRatingStats] = useState({1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0, average: 0});
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isOwnProfile = useMemo(() => {
    return user && profile && user.user_id === profile.user_id;
  }, [user, profile]);

  const fetchRatingStats = useCallback(async (userId) => {
    try {
      const response = await api.getRatingStats(userId, token);
      return response;
    } catch (error) {
      console.error('Error fetching rating stats:', error);
      return { stats: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, total: 0, average: 0 };
    }
  }, [token]);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      const profileData = await api.getProfile(username, token);
      if (!profileData) {
        setError("Профиль не найден");
        setLoading(false);
        return;
      }
      
      setProfile(profileData);
      setNewBio(profileData.bio || "");
      
      if (user && profileData.user_id !== user.user_id && profileData.voted_users) {
        if (profileData.voted_users.includes(user.user_id)) {
          setHasVoted(true);
          setMyVote(profileData.rating || 0);
        }
      }

      if (user?.user_id === profileData.user_id) {
        const { stats, total, average } = await fetchRatingStats(profileData.user_id);
        setRatingStats({ ...stats, total, average });
      }

      const posts = await api.getUserPosts(profileData.user_id, token);
      
      const sortedPosts = posts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.is_pinned && b.is_pinned) {
          return new Date(b.pinned_at) - new Date(a.pinned_at);
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setAllPosts(sortedPosts);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные профиля.");
    } finally {
      setLoading(false);
    }
  }, [username, navigate, user, token, fetchRatingStats]);

  // Обновление статистики после действий
  const updateStats = useCallback(async () => {
    if (!profile) return;
    
    try {
      const updatedProfile = await api.getProfile(profile.username, token);
      setProfile(updatedProfile);
      
      if (isOwnProfile) {
        const { stats, total, average } = await fetchRatingStats(profile.user_id);
        setRatingStats({ ...stats, total, average });
      }
      
      const posts = await api.getUserPosts(profile.user_id, token);
      const sortedPosts = posts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.is_pinned && b.is_pinned) {
          return new Date(b.pinned_at) - new Date(a.pinned_at);
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setAllPosts(sortedPosts);
      
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  }, [profile, token, isOwnProfile, fetchRatingStats]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfileData();
  }, [fetchProfileData, user, authLoading, navigate]);

  useEffect(() => {
    if (!darkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const goToChat = () => {
    if (!profile || !user) {
      navigate('/auth');
      return;
    }
    navigate('/', { state: { openContact: profile } });
  };

  const handleRate = useCallback(async (score) => {
    if (isOwnProfile || !user || !profile || hasVoted) return;
    
    try {
      const result = await api.rateUser(user.user_id, profile.user_id, score, token);
      if (result.message === 'Rated successfully') {
        setMyVote(score);
        setHasVoted(true);
        await updateStats();
      }
    } catch (e) {
      console.error(e);
      alert("Не удалось сохранить оценку.");
    }
  }, [isOwnProfile, user, profile, hasVoted, token, updateStats]);

  const handleUpdateBio = async () => {
    if (!isOwnProfile || !profile || isUpdatingBio) return;
    
    setIsUpdatingBio(true);
    try {
      const updated = await api.updateProfile({
        userId: user.user_id,
        bio: newBio
      }, token);
      
      setProfile(prev => ({ ...prev, bio: updated.bio }));
      setEditingBio(false);
      await updateStats();
      
    } catch (error) {
      alert("Ошибка сохранения биографии.");
      console.error("Ошибка при обновлении биографии:", error);
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Размер превышает 10 МБ.");
        return;
      }
      setPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImageSelection = () => {
    setPostImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPost = async () => {
    if ((!postText.trim() && !postImage) || !user || !profile) return;
    
    setIsPosting(true);
    try {
      let uploadedImageUrl = null;
      if (postImage) {
        const uploadResult = await api.uploadFile(postImage, 'post', token);
        uploadedImageUrl = uploadResult.url;
      }
      
      const newPost = await api.createPost({
        authorId: profile.user_id,
        authorName: profile.name,
        authorUsername: profile.username,
        authorAvatar: profile.avatar_url,
        content: postText,
        imageUrl: uploadedImageUrl
      }, token);
      
      setAllPosts(prev => {
        const updatedPosts = [newPost, ...prev];
        return updatedPosts.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          if (a.is_pinned && b.is_pinned) {
            return new Date(b.pinned_at) - new Date(a.pinned_at);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });
      setPostText("");
      clearImageSelection();
      await updateStats();
      
    } catch (error) {
      alert("Не удалось опубликовать запись.");
      console.error("Ошибка при создании поста:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleTogglePinPost = useCallback(async (postId, isCurrentlyPinned) => {
    if (!isOwnProfile) return;
    
    try {
      const updated = await api.updatePost(postId, { isPinned: !isCurrentlyPinned }, token);
      
      setAllPosts(prev => {
        const updatedPosts = prev.map(post => 
          post.id === postId 
            ? { ...post, is_pinned: updated.is_pinned, pinned_at: updated.pinned_at }
            : post
        );
        
        return updatedPosts.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          if (a.is_pinned && b.is_pinned) {
            return new Date(b.pinned_at) - new Date(a.pinned_at);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });
      await updateStats();
      
    } catch (error) {
      console.error("Ошибка при закреплении/откреплении поста:", error);
      alert("Не удалось изменить статус поста.");
    }
  }, [isOwnProfile, token, updateStats]);

  const handleDeletePost = useCallback(async (postId) => {
    if (!user || !profile) return;
    if (!window.confirm("Удалить пост? Действие необратимо.")) return;
    
    try {
      await api.deletePost(postId, token);
      setAllPosts(prev => prev.filter(p => p.id !== postId));
      await updateStats();
      
    } catch (error) {
      alert("Сбой при удалении.");
      console.error("Ошибка при удалении поста:", error);
    }
  }, [user, profile, token, updateStats]);

  const handleLikePost = useCallback(async (postId, currentLikes = []) => {
    if (!user) return;
    
    try {
      const result = await api.likePost(postId, token);
      setAllPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: result.likes } : post
      ));
      await updateStats();
      
    } catch (error) {
      console.error("Ошибка при обновлении лайков:", error);
    }
  }, [user, token, updateStats]);

  const handleAddComment = useCallback(async (postId, commentText, replyToComment = null) => {
    if (!user || !commentText.trim() || !currentUserProfile) return;
    
    try {
      const newComment = await api.addComment(postId, {
        authorId: user.user_id,
        authorName: currentUserProfile.name,
        authorAvatar: currentUserProfile.avatar_url,
        content: commentText,
        replyToId: replyToComment?.id,
        replyToAuthor: replyToComment?.author_name
      }, token);
      
      setAllPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const newComments = [...(post.comments || []), newComment];
          return { ...post, comments: newComments, comments_count: newComments.length };
        }
        return post;
      }));
      await updateStats();
      
    } catch (e) {
      console.error("Ошибка при добавлении комментария:", e);
      alert("Не удалось отправить комментарий.");
    }
  }, [user, currentUserProfile, token, updateStats]);

  const handleDeleteComment = useCallback(async (postId, commentId) => {
    if (!user) return;
    if (!window.confirm("Удалить этот комментарий?")) return;
    
    try {
      await api.deleteComment(commentId, token);
      setAllPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const filteredComments = p.comments?.filter(c => c.id !== commentId) || [];
          return { ...p, comments: filteredComments, comments_count: filteredComments.length };
        }
        return p;
      }));
      await updateStats();
      
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить комментарий.");
    }
  }, [user, token, updateStats]);

  const RatingStars = ({ vote, onRate, disabled }) => {
    return (
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button 
            key={star} 
            disabled={disabled} 
            onMouseEnter={() => !disabled && setHoverRating(star)} 
            onMouseLeave={() => setHoverRating(0)} 
            onClick={(e) => { e.preventDefault(); onRate(star); }} 
            className={`transition-all cursor-pointer ${disabled ? 'cursor-default opacity-80' : 'hover:scale-125 active:scale-95'}`}
          >
            <Star 
              size={28} 
              fill={(hoverRating || vote) >= star ? "#fbbf24" : "none"} 
              className={(hoverRating || vote) >= star ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-gray-400 dark:text-slate-600"} 
              strokeWidth={2}
            />
          </button>
        ))}
      </div>
    );
  };

  const PostComponent = ({ post }) => {
    const actualAvatar = post.author_avatar;
    const isPinned = post.is_pinned;
    const [localCommentText, setLocalCommentText] = useState('');
    const [localReplyingTo, setLocalReplyingTo] = useState(null);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const isCommentsOpen = showComments[post.id] || false;
    
    const handleAddCommentLocal = async () => {
      if (!localCommentText.trim() || isAddingComment) return;
      setIsAddingComment(true);
      const text = localCommentText;
      const reply = localReplyingTo;
      setLocalCommentText('');
      setLocalReplyingTo(null);
      await handleAddComment(post.id, text, reply);
      setIsAddingComment(false);
    };
    
    const postDate = isMobile ? formatDateCompact(post.created_at) : formatDateWithTime(post.created_at);
    
    return (
      <div className={`p-4 sm:p-8 bg-gray-50 dark:bg-slate-800/20 border-2 ${isPinned ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-gray-200 dark:border-slate-800/60'} rounded-[2rem] sm:rounded-[3rem] transition-all group shadow-sm hover:shadow-md`}>
        {isPinned && (
          <div className="flex items-center gap-2 mb-4 text-yellow-500">
            <Pin size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Закреплено</span>
          </div>
        )}
        
              {/* ШАПКА ПОСТА — ВСЁ В ОДНУ СТРОЧКУ, ДАТА СПРАВА */}
      <div className="flex items-center gap-3 mb-4">
        <img 
          src={actualAvatar || `https://ui-avatars.com/api/?name=${post.author_name}&background=4f46e5&color=fff&size=128`} 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-gray-300 dark:border-slate-700 shadow-sm flex-shrink-0" 
          alt={post.author_name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${post.author_name}&background=4f46e5&color=fff&size=128`;
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-base sm:text-lg dark:text-white text-gray-900 truncate">{post.author_name}</h4>
              <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold truncate">@{post.author_username}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-gray-500 dark:text-slate-500 text-[10px] font-medium whitespace-nowrap">
                {postDate}
              </span>
              {user && post.author_id === user.user_id && (
                <>
                  <button onClick={() => handleTogglePinPost(post.id, isPinned)} className="text-yellow-500 hover:text-yellow-400 transition-colors p-1 cursor-pointer" title={isPinned ? "Открепить" : "Закрепить"}>
                    {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:text-red-400 transition-colors p-1 cursor-pointer" title="Удалить пост">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
        
        {post.content && <p className="dark:text-white text-gray-800 text-base sm:text-lg mb-6 whitespace-pre-wrap font-bold break-words">{post.content}</p>}
        {post.image_url && (
          <div className="mb-6 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-2 border-gray-200 dark:border-slate-700/50 shadow-md">
            <img 
              src={post.image_url} 
              alt="Прикрепленное медиа" 
              className="w-full h-auto object-cover max-h-[500px]"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="flex items-center gap-4 sm:gap-6 pt-4 border-t border-gray-200 dark:border-slate-700/50">
          <button 
            onClick={() => handleLikePost(post.id, post.likes || [])} 
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all font-bold cursor-pointer text-sm ${post.likes?.includes(user?.user_id) ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
          >
            <Heart size={18} fill={post.likes?.includes(user?.user_id) ? "#ef4444" : "none"} className={post.likes?.includes(user?.user_id) ? "text-red-500" : "text-gray-400 dark:text-slate-400"} />
            <span>{(post.likes || []).length}</span>
          </button>
          <button 
            onClick={() => setShowComments(prev => ({...prev, [post.id]: !prev[post.id]}))} 
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all font-bold cursor-pointer text-sm ${isCommentsOpen ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
          >
            <MessageSquare size={18} />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>
        
        {/* КОММЕНТАРИИ — БЕЗ АНИМАЦИИ, ЧТОБЫ НЕ ДЁРГАЛИСЬ */}
        {isCommentsOpen && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700/50">
            <h5 className="font-black text-sm uppercase text-gray-500 dark:text-slate-400 mb-4">Комментарии</h5>
            
            {localReplyingTo && (
              <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Ответ {localReplyingTo.author_name}
                  </span>
                </div>
                <button onClick={() => setLocalReplyingTo(null)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            )}
            
            {user && (
              <div className="mb-6 flex gap-3">
                <img 
                  src={currentUserProfile?.avatar_url || `https://ui-avatars.com/api/?name=${currentUserProfile?.name || 'User'}&background=4f46e5&color=fff&size=64`} 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-gray-300 dark:border-slate-700 shadow-sm flex-shrink-0" 
                  alt="Ваш аватар"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${currentUserProfile?.name || 'User'}&background=4f46e5&color=fff&size=64`;
                  }}
                />
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text" 
                    placeholder={localReplyingTo ? `ОТВЕТ ${localReplyingTo.author_name.toUpperCase()}...` : "КОММЕНТАРИЙ..."} 
                    value={localCommentText} 
                    onChange={(e) => setLocalCommentText(e.target.value)} 
                    onKeyPress={(e) => { 
                      if (e.key === 'Enter' && e.target.value.trim()) { 
                        handleAddCommentLocal();
                      } 
                    }} 
                    className="flex-1 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 dark:text-white text-gray-900 outline-none focus:border-indigo-500 transition-colors shadow-inner font-medium placeholder:font-black placeholder:uppercase placeholder:text-gray-400 placeholder:tracking-wider placeholder:text-[10px] text-sm min-w-0" 
                  />
                  <button 
                    onClick={handleAddCommentLocal}
                    disabled={isAddingComment}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md cursor-pointer disabled:opacity-50 uppercase text-xs flex-shrink-0"
                  >
                    {isAddingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {(post.comments || []).map(comment => {
                const isReply = comment.reply_to;
                const commentDate = isMobile ? formatDateCompact(comment.created_at) : formatDateWithTime(comment.created_at);
                return (
                  <div key={comment.id} className={`flex gap-2 sm:gap-3 group ${isReply ? 'ml-4 sm:ml-8' : ''}`}>
                    <img 
                      src={comment.author_avatar || `https://ui-avatars.com/api/?name=${comment.author_name}&background=4f46e5&color=fff&size=64`} 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-slate-700 flex-shrink-0" 
                      alt={comment.author_name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${comment.author_name}&background=4f46e5&color=fff&size=64`;
                      }}
                    />
                    <div className="flex-1 bg-gray-100 dark:bg-slate-800/30 rounded-xl p-3 border border-gray-200 dark:border-slate-700/30 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start mb-1 gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm dark:text-white text-gray-900">{comment.author_name}</span>
                          {comment.reply_to_author && (
                            <span className="text-[10px] sm:text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                              <Reply size={10} /> {comment.reply_to_author}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] sm:text-[10px] text-gray-500 dark:text-slate-500 font-medium whitespace-nowrap">
                            {commentDate}
                          </span>
                          {user && (comment.author_id === user.user_id || isOwnProfile) && (
                            <button onClick={() => handleDeleteComment(post.id, comment.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Удалить комментарий">
                              <Trash2 size={12} />
                            </button>
                          )}
                          {user && comment.author_id !== user.user_id && (
                            <button 
                              onClick={() => setLocalReplyingTo(comment)} 
                              className="text-gray-400 dark:text-slate-500 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Ответить"
                            >
                              <Reply size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-medium break-words">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
              {(post.comments || []).length === 0 && (
                <p className="text-center text-gray-500 dark:text-slate-500 text-sm py-4 font-bold">Пока нет комментариев. Будьте первым!</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-500 ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'}`}>
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 relative" />
        </div>
        <span className="text-indigo-500 font-black tracking-widest animate-pulse uppercase text-lg">Загрузка...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-500 ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'}`}>
        <div className="text-red-500 text-xl font-bold mb-4">{error}</div>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer uppercase">Вернуться на главную</button>
      </div>
    );
  }

  if (!profile) return null;

  const totalLikes = allPosts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalComments = allPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-[#020617]' : 'bg-gray-100'}`}>
      <style>{`
        @keyframes gradientShift { 
          0% { background-position: 0% 50%; } 
          50% { background-position: 100% 50%; } 
          100% { background-position: 0% 50%; } 
        }
        .animated-bg { 
          position: fixed; 
          inset: 0; 
          z-index: 0; 
          background: ${darkMode ? 'linear-gradient(-45deg, #020617, #1e1b4b, #0f172a, #020617)' : 'linear-gradient(-45deg, #f3f4f6, #e5e7eb, #d1d5db, #f3f4f6)'}; 
          background-size: 400% 400%; 
          animation: gradientShift 15s ease infinite; 
          opacity: 0.8; 
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
      `}</style>
      <div className="animated-bg" />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="flex justify-between items-center mb-6 sm:mb-12">
          <button onClick={() => navigate(-1)} className="p-3 sm:p-4 bg-white/80 dark:bg-slate-900/50 border-2 border-gray-300 dark:border-slate-800 rounded-2xl sm:rounded-3xl hover:border-indigo-500 transition-all shadow-xl hover:scale-105 cursor-pointer backdrop-blur-sm">
            <ChevronLeft className="dark:text-white text-gray-600" size={24} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          <div className="lg:col-span-4">
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-4 border-gray-200 dark:border-slate-800 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 text-center shadow-2xl">
              <div className="relative w-32 h-32 sm:w-44 sm:h-44 mx-auto mb-4 sm:mb-5">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full" />
                <img 
                  src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=4f46e5&color=fff&size=512`} 
                  className="w-full h-full object-cover rounded-[2rem] sm:rounded-[3rem] border-4 border-gray-100 dark:border-slate-700 relative z-10 shadow-2xl" 
                  alt={profile?.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=4f46e5&color=fff&size=512`;
                  }}
                />
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter dark:text-white text-gray-900">
                {profile?.name || "Пользователь"}
              </h1>
              
              <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm tracking-widest mb-2 opacity-80">@{profile?.username}</p>

              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${checkIsOnline(profile) ? 'bg-green-500 animate-pulse' : 'bg-gray-400 dark:bg-slate-600'}`} />
                <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase ${checkIsOnline(profile) ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {checkIsOnline(profile) ? 'Онлайн' : formatLastSeen(profile?.last_seen)}
                </span>
              </div>

              {!isOwnProfile && user && (
                <div className="bg-gray-50 dark:bg-slate-800/40 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-gray-200 dark:border-slate-700/50 backdrop-blur-sm shadow-inner">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-gray-500 dark:text-slate-400 mb-3 sm:mb-4">{hasVoted ? 'Ваша оценка' : 'Поставить оценку'}</h3>
                  <RatingStars vote={myVote} onRate={handleRate} disabled={hasVoted} />
                  {hasVoted && <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">Вы оценили на {myVote}/5</p>}
                </div>
              )}

              {!isOwnProfile && user && (
                <button onClick={goToChat} className="w-full py-4 sm:py-5 text-white bg-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 sm:gap-3 group hover:scale-[1.02] active:scale-[0.98] mb-6 sm:mb-8 cursor-pointer text-sm sm:text-base">
                  <MessageCircle size={22} fill="currentColor" /> Написать сообщение
                </button>
              )}

              <div className="p-4 sm:p-6 bg-gray-100/80 dark:bg-slate-950/50 rounded-2xl sm:rounded-3xl border-2 border-gray-200 dark:border-slate-800 shadow-inner">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-gray-500 dark:text-slate-400">О себе</h3>
                  {isOwnProfile && !editingBio && (
                    <button onClick={() => {
                      setEditingBio(true);
                      setTimeout(() => bioInputRef.current?.focus(), 100);
                    }} className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer">
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                {editingBio ? (
                  <div className="space-y-3">
                    <textarea 
                      ref={bioInputRef}
                      value={newBio} 
                      onChange={(e) => setNewBio(e.target.value)} 
                      placeholder="РАССКАЖИТЕ О СЕБЕ..." 
                      className="w-full bg-white dark:bg-slate-800/50 border-2 border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-500 dark:text-white resize-none h-32 outline-none focus:border-indigo-500 text-xs sm:text-sm font-bold placeholder:font-black placeholder:text-gray-400 placeholder:tracking-wider" 
                      maxLength={250} 
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateBio} disabled={isUpdatingBio} className="flex-1 text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 uppercase text-xs sm:text-sm">
                        {isUpdatingBio ? <Loader2 size={20} className="animate-spin" /> : <Check size={24} />}
                      </button>
                      <button onClick={() => { setEditingBio(false); setNewBio(profile?.bio || ""); }} className="flex-1 text-white bg-gray-800 hover:bg-gray-700 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer uppercase text-xs sm:text-sm">
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                    {profile?.bio ? profile.bio : (isOwnProfile ? 
                      <span className="text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] sm:text-xs tracking-wider">НАЖМИТЕ НА КАРАНДАШ, ЧТОБЫ ДОБАВИТЬ ИНФОРМАЦИЮ О СЕБЕ</span> : 
                      <span className="text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] sm:text-xs tracking-wider">ПОЛЬЗОВАТЕЛЬ ЕЩЕ НЕ ДОБАВИЛ ИНФОРМАЦИЮ О СЕБЕ</span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="mt-4 sm:mt-6 space-y-3">
                <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400 justify-center">
                  <Calendar size={16} />
                  <span className="text-xs sm:text-sm font-medium">Зарегистрирован: {new Date(profile?.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <CompactRatingChart 
                stats={ratingStats}
                total={ratingStats.total}
                average={ratingStats.average}
                darkMode={darkMode}
              />
            )}
          </div>
          
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center shadow-xl hover:border-indigo-500/30 transition-colors">
                <Star size={24} className="text-yellow-500 mb-1 sm:mb-2" />
                <span className="text-xl sm:text-2xl font-black dark:text-white text-gray-900">{profile?.rating ? Number(profile.rating).toFixed(1) : '0.0'}</span>
                <span className="text-[10px] sm:text-xs font-black uppercase text-gray-500 dark:text-slate-500 text-center">Рейтинг</span>
                <span className="text-[8px] sm:text-[10px] font-medium text-gray-400 dark:text-slate-600">({profile?.rating_count || 0})</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center shadow-xl hover:border-indigo-500/30 transition-colors">
                <MessageCircle size={24} className="text-blue-500 mb-1 sm:mb-2" />
                <span className="text-xl sm:text-2xl font-black dark:text-white text-gray-900">{allPosts.length}</span>
                <span className="text-[10px] sm:text-xs font-black uppercase text-gray-500 dark:text-slate-500 text-center">Посты</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center shadow-xl hover:border-indigo-500/30 transition-colors">
                <Heart size={24} className="text-red-500 mb-1 sm:mb-2" />
                <span className="text-xl sm:text-2xl font-black dark:text-white text-gray-900">{totalLikes}</span>
                <span className="text-[10px] sm:text-xs font-black uppercase text-gray-500 dark:text-slate-500 text-center">Лайки</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center shadow-xl hover:border-indigo-500/30 transition-colors">
                <MessageSquare size={24} className="text-purple-500 mb-1 sm:mb-2" />
                <span className="text-xl sm:text-2xl font-black dark:text-white text-gray-900">{totalComments}</span>
                <span className="text-[10px] sm:text-xs font-black uppercase text-gray-500 dark:text-slate-500 text-center">Комменты</span>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-4 border-gray-200 dark:border-slate-800 rounded-[3rem] sm:rounded-[4rem] p-6 sm:p-10 shadow-2xl">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                <div className="p-3 sm:p-4 bg-indigo-600 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-indigo-500/40">
                  <Zap size={24} fill="currentColor" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter dark:text-white text-gray-900">Стена публикаций</h2>
              </div>
              
              {isOwnProfile && (
                <div className="mb-6 sm:mb-10 p-4 sm:p-6 bg-gray-50 dark:bg-slate-800/40 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-gray-200 dark:border-slate-700/50 shadow-inner">
                  <textarea 
                    value={postText} 
                    onChange={(e) => setPostText(e.target.value)} 
                    placeholder="ЧТО У ВАС НОВОГО?" 
                    className="w-full bg-transparent border-none outline-none dark:text-white text-gray-900 font-bold text-base sm:text-lg resize-none mb-4 h-20 sm:h-24 placeholder:text-gray-400 dark:placeholder:text-slate-600 placeholder:font-black placeholder:uppercase placeholder:tracking-wider placeholder:text-sm sm:placeholder:text-base" 
                    maxLength={1000} 
                  />
                  <AnimatePresence>
                    {imagePreview && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative w-full mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-gray-300 dark:border-slate-700 shadow-md">
                        <img src={imagePreview} className="w-full h-48 sm:h-64 object-cover" alt="Предпросмотр медиа" />
                        <button onClick={clearImageSelection} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 bg-black/60 rounded-xl text-white hover:bg-red-500 transition-colors backdrop-blur-md cursor-pointer" title="Удалить фото">
                          <X size={18} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-gray-500 dark:text-slate-500 text-xs sm:text-sm font-medium">{postText.length}/1000</span>
                      <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1.5 sm:gap-2 font-bold transition-colors cursor-pointer uppercase text-xs sm:text-sm">
                        <ImageIcon size={18} /> Изображение
                      </button>
                      <input type="file" hidden ref={fileInputRef} onChange={handleImageSelect} accept="image/*" />
                    </div>
                    <button onClick={createPost} disabled={isPosting || (!postText.trim() && !postImage)} className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                      {isPosting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {isPosting ? "Обработка..." : "Опубликовать"}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-6 sm:space-y-8">
                {allPosts.map(post => (
                  <PostComponent key={post.id} post={post} />
                ))}
                
                {allPosts.length === 0 && (
                  <div className="p-12 sm:p-20 border-4 border-dashed border-gray-300 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem] shadow-inner bg-gray-50 dark:bg-transparent">
                    <p className="font-black uppercase text-center text-gray-400 dark:text-slate-600 tracking-[0.2em] sm:tracking-[0.3em] text-sm sm:text-base">
                      {isOwnProfile ? "У вас пока нет публикаций" : "Пользователь еще ничего не публиковал"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
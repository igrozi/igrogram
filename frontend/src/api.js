const API_URL = 'https://5250-2001-41d0-2005-100-00-13d7.ngrok-free.app';

// Базовые заголовки с обходом ngrok
const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // ===== АВТОРИЗАЦИЯ =====
  
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.message || 'Login failed' };
    }
    
    return { success: true, ...data };
  },

  register: async (userData) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.message || 'Registration failed' };
    }
    
    return { success: true, ...data };
  },

  verify: async (token) => {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return { success: false };
    }
    
    const data = await response.json();
    return { success: true, ...data };
  },

  logout: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ userId }),
    });
    
    return response.json();
  },

  // ===== ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ =====
  
  getUsers: async (token) => {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  getProfile: async (username, token) => {
    const response = await fetch(`${API_URL}/api/users/profile/${username}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  },

  updateProfile: async (profileData, token) => {
    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    return response.json();
  },

  searchUsers: async (query, token) => {
    const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  // ===== РЕЙТИНГ =====
  
  rateUser: async (raterId, ratedUserId, score, token) => {
    const response = await fetch(`${API_URL}/api/users/rate`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ raterId, ratedUserId, score }),
    });
    
    return response.json();
  },

  getRatingStats: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/ratings/stats/${userId}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return { stats: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, total: 0, average: 0 };
    }
    
    return response.json();
  },

  getVoters: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/ratings/voters/${userId}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  // ===== ПОСТЫ =====
  
  getUserPosts: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/posts/user/${userId}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  createPost: async (postData, token) => {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(postData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    
    return response.json();
  },

  updatePost: async (postId, updateData, token) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update post');
    }
    
    return response.json();
  },

  deletePost: async (postId, token) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete post');
    }
    
    return response.json();
  },

  likePost: async (postId, token) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to like post');
    }
    
    return response.json();
  },

  // ===== КОММЕНТАРИИ =====
  
  addComment: async (postId, commentData, token) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(commentData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add comment');
    }
    
    return response.json();
  },

  deleteComment: async (commentId, token) => {
    const response = await fetch(`${API_URL}/api/posts/comments/${commentId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
    
    return response.json();
  },

  // ===== СООБЩЕНИЯ =====
  
  getMessages: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/messages/${userId}`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  sendMessage: async (messageData, token) => {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(messageData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  },

  markMessagesAsRead: async (senderId, token) => {
    const response = await fetch(`${API_URL}/api/messages/read/${senderId}`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to mark messages as read');
    return response.json();
  },

  deleteMessage: async (messageId, token) => {
    const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
    
    return response.json();
  },

  getChats: async (token) => {
    const response = await fetch(`${API_URL}/api/messages/chats/list`, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  // ===== ЗАГРУЗКА ФАЙЛОВ =====
  
  uploadFile: async (file, type, token) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/upload?type=${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload file');
    }
    
    return response.json();
  },

  // ===== УДАЛЕНИЕ АККАУНТА =====
  
  verifyPassword: async (userId, password, token) => {
    const response = await fetch(`${API_URL}/api/users/verify-password`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ userId, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify password');
    }
    
    return response.json();
  },

  deleteAccount: async (userId, token) => {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }
    
    return response.json();
  },

  // ===== СМЕНА ПАРОЛЯ =====
  changePassword: async (passwordData, token) => {
    const response = await fetch(`${API_URL}/api/users/change-password`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(passwordData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to change password');
    }
    return response.json();
  },
};

export default api;
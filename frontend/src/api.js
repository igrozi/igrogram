const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new Error(errorMessage);
  }
  const data = await response.json();
  return data;
};

export const api = {
  async register(data) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },
  
  async verify(token) {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async logout(userId, token) {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });
    return handleResponse(res);
  },
  
  async getUsers(token) {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  },
  
  async getProfile(username, token) {
    const res = await fetch(`${API_URL}/api/users/profile/${username}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async updateProfile(data, token) {
    const res = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async rateUser(raterId, ratedUserId, score, token) {
    const res = await fetch(`${API_URL}/api/users/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ raterId, ratedUserId, score })
    });
    return handleResponse(res);
  },
  
  async searchUsers(query, token) {
    const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  },
  
  async getMessages(userId, token) {
    const res = await fetch(`${API_URL}/api/messages/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  },
  
  async sendMessage(data, token) {
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async markAsRead(senderId, token) {
    const res = await fetch(`${API_URL}/api/messages/read/${senderId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async deleteMessage(messageId, token) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async getChats(token) {
    const res = await fetch(`${API_URL}/api/messages/chats/list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  },
  
  async getUserPosts(userId, token) {
    const res = await fetch(`${API_URL}/api/posts/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  },
  
  async createPost(data, token) {
    const res = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async updatePost(postId, data, token) {
    const res = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async deletePost(postId, token) {
    const res = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async likePost(postId, token) {
    const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async addComment(postId, data, token) {
    const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async deleteComment(commentId, token) {
    const res = await fetch(`${API_URL}/api/posts/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  
  async uploadFile(file, type, token) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/api/upload?type=${type}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return handleResponse(res);
  }
};
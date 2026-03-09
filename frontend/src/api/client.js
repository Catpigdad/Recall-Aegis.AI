import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// Attach the JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth routes
export const checkEmail = (email) =>
  api.post('/auth/login/check-email', { email });

export const checkName = (email, assistantName) =>
  api.post('/auth/login/check-name', { email, assistantName });

export const verifyConversation = (stepToken, userAnswer) =>
  api.post('/auth/login/verify-conversation', { stepToken, userAnswer });

export const signup = (email, assistantName, initialMessage) =>
  api.post('/auth/signup', { email, assistantName, initialMessage });

// Chat routes
export const sendMessage = (message) =>
  api.post('/chat/message', { message });

export const endSession = () =>
  api.post('/chat/end-session');

export const getChatHistory = () =>
  api.get('/chat/history');

export default api;

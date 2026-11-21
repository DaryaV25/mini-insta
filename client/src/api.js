import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const isCancel = axios.isCancel;

export const getErrorMessage = (err) => {
  if (err.response) {
    const message = err.response.data?.error;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
    return `Ошибка сервера (${err.response.status})`;
  }
  if (err.request) {
    return "Сервер недоступен. Проверьте, что он запущен";
  }
  return err.message || "Неизвестная ошибка";
};

export const fetchPhotos = (params, signal) =>
  api.get("/photos", { params, signal });
export const fetchPhoto = (id) => api.get(`/photos/${id}`);
export const addPhoto = (photo) => api.post("/photos", photo);
export const updatePhoto = (id, photo) => api.put(`/photos/${id}`, photo);
export const deletePhoto = (id) => api.delete(`/photos/${id}`);

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const register = (email, password, role = "user") =>
  api.post("/auth/register", { email, password, role });

export const getProfile = () => api.get("/profile");

export const fetchRelatedPhotos = (id) => api.get(`/photos/${id}/related`);
export const fetchLikeStatus = (id) => api.get(`/photos/${id}/like`);
export const toggleLike = (id) => api.post(`/photos/${id}/like`);
export const fetchComments = (id) => api.get(`/photos/${id}/comments`);
export const addComment = (id, text) =>
  api.post(`/photos/${id}/comments`, { text });
export const updateComment = (id, commentId, text) =>
  api.put(`/photos/${id}/comments/${commentId}`, { text });
export const deleteComment = (id, commentId) =>
  api.delete(`/photos/${id}/comments/${commentId}`);

import axios from 'axios';
import { getToken, clearToken } from './auth';

const BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach token to every request ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── 401 → clear token and redirect to login ───────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/';   // landing triggers login
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────
export const login    = (data) => api.post('/login',    data);
export const register = (data) => api.post('/register', data);

// ── Users (admin only) ─────────────────────────────────────────
export const getUsers    = ()         => api.get('/users/');
export const createUser  = (data)     => api.post('/users/', data);
export const updateUser  = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser  = (id)       => api.delete(`/users/${id}`);

// ── Sessions ──────────────────────────────────────────────────
export const getSessions    = ()         => api.get('/sessions');
export const createSession  = (data)     => api.post('/sessions', data);
export const updateSession  = (id, data) => api.put(`/sessions/${id}`, data);

// ── Trainer Availability ─────────────────────────────────────
export const getTrainerAvailability = ()     => api.get('/trainer_availability/');
export const addTrainerAvailability = (data) => api.post('/trainer_availability/', data);

// ── Memberships ───────────────────────────────────────────────
export const getMemberships    = ()     => api.get('/memberships');          // admin only
export const getMyMembership   = ()     => api.get('/memberships/me');       // client: own membership
export const createMembership  = (data) => api.post('/memberships', data);

// ── Membership Plans ─────────────────────────────────────────
export const getMembershipPlans       = ()     => api.get('/membership_plans/');
export const getMembershipPlansPublic = ()     => axios.get(`${BASE_URL}/membership_plans/`); // no auth needed

// ── Attendance ────────────────────────────────────────────────
export const getAttendance  = ()     => api.get('/attendance');
export const postAttendance = (data) => api.post('/attendance', data);

// ── Chat ──────────────────────────────────────────────────────
export const postChat = (content) => api.post('/chat', { content });

export default api;

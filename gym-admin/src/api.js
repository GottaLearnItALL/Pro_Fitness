import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Users (clients & trainers) ─────────────────────────────────
export const getUsers = () => api.get('/users/');
export const createUser = (data) => api.post('/users/', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ── Sessions ──────────────────────────────────────────────────
export const getSessions = () => api.get('/sessions');
export const createSession = (data) => api.post('/sessions', data);

// ── Trainer Availability ─────────────────────────────────────
export const getTrainerAvailability = () => api.get('/trainer_availability/');
export const addTrainerAvailability = (data) => api.post('/trainer_availability/', data);

// ── Memberships ───────────────────────────────────────────────
export const getMemberships = () => api.get('/memberships');
export const createMembership = (data) => api.post('/memberships', data);

// ── Membership Plans ─────────────────────────────────────────
export const getMembershipPlans = () => api.get('/membership_plans/');

// ── Attendance ────────────────────────────────────────────────
export const getAttendance = () => api.get('/attendance');

export default api;

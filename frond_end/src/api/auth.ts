import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  password2: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface ScoreRecord {
  id: number;
  username: string;
  user_email: string;
  score: number;
  date: string;
  created_at: string;
}

export const registerUser = (data: RegisterPayload) =>
  API.post<AuthResponse>('/users/register/', data);

export const loginUser = (data: { email: string; password: string }) =>
  API.post<AuthResponse>('/users/login/', data);

export const loginAdmin = (data: { email: string; password: string }) =>
  API.post<AuthResponse>('/users/admin/login/', data);

// ── Score endpoints ───────────────────────────────────────────────────────
export const addScore = (data: { score: number; date: string }) =>
  API.post('/scores/add/', data);

export const getMyScores = () =>
  API.get<ScoreRecord[]>('/scores/my-scores/');

// ── Subscription endpoints ────────────────────────────────────────────────
export interface SubscriptionInfo {
  id: number;
  username: string;
  plan: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  days_left: number;
}

export const getMySubscription = () =>
  API.get<SubscriptionInfo>('/subscriptions/me/');

export const createOrder = (plan: string) =>
  API.post<{
    order_id: string; amount: number; currency: string;
    key_id: string; plan: string; plan_label: string;
    name: string; description: string;
  }>('/subscriptions/create-order/', { plan });

export const verifyPayment = (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: string;
}) => API.post('/subscriptions/verify-payment/', data);

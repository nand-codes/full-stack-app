import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to requests, but skip public auth endpoints
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PUBLIC_ENDPOINTS = [
  '/users/register/', '/users/login/', '/users/admin/login/',
  '/charities/', '/draws/latest/', '/charities/admin/' // admin login/registration are also here but let's be specific
];

API.interceptors.request.use((config) => {
  // Public GET endpoints (e.g. public list of charities) or specific auth endpoints
  const isPublicAuth = ['/users/register/', '/users/login/', '/users/admin/login/'].some(ep => config.url === ep);
  const isPublicGet  = (config.method === 'get' || config.method === 'GET') && ['/charities/', '/draws/latest/'].some(ep => config.url === ep);
  
  if (!isPublicAuth && !isPublicGet) {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
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

// ── Charity endpoints ──────────────────────────────────────────────────────
export interface CharityEventPhoto {
  id: string;
  image: string;
  caption: string;
  uploaded_at: string;
}

export interface CharityEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  is_published: boolean;
  photos: CharityEventPhoto[];
  created_at: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  image: string | null;
  website_url: string;
  is_featured: boolean;
  is_active: boolean;
  events: CharityEvent[];
}

export interface UserCharitySelection {
  charity: Charity | null;
  contribution_percentage: number;
  updated_at?: string;
}

export const listCharities = () =>
  API.get<Charity[]>('/charities/');

export const getMyCharity = () =>
  API.get<UserCharitySelection>('/charities/my-charity/');

export const selectMyCharity = (data: { charity_id: string; contribution_percentage: number }) =>
  API.post<UserCharitySelection>('/charities/my-charity/', data);

// ── Draw endpoints ─────────────────────────────────────────────────────────
export interface DrawResult {
  id: string;
  username: string;
  matched_numbers: number[];
  match_count: number;
  prize_tier: 'none' | '3_match' | '4_match' | '5_match';
  prize_amount: string;
  verification_status: 'none' | 'pending' | 'submitted' | 'approved' | 'rejected';
  payment_status: 'none' | 'pending' | 'paid';
  admin_notes: string;
  proof_image: string | null;
}

export interface MonthlyDraw {
  id: string;
  month: number;
  year: number;
  month_name: string;
  draw_mode: 'random' | 'algorithmic';
  drawn_numbers: number[];
  status: 'pending' | 'simulated' | 'published';
  jackpot_amount: string;
  effective_jackpot: string;
  jackpot_rolled_over: boolean;
  entry_count: number;
  winner_count: number;
  published_at: string | null;
  notes: string;
  my_entry: number[] | null;
  my_result: DrawResult | null;
  results: DrawResult[];
}

export interface MyDrawResult {
  result_id: string;
  draw_id: string;
  month: number;
  year: number;
  drawn_numbers: number[];
  my_numbers: number[];
  matched: number[];
  match_count: number;
  prize_tier: 'none' | '3_match' | '4_match' | '5_match';
  prize_amount: string;
  published_at: string | null;
  verification_status: 'none' | 'pending' | 'submitted' | 'approved' | 'rejected';
  payment_status: 'none' | 'pending' | 'paid';
}

export const getDraws       = () => API.get<MonthlyDraw[]>('/draws/');
export const getLatestDraw  = () => API.get<MonthlyDraw>('/draws/latest/');
export const getDrawDetail  = (id: string) => API.get<MonthlyDraw>(`/draws/${id}/`);
export const getMyDrawResults = () => API.get<MyDrawResult[]>('/draws/my-results/');
export const submitDrawEntry = (drawId: string, numbers: number[]) =>
  API.post(`/draws/${drawId}/enter/`, { numbers });

export const uploadDrawProof = (resultId: string, file: File) => {
  const formData = new FormData();
  formData.append('proof_image', file);
  return API.post(`/draws/results/${resultId}/upload-proof/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Admin endpoints ────────────────────────────────────────────────────────
export interface AdminAnalytics {
  total_users: number;
  total_prize_pool: number;
  total_draws: number;
  published_draws: number;
  charity_supporters: number;
}

export const getAdminAnalytics = () => API.get<AdminAnalytics>('/users/admin/analytics/');
export const getAdminAllWinners = () => API.get<DrawResult[]>('/draws/admin/winners/');
export const updateWinnerStatus = (resultId: string, data: { verification_status?: string; payment_status?: string; admin_notes?: string }) =>
  API.patch(`/draws/admin/results/${resultId}/review/`, data);

export const getAdminUsers = () => API.get<any[]>('/users/admin/users/');
export const getAdminUser = (id: string) => API.get<any>(`/users/admin/users/${id}/`);
export const updateAdminUser = (id: string, data: any) => API.patch<any>(`/users/admin/users/${id}/`, data);

export const getAdminDraws = () => API.get<MonthlyDraw[]>('/draws/');
export const createAdminDraw = (data: any) => API.post<MonthlyDraw>('/draws/admin/create/', data);
export const getAdminDrawDetail = (id: string) => API.get<MonthlyDraw>(`/draws/admin/${id}/`);
export const simulateAdminDraw = (id: string) => API.post<any>(`/draws/admin/${id}/run/`);
export const publishAdminDraw = (id: string) => API.post<any>(`/draws/admin/${id}/publish/`);

export const getAdminCharities = () => API.get<Charity[]>('/charities/admin/charities/');
export const createAdminCharity = (data: any) => API.post<Charity>('/charities/admin/charities/', data);
export const getAdminCharity = (slug: string) => API.get<Charity>(`/charities/admin/charities/${slug}/`);
export const updateAdminCharity = (slug: string, data: any) => API.put<Charity>(`/charities/admin/charities/${slug}/`, data);
export const deleteAdminCharity = (slug: string) => API.delete(`/charities/admin/charities/${slug}/`);

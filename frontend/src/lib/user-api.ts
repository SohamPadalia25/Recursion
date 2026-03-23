import type { UserRole } from "@/auth/AuthContext";
import { apiFetch, API_BASE_URL } from "./api-client";

// `VITE_API_BASE_URL` may be configured as either:
// - http://localhost:8000
// - http://localhost:8000/api/v1
// Normalize so we can safely append v1 routes without duplicating `/api/v1`.
const API_V1_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "") + "/api/v1";

export type BackendUser = {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  avatar?: string;
  coverImage?: string;
  role: UserRole;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginData = {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
};

export async function loginUser(payload: {
  username?: string;
  email?: string;
  password: string;
}): Promise<LoginData> {
  return apiFetch<LoginData>(`${API_V1_BASE_URL}/users/login`, { method: "POST", body: payload });
}

export async function registerUser(payload: {
  fullname: string;
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}): Promise<BackendUser> {
  return apiFetch<BackendUser>(`${API_V1_BASE_URL}/users/register`, { method: "POST", body: payload });
}

export async function getCurrentUser(token: string): Promise<BackendUser> {
  return apiFetch<BackendUser>(`${API_V1_BASE_URL}/users/current-user`, { method: "GET", token });
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch<{ accessToken: string; refreshToken: string }>(`${API_V1_BASE_URL}/users/refresh-token`, {
    method: "POST",
    body: { refreshToken },
  });
}

export async function logoutUser(token: string): Promise<void> {
  await apiFetch<unknown>(`${API_V1_BASE_URL}/users/logout`, { method: "POST", token });
}

export async function updateUserAccountDetails(
  token: string,
  payload: { fullname?: string; email?: string; bio?: string },
): Promise<BackendUser> {
  return apiFetch<BackendUser>(`${API_V1_BASE_URL}/users/update-account`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function getMyLearning(token: string): Promise<
  Array<{
    _id: string;
    course: {
      _id: string;
      title: string;
      thumbnail?: string;
      category?: string;
      level?: string;
      totalDuration?: number;
      instructor?: { _id?: string; fullname?: string; avatar?: string };
    };
    enrolledAt?: string;
    isCompleted?: boolean;
    completionPercentage?: number;
  }>
> {
  return apiFetch(`${API_V1_BASE_URL}/users/my-learning`, { method: "GET", token });
}

export type BadgeType =
  | "first_quiz"
  | "quiz_master"
  | "streak_7"
  | "streak_30"
  | "module_complete"
  | "course_complete"
  | "fast_learner"
  | "top_performer"
  | "helpful_peer";

export async function getMyBadges(token: string): Promise<
  Array<{
    _id: string;
    type: BadgeType | string;
    awardedAt?: string;
    metadata?: Record<string, unknown>;
    course?: { _id?: string; title?: string; thumbnail?: string };
  }>
> {
  return apiFetch(`${API_V1_BASE_URL}/users/my-badges`, { method: "GET", token });
}

export async function getAdminStats(token: string): Promise<{
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  pendingApproval: number;
  totalEnrollments: number;
  newUsers: number;
  flaggedChats: number;
  flaggedReviews: number;
  enrollmentTrend: Array<{ _id: string; count: number }>;
}> {
  return apiFetch(`${API_V1_BASE_URL}/admin/stats`, { method: "GET", token });
}

export async function getAdminUsers(token: string, params: { role?: string; search?: string; page?: number; limit?: number }): Promise<{
  users: BackendUser[];
  total: number;
  page: number;
}> {
  const qs = new URLSearchParams();
  if (params.role) qs.set("role", params.role);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return apiFetch(`${API_V1_BASE_URL}/admin/users${query}`, { method: "GET", token });
}

export async function changeUserRole(token: string, userId: string, role: UserRole): Promise<BackendUser> {
  return apiFetch<BackendUser>(`${API_V1_BASE_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: { role },
  });
}

export async function getUserDirectory(
  token: string,
  params?: { role?: UserRole | "student" | "instructor" | "admin"; search?: string; limit?: number },
): Promise<Array<{ _id: string; fullname: string; username: string; email: string; role: UserRole; avatar?: string }>> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set("role", params.role);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return apiFetch(`${API_V1_BASE_URL}/users/directory${query}`, { method: "GET", token });
}


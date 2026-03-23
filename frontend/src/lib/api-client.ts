export type ApiEnvelope<T> = {
    success: boolean;
    statusCode: number;
    data: T;
    message: string;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const API_V1_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "") + "/api/v1";
const API_ROOT_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "");
export const AUTH_STORAGE_KEY = "dei-auth-user";
export const AUTH_USER_STORAGE_KEY = AUTH_STORAGE_KEY;

type ApiFetchOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
};

export async function apiFetch<T>(
    url: string,
    { method = "GET", body, token, headers }: ApiFetchOptions = {},
): Promise<T> {
    const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers || {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const raw = await res.text();
        throw new Error(`Unexpected response from API (${res.status}). ${raw.slice(0, 200)}`);
    }

    const json = (await res.json()) as ApiEnvelope<T>;
    if (!res.ok || !json.success) {
        throw new Error(json?.message || `Request failed (${res.status})`);
    }

    return json.data;
}

type ApiRequestInit = Omit<RequestInit, "body"> & {
    body?: unknown;
};

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const token = localStorage.getItem("dei-auth-access-token") || undefined;
    const url = path.startsWith("http")
        ? path
        : path.startsWith("/api/")
            ? `${API_ROOT_BASE_URL}${path}`
            : `${API_BASE_URL}${path}`;

    return apiFetch<T>(url, {
        method: (init.method as ApiFetchOptions["method"]) || "GET",
        body: init.body,
        token,
        headers: (init.headers as Record<string, string> | undefined) || undefined,
    });
}


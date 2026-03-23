export const AUTH_USER_STORAGE_KEY = "dei-auth-user";
export const AUTH_TOKEN_STORAGE_KEY = "dei-auth-access-token";

export type ApiEnvelope<T> = {
    success: boolean;
    statusCode: number;
    data: T;
    message: string;
};

type ApiRequestInit = Omit<RequestInit, "body"> & {
    body?: unknown;
};

const API_BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000";

export function getApiBaseUrl() {
    return API_BASE_URL;
}

export function getAccessToken() {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string | null) {
    if (!token) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        return;
    }
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthStorage() {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function toErrorMessage(fallback: string, payload: unknown) {
    if (payload && typeof payload === "object" && "message" in payload) {
        const maybeMessage = (payload as { message?: unknown }).message;
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
            return maybeMessage;
        }
    }
    return fallback;
}

export async function apiRequestEnvelope<T>(
    path: string,
    init: ApiRequestInit = {}
): Promise<ApiEnvelope<T>> {
    const token = getAccessToken();
    const headers = new Headers(init.headers || {});

    if (!headers.has("Content-Type") && init.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        headers,
        body:
            init.body === undefined || typeof init.body === "string" || init.body instanceof FormData
                ? (init.body as BodyInit | null | undefined)
                : JSON.stringify(init.body),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
        throw new Error(toErrorMessage(`Request failed with ${response.status}`, payload));
    }

    if (!payload) {
        throw new Error("Expected JSON response from backend API");
    }

    return payload as ApiEnvelope<T>;
}

export async function apiRequest<T>(
    path: string,
    init: ApiRequestInit = {}
): Promise<T> {
    const envelope = await apiRequestEnvelope<T>(path, init);
    return envelope.data;
}

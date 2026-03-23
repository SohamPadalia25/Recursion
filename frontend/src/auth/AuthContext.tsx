import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
    apiRequest,
    AUTH_TOKEN_STORAGE_KEY,
    AUTH_USER_STORAGE_KEY,
    clearAuthStorage,
    setAccessToken,
} from "@/lib/api-client";

export type UserRole = "student" | "instructor" | "admin";

type AuthUser = {
    _id: string;
    name: string;
    username?: string;
    email: string;
    role: UserRole;
};

type LoginPayload = {
    username?: string;
    email?: string;
    password: string;
};

type SignupPayload = {
    fullname: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
};

type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    signup: (payload: SignupPayload) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(raw: any): AuthUser {
    return {
        _id: raw?._id,
        name: raw?.fullname || raw?.name || raw?.username || "User",
        username: raw?.username,
        email: raw?.email || "",
        role: raw?.role || "student",
    };
}

export function getHomePathByRole(role: UserRole) {
    if (role === "instructor") return "/instructor";
    if (role === "admin") return "/admin";
    return "/student";
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored) as AuthUser;
            if (parsed?._id && parsed?.email && parsed?.name && parsed?.role) {
                setUser(parsed);
            }
        } catch {
            clearAuthStorage();
        }
    }, []);

    const saveUser = (payload: AuthUser) => {
        setUser(payload);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload));
    };

    const login = async (payload: LoginPayload) => {
        const data = await apiRequest<{ user: any; accessToken: string }>("/api/v1/users/login", {
            method: "POST",
            body: payload,
        });

        if (data?.accessToken) {
            setAccessToken(data.accessToken);
        }

        const authUser = normalizeUser(data.user);
        saveUser(authUser);
    };

    const signup = async (payload: SignupPayload) => {
        await apiRequest("/api/v1/users/register", {
            method: "POST",
            body: payload,
        });
    };

    const logout = async () => {
        try {
            if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
                await apiRequest("/api/v1/users/logout", { method: "POST" });
            }
        } catch {
            // Ignore API logout errors and clear client-side auth state.
        }

        setUser(null);
        clearAuthStorage();
    };

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            login,
            signup,
            logout,
        }),
        [user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

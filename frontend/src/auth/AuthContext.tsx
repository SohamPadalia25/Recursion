import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BackendUser } from "@/lib/user-api";
import { getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser } from "@/lib/user-api";

export type UserRole = "student" | "instructor" | "admin";

type AuthUser = {
    _id?: string;
    username?: string;
    name: string; // maps to backend `fullname`
    email: string;
    role: UserRole;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    accessToken?: string;
    refreshToken?: string;
};

type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (payload: { username?: string; email?: string; password: string }) => Promise<void>;
    signup: (payload: { fullname: string; username: string; email: string; password: string; role: UserRole }) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
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

        (async () => {
            try {
                const parsed = JSON.parse(stored) as AuthUser;
                if (!parsed?.email || !parsed?.name || !parsed?.role) {
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    return;
                }

                setUser(parsed);

                // Hydrate from backend using stored access token (preferred),
                // else fall back to refresh token (if present).
                if (parsed?.accessToken) {
                    try {
                        const backendUser = await getCurrentUser(parsed.accessToken);
                        const hydrated: AuthUser = mapBackendUserToAuthUser(backendUser, parsed.accessToken, parsed.refreshToken);
                        setUser(hydrated);
                        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(hydrated));
                    } catch (err) {
                        // If access token is expired, attempt refresh.
                        if (parsed?.refreshToken) {
                            const tokens = await refreshAccessToken(parsed.refreshToken);
                            const backendUser = await getCurrentUser(tokens.accessToken);
                            const hydrated: AuthUser = mapBackendUserToAuthUser(backendUser, tokens.accessToken, tokens.refreshToken);
                            setUser(hydrated);
                            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(hydrated));
                        }
                    }
                }
            } catch {
                localStorage.removeItem(AUTH_STORAGE_KEY);
            }
        })();
    }, []);

    function mapBackendUserToAuthUser(backendUser: BackendUser, accessToken?: string, refreshToken?: string): AuthUser {
        return {
            _id: backendUser._id,
            username: backendUser.username,
            name: backendUser.fullname,
            email: backendUser.email,
            role: backendUser.role,
            avatar: backendUser.avatar,
            coverImage: backendUser.coverImage,
            bio: backendUser.bio,
            accessToken,
            refreshToken,
        };
    }

    const persistUser = (payload: AuthUser) => {
        setUser(payload);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload));
    };

    const logout = async () => {
        const token = user?.accessToken;
        try {
            if (token) await logoutUser(token);
        } catch {
            // Even if backend logout fails, clear local auth state.
        } finally {
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    };

    const refreshUser: AuthContextValue["refreshUser"] = async () => {
        const accessToken = user?.accessToken;
        const refreshToken = user?.refreshToken;
        if (!accessToken) return;

        try {
            const backendUser = await getCurrentUser(accessToken);
            persistUser(mapBackendUserToAuthUser(backendUser, accessToken, refreshToken));
        } catch {
            if (!refreshToken) return;
            const tokens = await refreshAccessToken(refreshToken);
            const backendUser = await getCurrentUser(tokens.accessToken);
            persistUser(mapBackendUserToAuthUser(backendUser, tokens.accessToken, tokens.refreshToken));
        }
    };

    const login: AuthContextValue["login"] = async (payload) => {
        const { accessToken, refreshToken, user: backendUser } = await loginUser(payload);
        persistUser(mapBackendUserToAuthUser(backendUser, accessToken, refreshToken));
    };

    const signup: AuthContextValue["signup"] = async (payload) => {
        await registerUser(payload);
        // Register does not log you in, so login immediately to hydrate tokens.
        await loginUser({ username: payload.username, email: payload.email, password: payload.password }).then(
            ({ accessToken, refreshToken, user: backendUser }) => {
                persistUser(mapBackendUserToAuthUser(backendUser, accessToken, refreshToken));
            },
        );
    };

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            login,
            signup,
            logout,
            refreshUser,
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

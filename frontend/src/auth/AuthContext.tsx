import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UserRole = "student" | "instructor" | "admin";

type AuthUser = {
    name: string;
    email: string;
    role: UserRole;
};

type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (payload: AuthUser) => void;
    signup: (payload: AuthUser) => void;
    logout: () => void;
};

const AUTH_STORAGE_KEY = "dei-auth-user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getHomePathByRole(role: UserRole) {
    if (role === "instructor") return "/instructor";
    if (role === "admin") return "/admin";
    return "/student";
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored) as AuthUser;
            if (parsed?.email && parsed?.name && parsed?.role) {
                setUser(parsed);
            }
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }, []);

    const saveUser = (payload: AuthUser) => {
        setUser(payload);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            login: saveUser,
            signup: saveUser,
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

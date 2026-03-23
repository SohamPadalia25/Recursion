import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getHomePathByRole, type UserRole, useAuth } from "./AuthContext";

type ProtectedRouteProps = {
    children: ReactElement;
    allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={getHomePathByRole(user.role)} replace />;
    }

    return children;
}

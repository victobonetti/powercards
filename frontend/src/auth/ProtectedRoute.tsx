
import { useAuth } from "@/auth/AuthProvider";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
    const auth = useAuth();

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (!auth.isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <Outlet />;
};

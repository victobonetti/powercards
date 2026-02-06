
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    token: string | null;
    error: string | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AppAuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        // Optional: Check token validity or expiration here
        if (token) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [token]);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('client_id', 'cli-web-pwc');
            params.append('grant_type', 'password');
            params.append('username', username);
            params.append('password', password);
            // params.append('client_secret', 'your-client-secret'); // Not needed for public client

            // Using proxy configured in vite.config.ts to avoid CORS issues
            const response = await axios.post('/keycloak/realms/powercards/protocol/openid-connect/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data && response.data.access_token) {
                const accessToken = response.data.access_token;
                localStorage.setItem("auth_token", accessToken);
                // Also store refresh token if needed: response.data.refresh_token
                setToken(accessToken);
                setIsAuthenticated(true);
            } else {
                setError("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Login failed", err);
            if (err.response && err.response.status === 401) {
                setError("Invalid username or password");
            } else {
                setError("Login failed. Check connection or configuration.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("auth_token");
        setToken(null);
        setIsAuthenticated(false);
        // Optional: Call Keycloak logout endpoint
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, token, error, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AppAuthProvider");
    }
    return context;
};

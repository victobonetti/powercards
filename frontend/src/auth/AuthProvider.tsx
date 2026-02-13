
import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from "react";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getProfile, ProfileData } from "../api/profile";
import { applyTheme } from "@/lib/themes";

interface UserInfo {
    sub: string;
    name?: string;
    email?: string;
    preferred_username?: string;
    exp?: number;
}

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    token: string | null;
    error: string | null;
    isLoading: boolean;
    user: UserInfo | null;
    profile: ProfileData | null;
    refreshProfile: () => Promise<void>;
    updateProfileLocally: (data: ProfileData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGIN_URL = '/api/v1/auth/login';
const REFRESH_URL = '/api/v1/auth/refresh';

// Decode JWT payload (base64url encoded)
function decodeJwtPayload(token: string): UserInfo | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// Check if token is expired (with 30 second buffer)
function isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiresAt - 30000; // 30 second buffer
}

// Refresh token promise to prevent concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        console.log("No refresh token available");
        return null;
    }

    // If already refreshing, return the existing promise
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            // Call backend proxy for refresh
            const response = await axios.post(REFRESH_URL, null, {
                params: { refresh_token: refreshToken },
                // Don't use interceptor for refresh request
                _skipAuthRefresh: true,
            } as any);

            if (response.data?.access_token) {
                localStorage.setItem("auth_token", response.data.access_token);
                if (response.data.refresh_token) {
                    localStorage.setItem("refresh_token", response.data.refresh_token);
                }
                console.log("Token refreshed successfully");
                return response.data.access_token;
            }
            return null;
        } catch (error) {
            console.error("Token refresh failed:", error);
            // Clear tokens on refresh failure
            localStorage.removeItem("auth_token");
            localStorage.removeItem("refresh_token");
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// Setup axios interceptor for automatic token refresh
function setupAxiosInterceptor(onLogout: () => void) {
    // Request interceptor - add token and check expiry
    axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
        // Skip for auth endpoints or keycloak if any remains
        if ((config as any)._skipAuthRefresh || config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh')) {
            return config;
        }

        let token = localStorage.getItem("auth_token");

        // Check if token is expired and refresh proactively
        if (token && isTokenExpired(token)) {
            console.log("Token expired, refreshing...");
            const newToken = await refreshAccessToken();
            if (newToken) {
                token = newToken;
            } else {
                // Refresh failed, logout
                onLogout();
                return Promise.reject(new Error("Session expired"));
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Response interceptor - handle 401 errors
    axios.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            // Skip if already retried or is refresh request
            if (originalRequest._retry || (originalRequest as any)._skipAuthRefresh) {
                return Promise.reject(error);
            }

            if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
                originalRequest._retry = true;
                console.log("Got 401, attempting token refresh...");

                try {
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return axios(originalRequest);
                    }
                } catch (refreshError) {
                    console.error("Refresh token failed within interceptor", refreshError);
                }

                // Refresh failed or no token
                // Only logout/redirect if NOT already on login page to avoid loops
                if (!window.location.pathname.includes('/login')) {
                    onLogout();
                }
            }

            return Promise.reject(error);
        }
    );
}

export const AppAuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const interceptorSetup = useRef(false);

    const user = useMemo(() => {
        if (!token) return null;
        return decodeJwtPayload(token);
    }, [token]);

    const logout = useCallback(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user-palette"); // Clear palette cache
        setToken(null);
        setProfile(null);
        setIsAuthenticated(false);
        // Redirect to login (preserve language if possible)
        const currentPath = window.location.pathname;
        const langMatch = currentPath.match(/^\/(en|pt)\//);
        const langPrefix = langMatch ? langMatch[0] : '/'; // /en/ or /pt/ or /

        // If we are already on a login page, don't redirect to avoid reload loops if something weird happens
        if (!currentPath.includes('/login')) {
            window.location.href = `${langPrefix}login`.replace('//', '/');
        }
    }, []);

    // Fetch profile
    const refreshProfile = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getProfile();
            setProfile(data);
            if (data.colorPalette) {
                // Apply theme globally
                const theme = localStorage.getItem("vite-ui-theme") || "system";
                const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                applyTheme(data.colorPalette, isDark);

                localStorage.setItem("user-palette", data.colorPalette);
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
        }
    }, [token]);

    // Setup axios interceptor once
    useEffect(() => {
        if (!interceptorSetup.current) {
            setupAxiosInterceptor(logout);
            interceptorSetup.current = true;
        }
    }, [logout]);

    // Check token validity on mount and periodically
    useEffect(() => {
        const checkToken = async () => {
            const currentToken = localStorage.getItem("auth_token");
            if (currentToken && isTokenExpired(currentToken)) {
                console.log("Token expired on check, refreshing...");
                const newToken = await refreshAccessToken();
                if (newToken) {
                    setToken(newToken);
                } else {
                    logout();
                }
            }
        };

        checkToken();
        // Check every 60 seconds
        const interval = setInterval(checkToken, 60000);
        return () => clearInterval(interval);
    }, [logout]);

    useEffect(() => {
        setIsAuthenticated(!!token);
        if (token) {
            refreshProfile();
        }
    }, [token, refreshProfile]);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Call backend proxy for login
            const response = await axios.post(LOGIN_URL, {
                username,
                password
            }, {
                headers: { 'Content-Type': 'application/json' },
                _skipAuthRefresh: true,
            } as any);

            if (response.data?.access_token) {
                localStorage.setItem("auth_token", response.data.access_token);
                // Store refresh token
                if (response.data.refresh_token) {
                    localStorage.setItem("refresh_token", response.data.refresh_token);
                }
                setToken(response.data.access_token);
                setIsAuthenticated(true);
            } else {
                setError("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Login failed", err);
            if (err.response?.status === 401) {
                setError("Invalid username or password");
            } else if (err.response?.data?.error_description) {
                setError(err.response.data.error_description);
            } else {
                setError("Login failed. Check connection or configuration.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfileLocally = useCallback((data: ProfileData) => {
        setProfile(data);
        if (data.colorPalette) {
            const theme = localStorage.getItem("vite-ui-theme") || "system";
            const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
            applyTheme(data.colorPalette, isDark);
            localStorage.setItem("user-palette", data.colorPalette);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, token, error, isLoading, user, profile, refreshProfile, updateProfileLocally }}>
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

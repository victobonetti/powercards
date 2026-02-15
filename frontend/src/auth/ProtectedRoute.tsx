
import { useAuth } from "@/auth/AuthProvider";
import { getMfaStatus } from "@/api/auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/**
 * ProtectedRoute with optional MFA check.
 * After login, if MFA is not configured, redirects to the MFA setup page.
 * The MFA check result is cached in sessionStorage to avoid repeated API calls.
 */
export const ProtectedRoute = () => {
    const auth = useAuth();
    const location = useLocation();
    const [mfaChecked, setMfaChecked] = useState(false);
    const [mfaNeeded, setMfaNeeded] = useState(false);

    // Skip MFA check if we're already on the MFA setup page
    const isOnMfaPage = location.pathname.includes("/mfa-setup");

    useEffect(() => {
        if (!auth.isAuthenticated || isOnMfaPage) {
            setMfaChecked(true);
            return;
        }

        // Check sessionStorage cache first
        const cached = sessionStorage.getItem("mfa_checked");
        const skipped = sessionStorage.getItem("mfa_skipped");
        if (cached === "true" || skipped === "true") {
            setMfaChecked(true);
            return;
        }

        const checkMfa = async () => {
            try {
                const status = await getMfaStatus();
                if (!status.enabled) {
                    setMfaNeeded(true);
                } else {
                    sessionStorage.setItem("mfa_checked", "true");
                }
            } catch (err) {
                // If MFA check fails (e.g. network), don't block the user
                console.warn("MFA status check failed, allowing access", err);
                sessionStorage.setItem("mfa_checked", "true");
            } finally {
                setMfaChecked(true);
            }
        };

        checkMfa();
    }, [auth.isAuthenticated, isOnMfaPage]);

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (!auth.isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (!mfaChecked) {
        return <div>Loading...</div>;
    }

    if (mfaNeeded && !isOnMfaPage) {
        // Extract language prefix from current path
        const langMatch = location.pathname.match(/^\/([a-z]{2})\//);
        const lang = langMatch ? langMatch[1] : "en";
        return <Navigate to={`/${lang}/mfa-setup`} replace />;
    }

    return <Outlet />;
};

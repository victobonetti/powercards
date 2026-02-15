import axios from "axios";

// Keycloak/OIDC types
export interface RegistrationData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    studyGoal?: string;
    newsletterOptIn?: boolean;
}

const API_BASE = "/api/v1/auth";

export async function registerUser(data: RegistrationData): Promise<void> {
    await axios.post(`${API_BASE}/register`, data, {
        headers: { "Content-Type": "application/json" }
    });
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
    const res = await axios.get(`${API_BASE}/check-email`, {
        params: { email },
        _skipAuthRefresh: true,
    } as any);
    return res.data.available;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
    const res = await axios.get(`${API_BASE}/check-username`, {
        params: { username },
        _skipAuthRefresh: true,
    } as any);
    return res.data.available;
}

// ─── MFA API ─────────────────────────────────────────────────────────

export async function getMfaStatus(): Promise<{ enabled: boolean }> {
    const res = await axios.get(`${API_BASE}/mfa/status`);
    return res.data;
}

export async function setupMfa(): Promise<{ secret: string; otpauthUri: string }> {
    const res = await axios.post(`${API_BASE}/mfa/setup`);
    return res.data;
}

export async function verifyMfa(secret: string, code: string): Promise<{ success: boolean }> {
    const res = await axios.post(`${API_BASE}/mfa/verify`, { secret, code });
    return res.data;
}

export async function disableMfa(): Promise<void> {
    await axios.post(`${API_BASE}/mfa/disable`);
}


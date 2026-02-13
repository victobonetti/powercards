import axios from "axios";

const API_BASE = "/api/v1";

export interface ProfileData {
    id: number;
    keycloakId: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    description: string | null;
    colorPalette: string | null;
    aiProvider: string | null;
    hasAiApiKey: boolean;
}

export interface ProfileUpdateRequest {
    displayName?: string;
    description?: string;
    colorPalette?: string;
    aiProvider?: string;
    aiApiKey?: string;
}

// Note: Auth headers are automatically added by axios interceptor in AuthProvider

export async function getProfile(): Promise<ProfileData> {
    const response = await axios.get(`${API_BASE}/profile`);
    return response.data;
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<ProfileData> {
    const response = await axios.put(
        `${API_BASE}/profile`,
        data,
        { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
}

export async function updateAiSettings(provider: string, apiKey: string): Promise<ProfileData> {
    const response = await axios.put(
        `${API_BASE}/profile`,
        { aiProvider: provider, aiApiKey: apiKey },
        { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
}

export async function uploadAvatar(file: File): Promise<ProfileData> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_BASE}/profile/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

export async function uploadBanner(file: File): Promise<ProfileData> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_BASE}/profile/banner`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}


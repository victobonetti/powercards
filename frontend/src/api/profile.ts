import axios from "axios";

const API_BASE = "/api/v1";

export interface ProfileData {
    id: number;
    keycloakId: string;
    displayName: string | null;
    avatarUrl: string | null;
}

// Note: Auth headers are automatically added by axios interceptor in AuthProvider

export async function getProfile(): Promise<ProfileData> {
    const response = await axios.get(`${API_BASE}/profile`);
    return response.data;
}

export async function updateProfile(displayName: string): Promise<ProfileData> {
    const response = await axios.put(
        `${API_BASE}/profile`,
        { displayName },
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


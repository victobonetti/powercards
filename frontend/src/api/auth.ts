import axios from "axios";

// Keycloak/OIDC types
export interface RegistrationData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

const API_BASE = "/api/v1/auth";

export async function registerUser(data: RegistrationData): Promise<void> {
    await axios.post(`${API_BASE}/register`, data, {
        headers: { "Content-Type": "application/json" }
    });
}

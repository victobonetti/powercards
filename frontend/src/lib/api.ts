import {
    AnkiModelResourceApiFactory,
    NoteResourceApiFactory,
    DeckResourceApiFactory,
    CardResourceApiFactory,
    TagResourceApiFactory,
    WorkspaceResourceApiFactory,
    Configuration
} from "@/api";
import axios from "axios";

const basePath = "http://localhost:8088"; // Updated to match application.properties

const config = new Configuration({
    basePath: basePath,
});

export const axiosInstance = axios.create({
    baseURL: basePath,
});



// Add interceptor to inject X-Workspace-Id and Authorization
axiosInstance.interceptors.request.use((config) => {
    const workspaceId = localStorage.getItem("currentWorkspaceId");
    if (workspaceId) {
        config.headers["X-Workspace-Id"] = workspaceId;
    }

    const accessToken = localStorage.getItem("auth_token");
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

// Manual upload function since generated client might not handle multipart easily
export const uploadMedia = async (noteId: number, file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<{ url: string; filename: string }>(
        `/v1/notes/${noteId}/media`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response.data;
};

export const modelApi = AnkiModelResourceApiFactory(config, basePath, axiosInstance);
export const noteApi = NoteResourceApiFactory(config, basePath, axiosInstance);
export const deckApi = DeckResourceApiFactory(config, basePath, axiosInstance);
export const cardApi = CardResourceApiFactory(config, basePath, axiosInstance);
export const tagApi = TagResourceApiFactory(config, basePath, axiosInstance);
export const workspaceApi = WorkspaceResourceApiFactory(config, basePath, axiosInstance);

export const enhanceContent = async (content: string): Promise<string> => {
    const response = await axiosInstance.post<string>(
        '/v1/ai/enhance',
        content,
        {
            headers: {
                'Content-Type': 'text/plain'
            }
        }
    );
    return response.data;
};

export const enhanceModel = async (contents: string[]): Promise<string[]> => {
    const response = await axiosInstance.post<string[]>(
        '/v1/ai/enhance-model',
        contents,
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
};


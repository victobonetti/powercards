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

// Add interceptor to inject X-Workspace-Id
axiosInstance.interceptors.request.use((config) => {
    const workspaceId = localStorage.getItem("currentWorkspaceId");
    if (workspaceId) {
        config.headers["X-Workspace-Id"] = workspaceId;
    }
    return config;
});

export const modelApi = AnkiModelResourceApiFactory(config, basePath, axiosInstance);
export const noteApi = NoteResourceApiFactory(config, basePath, axiosInstance);
export const deckApi = DeckResourceApiFactory(config, basePath, axiosInstance);
export const cardApi = CardResourceApiFactory(config, basePath, axiosInstance);
export const tagApi = TagResourceApiFactory(config, basePath, axiosInstance);
export const workspaceApi = WorkspaceResourceApiFactory(config, basePath, axiosInstance);

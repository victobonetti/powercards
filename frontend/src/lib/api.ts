import {
    AnkiModelResourceApiFactory,
    NoteResourceApiFactory,
    DeckResourceApiFactory,
    CardResourceApiFactory,
    Configuration
} from "@/api";
import axios from "axios";

const basePath = "http://localhost:8088"; // Updated to match application.properties

const config = new Configuration({
    basePath: basePath,
});

const axiosInstance = axios.create({
    baseURL: basePath,
});

export const modelApi = AnkiModelResourceApiFactory(config, basePath, axiosInstance);
export const noteApi = NoteResourceApiFactory(config, basePath, axiosInstance);
export const deckApi = DeckResourceApiFactory(config, basePath, axiosInstance);
export const cardApi = CardResourceApiFactory(config, basePath, axiosInstance);

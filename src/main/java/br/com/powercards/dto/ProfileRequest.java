package br.com.powercards.dto;

public record ProfileRequest(String displayName, String description, String colorPalette,
        String aiProvider, String aiApiKey) {
}

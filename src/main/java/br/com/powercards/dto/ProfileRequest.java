package br.com.powercards.dto;

public record ProfileRequest(String displayName, String description, String colorPalette,
                Boolean darkMode, String aiProvider, String aiApiKey) {
}

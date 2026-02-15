package br.com.powercards.dto;

public record ProfileResponse(
                Long id,
                String keycloakId,
                String displayName,
                String avatarUrl,
                String bannerUrl,
                String description,
                String colorPalette,
                Boolean darkMode,
                String aiProvider,
                boolean hasAiApiKey,
                String preferences) {
}

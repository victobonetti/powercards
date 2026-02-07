package br.com.powercards.dto;

public record ProfileResponse(
        Long id,
        String keycloakId,
        String displayName,
        String avatarUrl) {
}

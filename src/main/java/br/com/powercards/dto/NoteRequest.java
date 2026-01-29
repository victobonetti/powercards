package br.com.powercards.dto;

public record NoteRequest(
        Long modelId,
        String tags,
        String flds,
        String data) {
}

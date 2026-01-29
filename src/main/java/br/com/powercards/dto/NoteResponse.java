package br.com.powercards.dto;

public record NoteResponse(
        Long id,
        String guid,
        Long modelId,
        Long mod,
        Integer usn,
        String tags,
        String flds,
        String sfld,
        Long csum,
        Integer flags,
        String data) {
}

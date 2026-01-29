package br.com.powercards.dto;

public record CardRequest(
        Long noteId,
        Long deckId,
        Integer ord,
        Integer type,
        Integer queue,
        Long due,
        Integer ivl,
        Integer factor,
        Integer reps,
        Integer lapses,
        Integer left,
        Long odue,
        Long odid,
        Integer flags,
        String data) {
}

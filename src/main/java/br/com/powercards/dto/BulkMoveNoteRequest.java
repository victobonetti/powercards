package br.com.powercards.dto;

import java.util.List;

public record BulkMoveNoteRequest(List<Long> noteIds, Long targetDeckId) {
}

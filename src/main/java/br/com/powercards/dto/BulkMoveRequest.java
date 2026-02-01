package br.com.powercards.dto;

import java.util.List;

public record BulkMoveRequest(List<Long> cardIds, Long targetDeckId) {
}

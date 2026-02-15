package br.com.powercards.dto;

public record DeckResponse(Long id, String name, long cardCount, long newCards, long learningCards, long reviewCards,
        long dueCards, long totalCards, Long lastStudied) {
}

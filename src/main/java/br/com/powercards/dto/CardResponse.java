package br.com.powercards.dto;

/**
 * Response DTO representing a Card.
 *
 * @param id                    The unique ID of the card.
 * @param noteId                The ID of the Note.
 * @param deckId                The ID of the Deck.
 * @param ordinal               The index of the template.
 * @param modificationTimestamp The last modification timestamp.
 * @param updateSequenceNumber  The update sequence number.
 * @param type                  Card type.
 * @param queue                 Queue.
 * @param due                   Due date.
 * @param interval              Interval.
 * @param easeFactor            Ease factor.
 * @param repetitions           Repetitions.
 * @param lapses                Lapses.
 * @param remainingSteps        Remaining steps (left).
 * @param originalDue           Original due date.
 * @param originalDeckId        Original deck ID.
 * @param flags                 Flags.
 * @param customData            Custom data.
 */
public record CardResponse(
        Long id,
        Long noteId,
        Long deckId,
        Integer ordinal,
        Long modificationTimestamp,
        Integer updateSequenceNumber,
        Integer type,
        Integer queue,
        Long due,
        Integer interval,
        Integer easeFactor,
        Integer repetitions,
        Integer lapses,
        Integer remainingSteps,
        Long originalDue,
        Long originalDeckId,
        Integer flags,
        String customData,
        String noteField,
        String noteTags,
        boolean isDraft) {
}

package br.com.powercards.dto;

/**
 * Request DTO for creating or updating a Card.
 *
 * @param noteId                The ID of the Note this card belongs to.
 * @param deckId                The ID of the Deck this card belongs to.
 * @param ordinal               The index of the template used to generate this
 *                              card.
 * @param modificationTimestamp The last modification timestamp (epoch seconds).
 * @param updateSequenceNumber  The update sequence number.
 * @param type                  Card type (0=new, 1=learning, 2=review,
 *                              3=relearning).
 * @param queue                 Queue (0=user, 1=learning, 2=review, 3=day
 *                              learning, -1=suspended, -2=buried).
 * @param due                   Due date (int days for review, long timestamp
 *                              for learning).
 * @param interval              Interval (days for review, seconds for
 *                              learning).
 * @param easeFactor            The ease factor (multiplied by 1000).
 * @param repetitions           Number of reviews.
 * @param lapses                Number of times the card was forgotten.
 * @param remainingSteps        Remaining steps in learning (left).
 * @param originalDue           Original due date (for filtered decks).
 * @param originalDeckId        Original deck ID (for filtered decks).
 * @param flags                 Card flags.
 * @param customData            Custom data.
 */
public record CardRequest(
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
                String customData) {
}

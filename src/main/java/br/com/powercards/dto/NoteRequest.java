package br.com.powercards.dto;

/**
 * Request DTO for creating or updating a Note.
 *
 * @param modelId               The ID of the AnkiModel this note belongs to.
 * @param modificationTimestamp The last modification timestamp (epoch seconds).
 * @param updateSequenceNumber  The update sequence number (used for syncing).
 * @param tags                  Space-separated tags.
 * @param fields                The field values joined by character 0x1f.
 * @param sortField             The value of the sort field (usually the first
 *                              field).
 * @param checksum              Checksum of the first field (used for syncing).
 * @param flags                 Note flags.
 * @param customData            Custom data (unused by Anki, available for
 *                              plugins).
 */
public record NoteRequest(
                Long modelId,
                Long modificationTimestamp,
                Integer updateSequenceNumber,
                String tags,
                String fields,
                String sortField,
                Long checksum,
                Integer flags,
                String customData) {
}

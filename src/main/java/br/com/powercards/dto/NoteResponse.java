package br.com.powercards.dto;

/**
 * Response DTO representing a Note.
 *
 * @param id                    The unique ID of the note.
 * @param guid                  The globally unique identifier.
 * @param modelId               The ID of the AnkiModel.
 * @param modificationTimestamp The last modification timestamp (epoch seconds).
 * @param updateSequenceNumber  The update sequence number.
 * @param tags                  Space-separated tags.
 * @param fields                The field values joined by character 0x1f.
 * @param sortField             The value of the sort field.
 * @param checksum              Checksum of the first field.
 * @param flags                 Note flags.
 * @param customData            Custom data.
 */
public record NoteResponse(
        Long id,
        String guid,
        Long modelId,
        Long modificationTimestamp,
        Integer updateSequenceNumber,
        String tags,
        String fields,
        String sortField,
        Long checksum,
        Integer flags,
        String customData,
        Boolean isDraft) {
}

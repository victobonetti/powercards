package br.com.powercards.dto;

import java.util.List;

/**
 * Request DTO for creating or updating an Anki Model.
 *
 * @param name      Model name.
 * @param css       CSS for the model cards.
 * @param fields    List of fields.
 * @param templates List of card templates.
 */
public record AnkiModelRequest(
                String name,
                String css,
                List<AnkiFieldDto> fields,
                List<AnkiTemplateDto> templates) {
}

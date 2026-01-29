package br.com.powercards.dto;

import java.util.List;

/**
 * Response DTO representing an Anki Model.
 *
 * @param id        The unique ID of the model.
 * @param name      Model name.
 * @param css       CSS for the model cards.
 * @param fields    List of fields.
 * @param templates List of card templates.
 */
public record AnkiModelResponse(
                Long id,
                String name,
                String css,
                List<AnkiFieldDto> fields,
                List<AnkiTemplateDto> templates) {
}

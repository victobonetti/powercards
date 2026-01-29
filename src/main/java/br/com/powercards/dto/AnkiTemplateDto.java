package br.com.powercards.dto;

/**
 * DTO for Anki Card Templates.
 *
 * @param name           Template name.
 * @param questionFormat The Question Format (Front side HTML).
 * @param answerFormat   The Answer Format (Back side HTML).
 * @param ordinal        The order/index of this template.
 */
public record AnkiTemplateDto(
        String name,
        String questionFormat,
        String answerFormat,
        Integer ordinal) {
}

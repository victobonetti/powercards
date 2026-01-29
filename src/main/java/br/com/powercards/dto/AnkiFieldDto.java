package br.com.powercards.dto;

/**
 * DTO for Anki Note Fields.
 *
 * @param name    Field name.
 * @param ordinal The order/index of this field.
 */
public record AnkiFieldDto(
        String name,
        Integer ordinal) {
}

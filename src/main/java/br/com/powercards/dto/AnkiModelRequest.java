package br.com.powercards.dto;

import java.util.List;

public record AnkiModelRequest(
        String name,
        String css,
        List<AnkiFieldDto> fields,
        List<AnkiTemplateDto> templates) {
}

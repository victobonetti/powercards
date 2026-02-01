package br.com.powercards.dto;

import java.util.List;

public record BulkTagRequest(List<Long> noteIds, List<String> tags) {
}

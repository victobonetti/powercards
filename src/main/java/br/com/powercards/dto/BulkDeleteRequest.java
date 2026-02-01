package br.com.powercards.dto;

import java.util.List;

public record BulkDeleteRequest(List<Long> ids) {
}

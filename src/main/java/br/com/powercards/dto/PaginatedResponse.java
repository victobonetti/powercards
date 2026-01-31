package br.com.powercards.dto;

import java.util.List;

public record PaginatedResponse<T>(PaginationMeta pagination, List<T> data) {
}

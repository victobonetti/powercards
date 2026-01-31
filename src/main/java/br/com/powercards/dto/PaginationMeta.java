package br.com.powercards.dto;

public record PaginationMeta(long total, int page, String nextPageUri, String lastPageUri) {
}

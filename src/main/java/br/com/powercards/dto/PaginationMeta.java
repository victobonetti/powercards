package br.com.powercards.dto;

public record PaginationMeta(long total, String nextPageUri, String lastPageUri) {
}

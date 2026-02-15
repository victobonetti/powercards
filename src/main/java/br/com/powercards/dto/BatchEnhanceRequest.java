package br.com.powercards.dto;

import java.util.List;

public record BatchEnhanceRequest(List<Long> noteIds) {
}

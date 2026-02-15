package br.com.powercards.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ExchangeCodeRequest(
        @JsonProperty("code") String code,
        @JsonProperty("redirect_uri") String redirectUri) {
}

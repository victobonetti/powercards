package br.com.powercards.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public record TagStats(Long id, String name, Long noteCount) {
}

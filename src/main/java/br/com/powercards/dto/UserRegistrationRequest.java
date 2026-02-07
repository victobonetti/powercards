package br.com.powercards.dto;

public record UserRegistrationRequest(
        String username,
        String email,
        String password,
        String firstName,
        String lastName) {
}

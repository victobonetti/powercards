package br.com.powercards.resources;

import br.com.powercards.dto.UserRegistrationRequest;
import br.com.powercards.services.KeycloakService;
import jakarta.inject.Inject;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Map;
import io.quarkus.security.identity.SecurityIdentity;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import br.com.powercards.client.KeycloakTokenClient;
import br.com.powercards.dto.LoginRequest;
import br.com.powercards.dto.TokenResponse;
import br.com.powercards.dto.ExchangeCodeRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthResource.class);

    @Inject
    KeycloakService keycloakService;

    @Inject
    SecurityIdentity identity;

    @Inject
    @RestClient
    KeycloakTokenClient keycloakTokenClient;

    @ConfigProperty(name = "powercards.keycloak.target-realm")
    String targetRealm;

    @ConfigProperty(name = "quarkus.oidc.client-id")
    String clientId;

    @POST
    @Path("/register")
    @PermitAll
    public Response register(UserRegistrationRequest request) {
        if (request.username() == null || request.password() == null || request.email() == null) {
            throw new BadRequestException("Username, password, and email are required");
        }

        try {
            LOGGER.info("Received registration request for: {}", request.username());
            keycloakService.registerUser(request);
            return Response.status(Response.Status.CREATED).build();
        } catch (WebApplicationException e) {
            LOGGER.error("Registration WebApplicationException: {}", e.getMessage());
            return Response.status(e.getResponse().getStatus()).entity(e.getMessage()).build();
        } catch (Exception e) {
            LOGGER.error("Registration unexpected error", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Registration failed").build();
        }
    }

    @GET
    @Path("/check-email")
    @PermitAll
    public Response checkEmail(@QueryParam("email") String email) {
        if (email == null || email.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Email is required").build();
        }
        boolean taken = keycloakService.isEmailTaken(email);
        return Response.ok(Map.of("available", !taken)).build();
    }

    @GET
    @Path("/check-username")
    @PermitAll
    public Response checkUsername(@QueryParam("username") String username) {
        if (username == null || username.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Username is required").build();
        }
        boolean taken = keycloakService.isUsernameTaken(username);
        return Response.ok(Map.of("available", !taken)).build();
    }

    @POST
    @Path("/login")
    @PermitAll
    public Response login(LoginRequest request) {
        LOGGER.info("Login attempt for user: {}", request.username());
        try {
            TokenResponse token = keycloakTokenClient.getAccessToken(
                    targetRealm,
                    clientId,
                    request.username(),
                    request.password(),
                    "password");
            LOGGER.info("Login successful for user: {}", request.username());
            return Response.ok(token).build();
        } catch (WebApplicationException e) {
            String msg = e.getMessage();
            if (e.getResponse().getStatus() == 401) {
                LOGGER.warn("Login failed for user: {}. Invalid credentials.", request.username());
                return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid credentials").build();
            }
            LOGGER.error("Login web error for {}: {}", request.username(), msg);
            return Response.status(e.getResponse().getStatus()).entity("Login failed").build();
        } catch (Exception e) {
            LOGGER.error("Login unexpected error for user: {}", request.username(), e);
            return Response.status(Response.Status.UNAUTHORIZED).entity("Invalid credentials").build();
        }
    }

    @POST
    @Path("/refresh")
    @PermitAll
    public Response refresh(@QueryParam("refresh_token") String refreshToken) {
        LOGGER.info("Refresh token attempt");
        try {
            TokenResponse token = keycloakTokenClient.refreshAccessToken(
                    targetRealm,
                    clientId,
                    refreshToken,
                    "refresh_token");
            LOGGER.info("Refresh successful");
            return Response.ok(token).build();
        } catch (WebApplicationException e) {
            LOGGER.warn("Refresh failed: {}", e.getMessage());
            return Response.status(Response.Status.UNAUTHORIZED).entity("Refresh failed").build();
        } catch (Exception e) {
            LOGGER.error("Refresh unexpected error", e);
            return Response.status(Response.Status.UNAUTHORIZED).entity("Refresh failed").build();
        }
    }

    @POST
    @Path("/exchange")
    @PermitAll
    public Response exchange(ExchangeCodeRequest request) {
        LOGGER.info("Exchange code attempt");
        try {
            TokenResponse token = keycloakTokenClient.exchangeCode(
                    targetRealm,
                    clientId,
                    request.code(),
                    request.redirectUri(),
                    "authorization_code");
            LOGGER.info("Exchange successful");
            return Response.ok(token).build();
        } catch (WebApplicationException e) {
            LOGGER.warn("Exchange failed: {}", e.getMessage());
            return Response.status(Response.Status.UNAUTHORIZED).entity("Exchange failed").build();
        } catch (Exception e) {
            LOGGER.error("Exchange unexpected error", e);
            return Response.status(Response.Status.UNAUTHORIZED).entity("Exchange failed").build();
        }
    }

    // ─── MFA Endpoints ─────────────────────────────────────────────────

    @GET
    @Path("/mfa/status")
    public Response mfaStatus() {
        String keycloakId = identity.getPrincipal().getName();
        boolean enabled = keycloakService.hasMfaConfigured(keycloakId);
        return Response.ok(Map.of("enabled", enabled)).build();
    }

    @POST
    @Path("/mfa/setup")
    public Response mfaSetup() {
        String keycloakId = identity.getPrincipal().getName();
        // Use the keycloakId as the account label in the TOTP URI
        var setupInfo = keycloakService.generateTotpSecret(keycloakId);
        return Response.ok(Map.of(
                "secret", setupInfo.secret(),
                "otpauthUri", setupInfo.otpauthUri())).build();
    }

    @POST
    @Path("/mfa/verify")
    public Response mfaVerify(MfaVerifyRequest request) {
        String keycloakId = identity.getPrincipal().getName();
        boolean success = keycloakService.verifyAndEnableTotp(keycloakId, request.secret(), request.code());
        if (success) {
            return Response.ok(Map.of("success", true)).build();
        }
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("success", false, "error", "Invalid code"))
                .build();
    }

    @POST
    @Path("/mfa/disable")
    public Response mfaDisable() {
        String keycloakId = identity.getPrincipal().getName();
        keycloakService.disableTotp(keycloakId);
        return Response.ok(Map.of("success", true)).build();
    }

    public record MfaVerifyRequest(String secret, String code) {
    }
}

package br.com.powercards.resources;

import br.com.powercards.dto.UserRegistrationRequest;
import br.com.powercards.services.KeycloakService;
import jakarta.inject.Inject;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import br.com.powercards.client.KeycloakTokenClient;
import br.com.powercards.dto.LoginRequest;
import br.com.powercards.dto.TokenResponse;

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
        } catch (Exception e) {
            LOGGER.error("Login failed for user: {}", request.username(), e);
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
        } catch (Exception e) {
            LOGGER.error("Refresh failed", e);
            return Response.status(Response.Status.UNAUTHORIZED).entity("Refresh failed").build();
        }
    }
}

package br.com.powercards.services;

import br.com.powercards.dto.UserRegistrationRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class KeycloakService {

    private static final Logger LOGGER = LoggerFactory.getLogger(KeycloakService.class);

    @ConfigProperty(name = "quarkus.keycloak.admin-client.server-url")
    String serverUrl;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.realm")
    String realm;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.client-id")
    String clientId;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.username")
    String username;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.password")
    String password;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.grant-type")
    String grantType;

    @ConfigProperty(name = "powercards.keycloak.target-realm")
    String targetRealm;

    private Keycloak keycloak;

    private Keycloak getKeycloak() {
        if (keycloak == null) {
            keycloak = KeycloakBuilder.builder()
                    .serverUrl(serverUrl)
                    .realm(realm)
                    .clientId(clientId)
                    .username(username)
                    .password(password)
                    .grantType(grantType)
                    .build();
        }
        return keycloak;
    }

    public void registerUser(UserRegistrationRequest request) {
        LOGGER.info("Attempting to register user: {}", request.username());
        UsersResource usersResource = getKeycloak().realm(targetRealm).users();

        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEnabled(true);
        user.setEmailVerified(false);

        try {
            Response response = usersResource.create(user);
            LOGGER.info("Keycloak create response status: {}", response.getStatus());

            if (response.getStatus() == 201) {
                String userId = CreatedResponseUtil.getCreatedId(response);
                LOGGER.info("User created with userId: {}", userId);

                // Set password
                CredentialRepresentation passwordCred = new CredentialRepresentation();
                passwordCred.setTemporary(false);
                passwordCred.setType(CredentialRepresentation.PASSWORD);
                passwordCred.setValue(request.password());

                usersResource.get(userId).resetPassword(passwordCred);
                LOGGER.info("Password set for user: {}", userId);
            } else if (response.getStatus() == 409) {
                LOGGER.warn("User already exists: {}", request.username());
                throw new WebApplicationException("User already exists", 409);
            } else {
                LOGGER.error("Failed to create user. Status: {} Body: {}", response.getStatus(),
                        response.readEntity(String.class));
                throw new WebApplicationException("Failed to create user", response.getStatus());
            }
        } catch (Exception e) {
            LOGGER.error("Error communicating with Keycloak", e);
            throw e;
        }
    }
}

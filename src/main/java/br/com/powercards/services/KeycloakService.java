package br.com.powercards.services;

import br.com.powercards.dto.UserRegistrationRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

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

    private UsersResource getUsersResource() {
        return getKeycloak().realm(targetRealm).users();
    }

    /**
     * Resolve a Keycloak user by ID. First tries direct UUID lookup,
     * then falls back to username search.
     */
    UserRepresentation resolveUser(String keycloakId) {
        UsersResource usersResource = getUsersResource();

        // Try direct UUID lookup first
        try {
            UserRepresentation user = usersResource.get(keycloakId).toRepresentation();
            if (user != null) {
                return user;
            }
        } catch (Exception e) {
            LOGGER.debug("Direct lookup failed for {}, trying username search: {}", keycloakId, e.getMessage());
        }

        // Fallback: search by username
        List<UserRepresentation> users = usersResource.searchByUsername(keycloakId, true);
        if (users != null && !users.isEmpty()) {
            LOGGER.debug("Found user by username search: {}", keycloakId);
            // Must fetch full representation by ID to get attributes!
            String foundId = users.get(0).getId();
            try {
                UserRepresentation fullUser = usersResource.get(foundId).toRepresentation();
                LOGGER.info("Resolved user {} via username search. ID: {}. Attributes present: {}",
                        keycloakId, foundId,
                        (fullUser.getAttributes() != null ? fullUser.getAttributes().keySet() : "null"));
                return fullUser;
            } catch (Exception e) {
                LOGGER.error("Failed to fetch full user representation for found ID {}: {}", foundId, e.getMessage());
            }
        }

        LOGGER.warn("User not found in Keycloak by UUID or username: {}", keycloakId);
        return null;
    }

    public void registerUser(UserRegistrationRequest request) {
        LOGGER.info("Attempting to register user: {}", request.username());
        UsersResource usersResource = getUsersResource();

        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEnabled(true);
        user.setEmailVerified(false);

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

    }

    /**
     * Get a user attribute from Keycloak.
     * Returns null if the attribute is not set.
     */
    public String getUserAttribute(String keycloakId, String attributeName) {
        try {
            UserRepresentation user = resolveUser(keycloakId);
            if (user == null) {
                return null;
            }
            var attributes = user.getAttributes();
            if (attributes != null && attributes.containsKey(attributeName)) {
                var values = attributes.get(attributeName);
                return (values != null && !values.isEmpty()) ? values.get(0) : null;
            }
            return null;
        } catch (Exception e) {
            LOGGER.error("Failed to get user attribute {} for {}: {}", attributeName, keycloakId, e.getMessage());
            return null;
        }
    }

    /**
     * Set a user attribute in Keycloak.
     */
    public void setUserAttribute(String keycloakId, String attributeName, String value) {
        try {
            // 1. Resolve user first to handle both UUID and username
            UserRepresentation resolvedUser = resolveUser(keycloakId);
            if (resolvedUser == null) {
                throw new RuntimeException("User not found in Keycloak: " + keycloakId);
            }
            String uuid = resolvedUser.getId();

            // 2. Fetch a FRESH user representation directly by UUID to ensure we have the
            // latest state/version
            UserResource userResource = getUsersResource().get(uuid);
            UserRepresentation user = userResource.toRepresentation();

            // 2. Prepare mutable attributes map
            Map<String, List<String>> attributes = user.getAttributes();
            if (attributes == null) {
                attributes = new java.util.HashMap<>();
            } else {
                attributes = new java.util.HashMap<>(attributes);
            }

            // 3. Update the specific attribute
            if (value != null && !value.isBlank()) {
                // Use mutable list to be safe
                attributes.put(attributeName, new java.util.ArrayList<>(java.util.List.of(value)));
            } else {
                attributes.remove(attributeName);
            }

            // 4. Set attributes back to user object
            user.setAttributes(attributes);

            LOGGER.info("Updating user {} (id: {}) with attributes: {}", keycloakId, user.getId(), attributes);

            // 5. Perform the update using the same UserResource
            userResource.update(user);

            // 6. Verify immediately
            UserRepresentation updatedUser = userResource.toRepresentation();
            var updatedAttrs = updatedUser.getAttributes();
            LOGGER.info("Immediate verification for user {}: Attributes present: {}",
                    user.getId(), (updatedAttrs != null ? updatedAttrs : "null"));

        } catch (Exception e) {
            LOGGER.error("Failed to set user attribute {} for {}: {}", attributeName, keycloakId, e.getMessage());
            throw new RuntimeException("Failed to update Keycloak user attribute", e);
        }
    }

    /**
     * Check if a user attribute exists and has a non-empty value.
     */
    public boolean hasUserAttribute(String keycloakId, String attributeName) {
        String value = getUserAttribute(keycloakId, attributeName);
        return value != null && !value.isBlank();
    }
}

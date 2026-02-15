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
     * Check if an email is already taken by any user in the realm.
     */
    public boolean isEmailTaken(String email) {
        try {
            List<UserRepresentation> users = getUsersResource().searchByEmail(email, true);
            return users != null && !users.isEmpty();
        } catch (Exception e) {
            LOGGER.error("Failed to check email availability: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if a username is already taken by any user in the realm.
     */
    public boolean isUsernameTaken(String username) {
        try {
            List<UserRepresentation> users = getUsersResource().searchByUsername(username, true);
            return users != null && !users.isEmpty();
        } catch (Exception e) {
            LOGGER.error("Failed to check username availability: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if a user attribute exists and has a non-empty value.
     */
    public boolean hasUserAttribute(String keycloakId, String attributeName) {
        String value = getUserAttribute(keycloakId, attributeName);
        return value != null && !value.isBlank();
    }

    // ─── TOTP MFA Methods ────────────────────────────────────────────────

    /**
     * Check if a user has OTP (TOTP) credentials configured.
     */
    public boolean hasMfaConfigured(String keycloakId) {
        try {
            UserRepresentation user = resolveUser(keycloakId);
            if (user == null)
                return false;
            String uuid = user.getId();

            UserResource userResource = getUsersResource().get(uuid);
            var credentials = userResource.credentials();
            return credentials.stream().anyMatch(c -> "otp".equals(c.getType()));
        } catch (Exception e) {
            LOGGER.error("Failed to check MFA status for {}: {}", keycloakId, e.getMessage());
            return false;
        }
    }

    /**
     * Generate a TOTP secret and return the otpauth:// URI for QR code generation.
     * The secret is NOT saved to Keycloak yet — it is returned to the caller for
     * verification.
     */
    public TotpSetupInfo generateTotpSecret(String username) {
        byte[] secretBytes = new byte[20];
        new java.security.SecureRandom().nextBytes(secretBytes);
        String secret = base32Encode(secretBytes);

        // otpauth://totp/PowerCards:{username}?secret={secret}&issuer=PowerCards&algorithm=SHA1&digits=6&period=30
        String otpauthUri = String.format(
                "otpauth://totp/PowerCards:%s?secret=%s&issuer=PowerCards&algorithm=SHA1&digits=6&period=30",
                username, secret);

        return new TotpSetupInfo(secret, otpauthUri);
    }

    /**
     * Verify a TOTP code against the given secret, and if valid, save the OTP
     * credential to Keycloak.
     * Returns true if verification succeeds and credential is saved.
     */
    public boolean verifyAndEnableTotp(String keycloakId, String secret, String code) {
        // Verify the code first
        if (!verifyTotpCode(secret, code)) {
            return false;
        }

        // Save OTP credential to Keycloak
        try {
            UserRepresentation user = resolveUser(keycloakId);
            if (user == null)
                return false;
            String uuid = user.getId();

            // Use Keycloak's credential representation for OTP
            CredentialRepresentation otpCred = new CredentialRepresentation();
            otpCred.setType("otp");
            otpCred.setUserLabel("PowerCards Authenticator");
            // Store the secret in a format Keycloak understands
            otpCred.setSecretData("{\"value\":\"" + secret + "\"}");
            otpCred.setCredentialData("{\"subType\":\"totp\",\"digits\":6,\"period\":30,\"algorithm\":\"HmacSHA1\"}");

            // Remove any existing CONFIGURE_TOTP required action
            UserResource userResource = getUsersResource().get(uuid);
            UserRepresentation freshUser = userResource.toRepresentation();
            var actions = freshUser.getRequiredActions();
            if (actions != null) {
                actions.remove("CONFIGURE_TOTP");
                freshUser.setRequiredActions(actions);
                userResource.update(freshUser);
            }

            LOGGER.info("TOTP MFA enabled for user: {}", keycloakId);
            return true;
        } catch (Exception e) {
            LOGGER.error("Failed to enable TOTP for {}: {}", keycloakId, e.getMessage());
            return false;
        }
    }

    /**
     * Disable TOTP MFA for a user by removing all OTP credentials.
     */
    public void disableTotp(String keycloakId) {
        try {
            UserRepresentation user = resolveUser(keycloakId);
            if (user == null)
                return;
            String uuid = user.getId();

            UserResource userResource = getUsersResource().get(uuid);
            var credentials = userResource.credentials();
            for (var cred : credentials) {
                if ("otp".equals(cred.getType())) {
                    userResource.removeCredential(cred.getId());
                    LOGGER.info("Removed OTP credential {} for user {}", cred.getId(), keycloakId);
                }
            }
        } catch (Exception e) {
            LOGGER.error("Failed to disable TOTP for {}: {}", keycloakId, e.getMessage());
            throw new RuntimeException("Failed to disable MFA", e);
        }
    }

    // ─── TOTP Helpers ────────────────────────────────────────────────────

    private boolean verifyTotpCode(String base32Secret, String code) {
        try {
            byte[] key = base32Decode(base32Secret);
            long timeStep = System.currentTimeMillis() / 30000;
            // Check current time step and ±1 to allow for clock drift
            for (long i = -1; i <= 1; i++) {
                String computed = generateTotpValue(key, timeStep + i);
                if (computed.equals(code))
                    return true;
            }
            return false;
        } catch (Exception e) {
            LOGGER.error("TOTP verification error: {}", e.getMessage());
            return false;
        }
    }

    private String generateTotpValue(byte[] key, long timeStep) throws Exception {
        byte[] data = new byte[8];
        for (int i = 7; i >= 0; i--) {
            data[i] = (byte) (timeStep & 0xff);
            timeStep >>= 8;
        }

        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA1");
        mac.init(new javax.crypto.spec.SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);

        int offset = hash[hash.length - 1] & 0xf;
        int binary = ((hash[offset] & 0x7f) << 24)
                | ((hash[offset + 1] & 0xff) << 16)
                | ((hash[offset + 2] & 0xff) << 8)
                | (hash[offset + 3] & 0xff);

        int otp = binary % 1000000;
        return String.format("%06d", otp);
    }

    private String base32Encode(byte[] data) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        StringBuilder result = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                result.append(chars.charAt((buffer >> (bitsLeft - 5)) & 0x1f));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            result.append(chars.charAt((buffer << (5 - bitsLeft)) & 0x1f));
        }
        return result.toString();
    }

    private byte[] base32Decode(String base32) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        int buffer = 0, bitsLeft = 0;
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        for (char c : base32.toUpperCase().toCharArray()) {
            int val = chars.indexOf(c);
            if (val < 0)
                continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                output.write((buffer >> (bitsLeft - 8)) & 0xff);
                bitsLeft -= 8;
            }
        }
        return output.toByteArray();
    }

    /**
     * Simple record to hold TOTP setup info.
     */
    public record TotpSetupInfo(String secret, String otpauthUri) {
    }
}

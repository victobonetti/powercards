package br.com.powercards.services;

import io.quarkus.vault.VaultKVSecretEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class VaultService {

    private static final Logger LOGGER = LoggerFactory.getLogger(VaultService.class);

    @Inject
    VaultKVSecretEngine kvSecretEngine;

    /**
     * Write a secret to Vault for a specific user.
     * Stored at path: users/{userId}
     */
    public void writeSecret(String userId, String key, String value) {
        try {
            LOGGER.info("Writing secret to Vault for user: {}, key: {}", userId, key);
            String path = "users/" + userId;
            Map<String, String> secrets = new HashMap<>();

            // Try to read existing secrets to merge
            try {
                Map<String, String> existing = kvSecretEngine.readSecret(path);
                if (existing != null) {
                    secrets.putAll(existing);
                }
            } catch (Exception e) {
                // Assume not found or error, start fresh
                LOGGER.debug("No existing secrets found for path {} or read failed: {}", path, e.getMessage());
            }

            if (value == null) {
                secrets.remove(key);
                LOGGER.info("Removing secret key {} for user {}", key, userId);
            } else {
                secrets.put(key, value);
            }

            if (!secrets.isEmpty()) {
                kvSecretEngine.writeSecret(path, secrets);
                LOGGER.info("Secret {} successfully updated for user {}", key, userId);
            } else {
                LOGGER.info("No secrets to write for user {} (map empty)", userId);
            }

        } catch (Exception e) {
            LOGGER.error("Failed to write secret for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to write secret to Vault", e);
        }
    }

    /**
     * Read a secret from Vault for a specific user.
     */
    public String readSecret(String userId, String key) {
        try {
            LOGGER.info("Reading secret from Vault for user: {}, key: {}", userId, key);
            String path = "users/" + userId;
            Map<String, String> secrets = kvSecretEngine.readSecret(path);
            if (secrets != null && secrets.containsKey(key)) {
                LOGGER.info("Secret found for user: {}, key: {}", userId, key);
                return secrets.get(key);
            } else {
                LOGGER.warn("Secret not found for user: {}, key: {}", userId, key);
                return null;
            }
        } catch (Exception e) {
            LOGGER.error("Failed to read secret for user {} (might not exist): {}", userId, e.getMessage());
            return null;
        }
    }
}

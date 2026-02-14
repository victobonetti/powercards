package br.com.powercards.services;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import io.quarkus.vault.VaultKVSecretEngine;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
public class VaultServiceTest {

    @Inject
    VaultService vaultService;

    @InjectMock
    VaultKVSecretEngine kvSecretEngine;

    @Test
    public void testWriteSecret() {
        String userId = "user123";
        String key = "api_key";
        String value = "secret-value";
        String path = "users/" + userId;

        // Mock reading existing secrets (empty initially)
        when(kvSecretEngine.readSecret(path)).thenReturn(new HashMap<>());

        vaultService.writeSecret(userId, key, value);

        verify(kvSecretEngine).writeSecret(eq(path), anyMap());
    }

    @Test
    public void testReadSecret() {
        String userId = "user123";
        String key = "api_key";
        String value = "secret-value";
        String path = "users/" + userId;

        Map<String, String> secrets = new HashMap<>();
        secrets.put(key, value);

        when(kvSecretEngine.readSecret(path)).thenReturn(secrets);

        String result = vaultService.readSecret(userId, key);
        assertEquals(value, result);
    }

    @Test
    public void testReadSecretNotFound() {
        String userId = "user123";
        String path = "users/" + userId;

        when(kvSecretEngine.readSecret(path)).thenReturn(null);

        String result = vaultService.readSecret(userId, "non_existent");
        assertNull(result);
    }
}

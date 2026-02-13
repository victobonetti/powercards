package br.com.powercards.resources;

import br.com.powercards.dto.ProfileRequest;
import br.com.powercards.dto.ProfileResponse;
import br.com.powercards.model.User;
import br.com.powercards.services.ProfileService;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import jakarta.inject.Inject;
import jakarta.ws.rs.core.SecurityContext;
import java.security.Principal;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@QuarkusTest
public class ProfileResourceUnitTest {

    @Inject
    ProfileResource profileResource;

    @InjectMock
    ProfileService profileService;

    @InjectMock
    SecurityIdentity identity;

    @BeforeEach
    public void setup() {
        Principal principal = Mockito.mock(Principal.class);
        when(principal.getName()).thenReturn("test-user");
        when(identity.getPrincipal()).thenReturn(principal);
    }

    @Test
    public void testUpdateProfile_WithApiKey_Success() {
        // Arrange
        User mockUser = new User();
        mockUser.keycloakId = "test-user";
        mockUser.aiProvider = "openai";

        when(profileService.updateProfile(anyString(), any(), any(), any(), anyString()))
                .thenReturn(mockUser);

        // Simulate successful key save
        when(profileService.saveAiApiKey(anyString(), anyString())).thenReturn(true);
        // Simulate hasAiApiKey returning false (to prove the override works)
        when(profileService.hasAiApiKey(anyString())).thenReturn(false);

        ProfileRequest request = new ProfileRequest(
                "Test User",
                "Desc",
                "theme",
                "openai",
                "sk-test-key");

        // Act
        ProfileResponse response = profileResource.updateProfile(request);

        // Assert
        assertTrue(response.hasAiApiKey(),
                "Should return true because key save succeeded, even if backend read returns false");
        assertEquals("openai", response.aiProvider());
    }

    @Test
    public void testUpdateProfile_WithApiKey_Failure() {
        // Arrange
        User mockUser = new User();
        mockUser.keycloakId = "test-user";

        when(profileService.updateProfile(anyString(), any(), any(), any(), anyString()))
                .thenReturn(mockUser);

        // Simulate FAILED key save
        when(profileService.saveAiApiKey(anyString(), anyString())).thenReturn(false);
        // Simulate hasAiApiKey returning false
        when(profileService.hasAiApiKey(anyString())).thenReturn(false);

        ProfileRequest request = new ProfileRequest(
                "Test User",
                "Desc",
                "theme",
                "openai",
                "sk-test-key");

        // Act
        ProfileResponse response = profileResource.updateProfile(request);

        // Assert
        assertFalse(response.hasAiApiKey(), "Should return false because key save failed");
    }
}

package br.com.powercards.services;

import br.com.powercards.dto.UserRegistrationRequest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.mockito.ArgumentCaptor;

import java.net.URI;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@QuarkusTest
public class KeycloakServiceTest {

    KeycloakService keycloakService;
    Keycloak keycloakMock;
    RealmResource realmResourceMock;
    UsersResource usersResourceMock;
    UserResource userResourceMock;

    @BeforeEach
    public void setup() throws Exception {
        keycloakService = new KeycloakService();
        keycloakMock = mock(Keycloak.class);
        realmResourceMock = mock(RealmResource.class);
        usersResourceMock = mock(UsersResource.class);
        userResourceMock = mock(UserResource.class);

        // Mock chain
        when(keycloakMock.realm(anyString())).thenReturn(realmResourceMock);
        when(realmResourceMock.users()).thenReturn(usersResourceMock);

        // Inject dependencies using reflection
        setField(keycloakService, "targetRealm", "powercards");
        setField(keycloakService, "keycloak", keycloakMock);
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    // ======= registerUser tests =======

    @Test
    public void testRegisterUserSuccess() {
        UserRegistrationRequest request = new UserRegistrationRequest(
                "testuser", "test@example.com", "password", "Test", "User");

        // Mock response for create
        Response createResponse = Response.created(URI.create("http://localhost/users/123")).build();
        when(usersResourceMock.create(any(UserRepresentation.class))).thenReturn(createResponse);
        when(usersResourceMock.get(anyString())).thenReturn(userResourceMock);

        keycloakService.registerUser(request);

        // Verify user creation
        ArgumentCaptor<UserRepresentation> userCaptor = ArgumentCaptor.forClass(UserRepresentation.class);
        verify(usersResourceMock).create(userCaptor.capture());
        UserRepresentation user = userCaptor.getValue();
        assertEquals("testuser", user.getUsername());
        assertEquals("test@example.com", user.getEmail());
        assertTrue(user.isEnabled());

        // Verify password reset
        verify(userResourceMock).resetPassword(any(CredentialRepresentation.class));
    }

    @Test
    public void testRegisterUserAlreadyExists() {
        UserRegistrationRequest request = new UserRegistrationRequest(
                "existing", "test@example.com", "password", "Test", "User");

        Response conflictResponse = Response.status(409).build();
        when(usersResourceMock.create(any(UserRepresentation.class))).thenReturn(conflictResponse);

        assertThrows(WebApplicationException.class, () -> {
            keycloakService.registerUser(request);
        });
    }

    // ======= resolveUser tests =======

    @Test
    public void testResolveUserByUUID() {
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(uuid);
        mockUser.setUsername("testuser");

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(uuid)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        UserRepresentation result = keycloakService.resolveUser(uuid);
        assertNotNull(result);
        assertEquals(uuid, result.getId());
        assertEquals("testuser", result.getUsername());
    }

    @Test
    public void testResolveUserFallbackToUsername() {
        String username = "testuser";
        String realUuid = "550e8400-e29b-41d4-a716-446655440000";

        // UUID lookup fails (interpreting username as UUID)
        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(username)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenThrow(new RuntimeException("404 Not Found"));

        // Username search succeeds
        UserRepresentation mockUserSummary = new UserRepresentation();
        mockUserSummary.setId(realUuid);
        mockUserSummary.setUsername(username);
        when(usersResourceMock.searchByUsername(username, true)).thenReturn(List.of(mockUserSummary));

        // New Step: Fetch full representation by retrieved ID
        UserResource mockRealResource = mock(UserResource.class);
        UserRepresentation mockFullUser = new UserRepresentation();
        mockFullUser.setId(realUuid);
        mockFullUser.setUsername(username);
        mockFullUser.setAttributes(Map.of("ai_api_key", List.of("found-key")));

        when(usersResourceMock.get(realUuid)).thenReturn(mockRealResource);
        when(mockRealResource.toRepresentation()).thenReturn(mockFullUser);

        UserRepresentation result = keycloakService.resolveUser(username);
        assertNotNull(result);
        assertEquals(realUuid, result.getId());
        assertEquals(username, result.getUsername());
        // Verify we got the full user with attributes
        assertNotNull(result.getAttributes());
        assertTrue(result.getAttributes().containsKey("ai_api_key"));
    }

    @Test
    public void testResolveUserNotFound() {
        String unknownId = "nonexistent";

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(unknownId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenThrow(new RuntimeException("404 Not Found"));
        when(usersResourceMock.searchByUsername(unknownId, true)).thenReturn(List.of());

        UserRepresentation result = keycloakService.resolveUser(unknownId);
        assertNull(result);
    }

    // ======= getUserAttribute tests =======

    @Test
    public void testGetUserAttributeReturnsValue() {
        String keycloakId = "user-uuid";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(Map.of("ai_api_key", List.of("sk-test-key-123")));

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        String result = keycloakService.getUserAttribute(keycloakId, "ai_api_key");
        assertEquals("sk-test-key-123", result);
    }

    @Test
    public void testGetUserAttributeReturnsNullWhenMissing() {
        String keycloakId = "user-uuid";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(new HashMap<>());

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        String result = keycloakService.getUserAttribute(keycloakId, "ai_api_key");
        assertNull(result);
    }

    @Test
    public void testGetUserAttributeReturnsNullWhenUserNotFound() {
        String unknownId = "nonexistent";

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(unknownId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenThrow(new RuntimeException("404 Not Found"));
        when(usersResourceMock.searchByUsername(unknownId, true)).thenReturn(List.of());

        String result = keycloakService.getUserAttribute(unknownId, "ai_api_key");
        assertNull(result);
    }

    // ======= setUserAttribute tests =======

    @Test
    public void testSetUserAttributeSetsValue() {
        String keycloakId = "user-uuid";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(new HashMap<>());

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        keycloakService.setUserAttribute(keycloakId, "ai_api_key", "sk-new-key");

        // Verify the user was updated with the new attribute
        ArgumentCaptor<UserRepresentation> captor = ArgumentCaptor.forClass(UserRepresentation.class);
        verify(mockResource).update(captor.capture());
        UserRepresentation updated = captor.getValue();
        assertTrue(updated.getAttributes().containsKey("ai_api_key"));
        assertEquals("sk-new-key", updated.getAttributes().get("ai_api_key").get(0));
    }

    @Test
    public void testSetUserAttributeRemovesOnBlank() {
        String keycloakId = "user-uuid";
        HashMap<String, List<String>> attrs = new HashMap<>();
        attrs.put("ai_api_key", List.of("old-key"));

        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(attrs);

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        keycloakService.setUserAttribute(keycloakId, "ai_api_key", "");

        // Verify the attribute was removed
        ArgumentCaptor<UserRepresentation> captor = ArgumentCaptor.forClass(UserRepresentation.class);
        verify(mockResource).update(captor.capture());
        UserRepresentation updated = captor.getValue();
        assertFalse(updated.getAttributes().containsKey("ai_api_key"));
    }

    @Test
    public void testSetUserAttributeThrowsWhenUserNotFound() {
        String unknownId = "nonexistent";

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(unknownId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenThrow(new RuntimeException("404 Not Found"));
        when(usersResourceMock.searchByUsername(unknownId, true)).thenReturn(List.of());

        assertThrows(RuntimeException.class, () -> {
            keycloakService.setUserAttribute(unknownId, "ai_api_key", "some-key");
        });
    }

    // ======= hasUserAttribute tests =======

    @Test
    public void testHasUserAttributeTrue() {
        String keycloakId = "user-uuid";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(Map.of("ai_api_key", List.of("sk-test-key")));

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        assertTrue(keycloakService.hasUserAttribute(keycloakId, "ai_api_key"));
    }

    @Test
    public void testHasUserAttributeFalse() {
        String keycloakId = "user-uuid";
        UserRepresentation mockUser = new UserRepresentation();
        mockUser.setId(keycloakId);
        mockUser.setAttributes(new HashMap<>());

        UserResource mockResource = mock(UserResource.class);
        when(usersResourceMock.get(keycloakId)).thenReturn(mockResource);
        when(mockResource.toRepresentation()).thenReturn(mockUser);

        assertFalse(keycloakService.hasUserAttribute(keycloakId, "ai_api_key"));
    }
}

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
import org.mockito.Mockito;

import java.net.URI;
import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@QuarkusTest
public class KeycloakServiceTest {

    // construct the service directly or inject it?
    // Since we want to mock the lazy-loaded Keycloak, it's tricky with @InjectMock
    // on the field.
    // But KeycloakService has a private Keycloak field.
    // We can use reflection to set the mock Keycloak.

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
}

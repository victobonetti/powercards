package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import br.com.powercards.services.AIService;
import dev.langchain4j.exception.ModelNotFoundException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import io.quarkus.test.security.TestSecurity;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestSecurity(user = "test-user", roles = "user")
public class AIResourceTest {

    @InjectMock
    AIService aiService;

    @Test
    public void testChatSuccess() {
        Mockito.when(aiService.chat("Hello")).thenReturn("Hello there!");

        given()
                .header("X-Workspace-Id", "1")
                .contentType(ContentType.TEXT)
                .body("Hello")
                .when()
                .post("/v1/ai/chat")
                .then()
                .statusCode(200)
                .body(is("Hello there!"));
    }

    @Test
    public void testChatModelNotFound() {
        Mockito.when(aiService.chat("Hello")).thenThrow(new ModelNotFoundException("Model not found"));

        given()
                .header("X-Workspace-Id", "1")
                .contentType(ContentType.TEXT)
                .body("Hello")
                .when()
                .post("/v1/ai/chat")
                .then()
                .statusCode(503)
                .body(containsString("AI Model not available"));
    }
}

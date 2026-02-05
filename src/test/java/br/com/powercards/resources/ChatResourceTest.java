package br.com.powercards.resources;

import br.com.powercards.domain.entities.Chat;
import br.com.powercards.domain.entities.ChatHistory;
import br.com.powercards.services.AIService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
public class ChatResourceTest {

        @InjectMock
        AIService aiService;

        @BeforeEach
        @Transactional
        public void setUp() {
                ChatHistory.deleteAll();
                Chat.deleteAll();
        }

        @Test
        public void testCreateChat() {
                given()
                                .header("X-Workspace-Id", "1")
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"My Chat\"}")
                                .when()
                                .post("/v1/chats")
                                .then()
                                .statusCode(200)
                                .body("name", equalTo("My Chat"))
                                .body("workspaceId", equalTo("1"));
        }

        @Test
        public void testCreateChatMissingWorkspace() {
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"My Chat\"}")
                                .when()
                                .post("/v1/chats")
                                .then()
                                .statusCode(400);
        }

        @Test
        public void testListChats() {
                // Create two chats
                Chat chat1 = new Chat();
                chat1.workspaceId = "1";
                chat1.name = "Chat 1";
                // To persist in test, we need a transaction.
                // Better to use the endpoint to create or do it in a helper transaction.
                // Let's use RestAssured to create setup

                given().header("X-Workspace-Id", "1").contentType(ContentType.JSON).body("{\"name\": \"Chat 1\"}")
                                .post("/v1/chats");
                given().header("X-Workspace-Id", "1").contentType(ContentType.JSON).body("{\"name\": \"Chat 2\"}")
                                .post("/v1/chats");
                given().header("X-Workspace-Id", "2").contentType(ContentType.JSON).body("{\"name\": \"Chat 3\"}")
                                .post("/v1/chats");

                given()
                                .header("X-Workspace-Id", "1")
                                .when()
                                .get("/v1/chats")
                                .then()
                                .statusCode(200)
                                .body("$", hasSize(2));
        }

        @Test
        public void testSendMessage() {
                // Mock AI response
                Mockito.when(aiService.chat(Mockito.anyString())).thenReturn("I am AI");

                // Create chat
                String chatId = given()
                                .header("X-Workspace-Id", "1")
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Chat 1\"}")
                                .post("/v1/chats")
                                .jsonPath().getString("id");

                // Send message
                given()
                                .header("X-Workspace-Id", "1")
                                .pathParam("id", chatId)
                                .body("Hello AI")
                                .when()
                                .post("/v1/chats/{id}/messages")
                                .then()
                                .statusCode(200)
                                .body("content", equalTo("I am AI"))
                                .body("role", equalTo("ai"));

                // Verify history
                given()
                                .header("X-Workspace-Id", "1")
                                .pathParam("id", chatId)
                                .when()
                                .get("/v1/chats/{id}/history")
                                .then()
                                .statusCode(200)
                                .body("$", hasSize(2)); // User + AI
        }

        @Test
        public void testChatAIError() {
                // Mock AI error
                Mockito.when(aiService.chat(Mockito.anyString()))
                                .thenThrow(new dev.langchain4j.exception.ModelNotFoundException("Model not found"));

                // Create chat
                String chatId = given()
                                .header("X-Workspace-Id", "1")
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Error Chat\"}")
                                .post("/v1/chats")
                                .jsonPath().getString("id");

                // Send message and expect error
                given()
                                .header("X-Workspace-Id", "1")
                                .pathParam("id", chatId)
                                .body("Trigger Error")
                                .when()
                                .post("/v1/chats/{id}/messages")
                                .then()
                                .statusCode(500)
                                .body(equalTo("AI Service Error"));
        }
}

package br.com.powercards.resources;

import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import io.quarkus.test.security.TestSecurity;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestSecurity(user = "test-user", roles = "user")
public class NoteResourceUpdateTest {

    private br.com.powercards.model.Workspace workspace;

    @BeforeEach
    @Transactional
    public void setup() {
        br.com.powercards.domain.entities.AnkiMedia.deleteAll();
        br.com.powercards.model.Card.deleteAll();
        Note.deleteAll();
        br.com.powercards.model.Deck.deleteAll();
        br.com.powercards.model.AnkiTemplate.deleteAll();
        br.com.powercards.model.AnkiField.deleteAll();
        br.com.powercards.model.AnkiModel.deleteAll();
        br.com.powercards.model.Tag.deleteAll();
        br.com.powercards.model.Workspace.deleteAll();

        workspace = new br.com.powercards.model.Workspace();
        workspace.name = "Test Workspace";
        workspace.persist();
    }

    @Test
    public void testUpdateNoteFields() {
        // Create note via API to ensure it's available
        String createBody = "{\"fields\": \"Original\", \"tags\": \"test\"}";

        Integer noteId = given()
                .header("X-Workspace-Id", workspace.id)
                .contentType(ContentType.JSON)
                .body(createBody)
                .when()
                .post("/v1/notes")
                .then()
                .statusCode(201)
                .extract().path("id");

        // Update
        String updateBody = "{\"fields\": \"Updated\", \"tags\": \"test\"}";
        given()
                .header("X-Workspace-Id", workspace.id)
                .contentType(ContentType.JSON)
                .body(updateBody)
                .when()
                .put("/v1/notes/" + noteId)
                .then()
                .statusCode(200)
                .body("fields", is("Updated"));

        // Verify via Get
        given()
                .header("X-Workspace-Id", workspace.id)
                .when()
                .get("/v1/notes/" + noteId)
                .then()
                .statusCode(200)
                .body("fields", is("Updated"));
    }
}

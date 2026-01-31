package br.com.powercards.resources;

import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
public class NoteResourceUpdateTest {

    @BeforeEach
    @Transactional
    public void setup() {
        Note.deleteAll();
    }

    @Test
    public void testUpdateNoteFields() {
        // Create note via API to ensure it's available
        String createBody = "{\"fields\": \"Original\", \"tags\": \"test\"}";

        Integer noteId = given()
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
                .contentType(ContentType.JSON)
                .body(updateBody)
                .when()
                .put("/v1/notes/" + noteId)
                .then()
                .statusCode(200)
                .body("fields", is("Updated"));

        // Verify via Get
        given()
                .when()
                .get("/v1/notes/" + noteId)
                .then()
                .statusCode(200)
                .body("fields", is("Updated"));
    }
}

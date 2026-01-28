package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class NoteResourceTest {

        @Test
        public void testNoteCRUD() {
                // Create a model first (dependency)
                String modelJson = "{\"id\": 401, \"name\": \"Note Model\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(modelJson)
                                .post("/v1/models");

                // Create Note
                String noteJson = "{\"id\": 400, \"guid\": \"note-guid\", \"model\": {\"id\": 401}, \"flds\": \"Front\\u001fBack\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(noteJson)
                                .when().post("/v1/notes")
                                .then()
                                .statusCode(201)
                                .body("id", is(400))
                                .body("flds", is("Front\u001fBack"));

                // Get
                given()
                                .when().get("/v1/notes/400")
                                .then()
                                .statusCode(200)
                                .body("guid", is("note-guid"));

                // Update
                String updatedNoteJson = "{\"id\": 400, \"flds\": \"Updated Front\\u001fUpdated Back\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedNoteJson)
                                .when().put("/v1/notes/400")
                                .then()
                                .statusCode(200)
                                .body("flds", is("Updated Front\u001fUpdated Back"));

                // Delete
                given()
                                .when().delete("/v1/notes/400")
                                .then()
                                .statusCode(204);
        }
}

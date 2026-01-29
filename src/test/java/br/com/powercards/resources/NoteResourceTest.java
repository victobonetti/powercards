package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class NoteResourceTest {

        @Test
        public void testNoteCRUD() {
                // Create a model first (dependency)
                String modelJson = "{\"name\": \"Note Model\"}";
                Integer modelId = given()
                                .contentType(ContentType.JSON)
                                .body(modelJson)
                                .post("/v1/models")
                                .then()
                                .extract().path("id");

                // Create Note
                String noteJson = "{\"modelId\": " + modelId + ", \"fields\": \"Front\\u001fBack\"}";
                Integer noteId = given()
                                .contentType(ContentType.JSON)
                                .body(noteJson)
                                .when().post("/v1/notes")
                                .then()
                                .statusCode(201)
                                .body("id", notNullValue())
                                .body("fields", is("Front\u001fBack"))
                                .extract().path("id");

                // Get
                given()
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Front\u001fBack"));

                // Update
                String updatedNoteJson = "{\"fields\": \"Updated Front\\u001fUpdated Back\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedNoteJson)
                                .when().put("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Front\u001fUpdated Back"));

                // Delete
                given()
                                .when().delete("/v1/notes/" + noteId)
                                .then()
                                .statusCode(204);
        }
}

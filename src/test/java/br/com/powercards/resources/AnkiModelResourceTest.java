package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class AnkiModelResourceTest {

        private br.com.powercards.model.Workspace workspace;

        @org.junit.jupiter.api.BeforeEach
        @jakarta.transaction.Transactional
        void setUp() {
                br.com.powercards.domain.entities.AnkiMedia.deleteAll();
                br.com.powercards.model.Card.deleteAll();
                br.com.powercards.model.Note.deleteAll();
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
        public void testModelCRUD() {
                // Create
                String modelJson = "{\"name\": \"Basic Model\", \"css\": \".card { font-family: arial; }\"}";
                Integer modelId = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType(ContentType.JSON)
                                .body(modelJson)
                                .when().post("/v1/models")
                                .then()
                                .statusCode(201)
                                .body("id", notNullValue())
                                .body("name", is("Basic Model"))
                                .extract().path("id");

                // Get
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/models/" + modelId)
                                .then()
                                .statusCode(200)
                                .body("name", is("Basic Model"));

                // Update
                String updatedModelJson = "{\"name\": \"Improved Basic Model\", \"css\": \".card { font-family: sans-serif; }\"}";
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType(ContentType.JSON)
                                .body(updatedModelJson)
                                .when().put("/v1/models/" + modelId)
                                .then()
                                .statusCode(200)
                                .body("name", is("Improved Basic Model"));

                // Delete
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().delete("/v1/models/" + modelId)
                                .then()
                                .statusCode(204);

                // Verify deleted
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/models/" + modelId)
                                .then()
                                .statusCode(404);
        }
}

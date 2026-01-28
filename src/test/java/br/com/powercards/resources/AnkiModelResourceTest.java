package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class AnkiModelResourceTest {

        @Test
        public void testModelCRUD() {
                // Create
                String modelJson = "{\"id\": 300, \"name\": \"Basic Model\", \"css\": \".card { font-family: arial; }\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(modelJson)
                                .when().post("/v1/models")
                                .then()
                                .statusCode(201)
                                .body("id", is(300))
                                .body("name", is("Basic Model"));

                // Get
                given()
                                .when().get("/v1/models/300")
                                .then()
                                .statusCode(200)
                                .body("name", is("Basic Model"));

                // Update
                String updatedModelJson = "{\"name\": \"Improved Basic Model\", \"css\": \".card { font-family: sans-serif; }\"}";
                given()
                                .contentType(ContentType.JSON)
                                .body(updatedModelJson)
                                .when().put("/v1/models/300")
                                .then()
                                .statusCode(200)
                                .body("name", is("Improved Basic Model"));

                // Delete
                given()
                                .when().delete("/v1/models/300")
                                .then()
                                .statusCode(204);

                // Verify deleted
                given()
                                .when().get("/v1/models/300")
                                .then()
                                .statusCode(404);
        }
}

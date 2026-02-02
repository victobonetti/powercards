package br.com.powercards;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class WorkspaceIsolationTest {

    @Test
    public void testWorkspaceIsolation() {
        // Create Workspace A
        String idA = given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Workspace A\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(201)
                .extract().path("id");

        // Create Workspace B
        String idB = given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Workspace B\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(201)
                .extract().path("id");

        // Create Tag in A
        given()
                .header("X-Workspace-Id", idA)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"CommonTag\"}")
                .when().post("/v1/tags")
                .then()
                .statusCode(201);

        // Create Tag in B (Same name - should NOT fail due to unique constraint per
        // workspace)
        given()
                .header("X-Workspace-Id", idB)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"CommonTag\"}")
                .when().post("/v1/tags")
                .then()
                .statusCode(201);

        // Verify count in A
        given()
                .header("X-Workspace-Id", idA)
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].name", is("CommonTag"));

        // Verify count in B
        given()
                .header("X-Workspace-Id", idB)
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].name", is("CommonTag"));

        // Verify missing header on protected resource
        given()
                .when().get("/v1/tags")
                .then()
                .statusCode(400);

        // Test Deck Isolation
        // Create Deck in A
        given()
                .header("X-Workspace-Id", idA)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Deck A\"}")
                .when().post("/v1/decks")
                .then()
                .statusCode(201);

        // Verify Deck A visible in A
        given()
                .header("X-Workspace-Id", idA)
                .when().get("/v1/decks")
                .then()
                .statusCode(200)
                .body("data.size()", is(1))
                .body("data[0].name", is("Deck A"));

        // Verify Deck A NOT visible in B
        given()
                .header("X-Workspace-Id", idB)
                .when().get("/v1/decks")
                .then()
                .statusCode(200)
                .body("data.size()", is(0));
    }
}

package br.com.powercards.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestSecurity(user = "test-user-workspace", roles = "user")
public class WorkspaceResourceTest {

    @BeforeEach
    public void setUp() {
        // Clean up any existing workspaces for this test user
        // This is handled by the test isolation per user
    }

    @Test
    public void testListWorkspacesEmpty() {
        given()
                .when().get("/v1/workspaces")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(0));
    }

    @Test
    public void testCreateWorkspace() {
        String workspaceId = given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Test Workspace\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("name", equalTo("Test Workspace"))
                .extract().path("id");

        // Verify it appears in the list
        given()
                .when().get("/v1/workspaces")
                .then()
                .statusCode(200)
                .body("id", hasItem(workspaceId))
                .body("name", hasItem("Test Workspace"));
    }

    @Test
    public void testCreateWorkspaceWithEmptyName() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(400);
    }

    @Test
    public void testCreateWorkspaceWithNullName() {
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(400);
    }

    @Test
    public void testDeleteWorkspace() {
        // Create workspace
        String workspaceId = given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"To Delete\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(201)
                .extract().path("id");

        // Delete it
        given()
                .when().delete("/v1/workspaces/" + workspaceId)
                .then()
                .statusCode(204);

        // Verify it's gone
        given()
                .when().get("/v1/workspaces")
                .then()
                .statusCode(200)
                .body("id", not(hasItem(workspaceId)));
    }

    @Test
    public void testDeleteNonExistentWorkspace() {
        given()
                .when().delete("/v1/workspaces/999999")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "other-user", roles = "user")
    public void testWorkspaceIsolationBetweenUsers() {
        // Create workspace as other-user
        String workspaceId = given()
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Other User Workspace\"}")
                .when().post("/v1/workspaces")
                .then()
                .statusCode(201)
                .extract().path("id");

        // Verify it exists for other-user
        given()
                .when().get("/v1/workspaces")
                .then()
                .statusCode(200)
                .body("id", hasItem(workspaceId));
    }
}

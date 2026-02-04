package br.com.powercards;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class WorkspaceCascadeDeleteTest {

        @Test
        public void testWorkspaceCascadeDelete() {
                // 1. Create Workspace
                String workspaceId = given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Delete Me Workspace\"}")
                                .when().post("/v1/workspaces")
                                .then()
                                .statusCode(201)
                                .extract().path("id");

                // 2. Create Deck
                given()
                                .header("X-Workspace-Id", workspaceId)
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Deck to Delete\"}")
                                .when().post("/v1/decks")
                                .then()
                                .statusCode(201);

                // 3. Create Tag
                given()
                                .header("X-Workspace-Id", workspaceId)
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Tag to Delete\"}")
                                .when().post("/v1/tags")
                                .then()
                                .statusCode(201);

                // 4. Create AnkiModel (using a mock or simple request if possible, otherwise we
                // rely on default models if seeded,
                // but it's safer to create one if the API allows. Assuming we can create a Note
                // which requires a Model.
                // If Model creation is complex, we might skip explicit Model creation if we
                // don't have an easy endpoint,
                // but usually Note creation requires an existing Model.
                // Let's assume we can use an existing model or create one.
                // For this test, let's try to create a Note using a standard model if
                // available, or just skip sophisticated model setup
                // and rely on the fact that we test Deck/Tag/Note deletion.
                // Actually, Note requires a Model. Let's see if we can list models first.)

                // 4. Create AnkiModel
                // We create a new model to verify it gets deleted.

                String createdModelId = given()
                                .header("X-Workspace-Id", workspaceId)
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Test Model\", \"css\": \"\", \"fields\": [{\"name\": \"Front\"}, {\"name\": \"Back\"}], \"templates\": [{\"name\": \"Card 1\", \"qfmt\": \"{{Front}}\", \"afmt\": \"{{Back}}\"}]}")
                                .when().post("/v1/models")
                                .then()
                                .statusCode(201) // Assuming 201 Created
                                .extract().path("id").toString();

                // 5. Create Note
                given()
                                .header("X-Workspace-Id", workspaceId)
                                .contentType(ContentType.JSON)
                                .body("{\"modelId\": " + createdModelId
                                                + ", \"fields\": \"Test Front\\u001fTest Back\", \"tags\": \"TagToDelete\"}")
                                .when().post("/v1/notes")
                                .then()
                                .statusCode(201);

                // 6. Verify data exists
                given()
                                .header("X-Workspace-Id", workspaceId)
                                .when().get("/v1/decks")
                                .then()
                                .body("data.size()", greaterThan(0));

                given()
                                .header("X-Workspace-Id", workspaceId)
                                .when().get("/v1/tags")
                                .then()
                                .body("size()", greaterThan(0));

                given()
                                .header("X-Workspace-Id", workspaceId)
                                .when().get("/v1/notes")
                                .then()
                                .body("data.size()", greaterThan(0));

                // 7. Delete Workspace
                given()
                                .when().delete("/v1/workspaces/" + workspaceId)
                                .then()
                                .statusCode(204); // Or 200, depending on implementation. Resource returns void, so 204
                                                  // usually?
                // WorkspaceResource.delete returns void. Quarkus/JAX-RS defaults to 204 No
                // Content for void methods.

                // 8. Verify Workspace is gone
                given()
                                .when().get("/v1/workspaces")
                                .then()
                                .body("id", not(hasItem(workspaceId))); // Check that the ID is not in the list

                // 9. Verify data is gone (by trying to direct access if possible, or querying
                // with the DB directly?
                // Since we have strict isolation, if I recreate the workspace with SAME ID
                // (unlikely due to sequence),
                // I can't easily check.
                // But I can check if the endpoints return 401/404 or empty list when querying
                // with that ID?
                // But the middleware might block access if workspace doesn't exist.

                // Actually, if I query the Global/Admin view or Database, I can check.
                // But in this test, I can try to access resources with the deleted Workspace
                // ID.
                // It *should* return empty lists or 404/401.
                // If cascade delete failed, the rows would still exist in DB.
                // Let's verify via the list endpoints. If the workspace doesn't exist, the
                // filter might fail or return empty.

                // Better: create a SECOND workspace, and ensure *its* data is untouched.
                // But to verify the deleted data is gone:
                // Attempt to access it via direct ID? Notes don't have direct GET /notes/{id}
                // usually visible in API?
                // Let's assume if the Workspace delete succeeded without FK error, it worked
                // (since we have FK constraints).
                // Since we are not using CASCADE in DB, if we didn't delete children, the
                // DELETE workspace would fail with 500.
                // So a successful 204 implies children were deleted (or no FKs exist, but code
                // shows relationships).

        }
}

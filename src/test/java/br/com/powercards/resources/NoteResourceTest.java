package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import jakarta.inject.Inject;
import jakarta.transaction.UserTransaction;

@QuarkusTest
@TestSecurity(user = "test-user", roles = "user")
public class NoteResourceTest {

        @Inject
        UserTransaction userTransaction;

        @io.quarkus.test.InjectMock
        br.com.powercards.services.AIEnhancementService aiEnhancementService;

        private br.com.powercards.model.Workspace workspace;

        @BeforeEach
        @Transactional
        void setUp() {
                br.com.powercards.domain.entities.AnkiMedia.deleteAll();
                br.com.powercards.model.Card.deleteAll();
                br.com.powercards.model.NoteDraft.deleteAll();
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

                for (int i = 0; i < 15; i++) {
                        Note note = new Note();
                        note.flds = "Note " + i + (i % 2 == 0 ? " even" : " odd");
                        note.tags = "tag" + i;
                        note.workspace = workspace;
                        note.persist();
                }
        }

        @Test
        public void testListPagination() {
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("page", 1)
                                .queryParam("perPage", 10)
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(10))
                                .body("pagination.total", is(15))
                                .body("pagination.page", is(1));

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("page", 2)
                                .queryParam("perPage", 10)
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(5))
                                .body("pagination.page", is(2));
        }

        @Test
        public void testListSearch() {
                // Search by content
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("search", "even")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(8)); // 0, 2, ... 14 -> 8 numbers

                // Search by tag
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("search", "tag=tag1")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data[0].tags", is("tag1"));
        }

        @Test
        public void testListSort() {
                // Sort by id desc
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("sort", "-id")
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data[0].fields", containsString("Note 14"));
        }

        @Test
        public void testUpdateNoteFields() {
                // Use an existing note
                Note note = Note.<Note>listAll().get(0);
                Long noteId = note.id;

                // Update flds
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Updated Fields\", \"tags\": \"original\"}")
                                .when().put("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));

                // Verify persistence
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Updated Fields"));
        }

        @Test
        public void testBulkTags() {
                java.util.List<Note> notes = Note.listAll();
                Note n1 = notes.get(1);
                Note n2 = notes.get(2);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"noteIds\": [" + n1.id + ", " + n2.id + "], \"tags\": [\"bulk1\", \"bulk2\"]}")
                                .when().post("/v1/notes/bulk/tags")
                                .then()
                                .statusCode(204);
        }

        @Test
        public void testBulkDelete() {
                java.util.List<Note> notes = Note.listAll();
                Note n1 = notes.get(3);
                Note n2 = notes.get(4);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"ids\": [" + n1.id + ", " + n2.id + "]}")
                                .when().post("/v1/notes/bulk/delete")
                                .then()
                                .statusCode(204);

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + n1.id)
                                .then()
                                .statusCode(404);
        }

        @Test
        public void testDraftLifecycle() {
                // 1. Create a note via API to ensure visibility in separate transaction
                io.restassured.response.Response createResp = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Original Content\", \"tags\": \"original\"}")
                                .when().post("/v1/notes");

                createResp.then().statusCode(201);
                Long noteId = createResp.jsonPath().getLong("id");

                System.out.println("DEBUG: Created Note ID via API: " + noteId);

                // 2. Create Draft
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Draft Content\", \"tags\": \"draft\"}")
                                .when().post("/v1/notes/" + noteId + "/draft")
                                .then()
                                .statusCode(204);

                // 3. GET should return Draft content
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Draft Content"))
                                .body("tags", is("draft"))
                                .body("isDraft", is(true));

                // 4. PUT (Save) should clear draft and update note
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Final Content\", \"tags\": \"final\"}")
                                .when().put("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200);

                // 5. GET should now return Final content and isDraft=false
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .statusCode(200)
                                .body("fields", is("Final Content"))
                                .body("tags", is("final"))
                                .body("isDraft", is(false));

                // 6. Verify Draft is gone from DB
                // Since tests are @Transactional, we can check DB directly or trust API result
                long draftCount = br.com.powercards.model.NoteDraft.count("note.id", noteId);
                assert draftCount == 0;
        }

        @Test
        public void testBatchEnhance() {
                // 1. Create 2 notes
                io.restassured.response.Response resp1 = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Note1 Field1\", \"tags\": \"tag1\"}")
                                .when().post("/v1/notes");
                Long id1 = resp1.jsonPath().getLong("id");

                io.restassured.response.Response resp2 = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Note2 Field1\", \"tags\": \"tag2\"}")
                                .when().post("/v1/notes");
                Long id2 = resp2.jsonPath().getLong("id");

                // 2. Mock AI Service
                org.mockito.Mockito.when(aiEnhancementService.enhanceModel(org.mockito.ArgumentMatchers.anyList()))
                                .thenAnswer(invocation -> {
                                        java.util.List<String> input = invocation.getArgument(0);
                                        if (input.contains("Note1 Field1")) {
                                                return java.util.List.of("Enhanced Note1");
                                        } else if (input.contains("Note2 Field1")) {
                                                return java.util.List.of("Enhanced Note2");
                                        }
                                        return input;
                                });

                // 3. Call Batch Enhance
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"noteIds\": [" + id1 + ", " + id2 + "]}")
                                .when().post("/v1/notes/bulk/enhance")
                                .then()
                                .statusCode(204);

                // 4. Verify Drafts
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + id1)
                                .then()
                                .body("isDraft", is(true))
                                .body("fields", is("Enhanced Note1"));

                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + id2)
                                .then()
                                .body("isDraft", is(true))
                                .body("fields", is("Enhanced Note2"));
        }

        @Test
        public void testDiscardDraft() {
                // 1. Create Note
                io.restassured.response.Response response = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Original\", \"tags\": \"tag1\"}")
                                .when().post("/v1/notes");
                Long noteId = response.jsonPath().getLong("id");

                // 2. Create Draft
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Draft\", \"tags\": \"tag1\"}")
                                .when().post("/v1/notes/" + noteId + "/draft")
                                .then()
                                .statusCode(204);

                // 3. Verify Draft Exists
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .body("isDraft", is(true))
                                .body("fields", is("Draft"));

                // 4. Discard Draft
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().delete("/v1/notes/" + noteId + "/draft")
                                .then()
                                .statusCode(204);

                // 5. Verify Draft is Gone (Original returned)
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .body("isDraft", is(false))
                                .body("fields", is("Original"));
        }

        @Test
        public void testOriginalContentRetrieval() {
                // 1. Create Note
                io.restassured.response.Response response = given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Original\", \"tags\": \"tag1\"}")
                                .when().post("/v1/notes");
                Long noteId = response.jsonPath().getLong("id");

                // 2. Create Draft
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .contentType("application/json")
                                .body("{\"fields\": \"Draft\", \"tags\": \"tag1\"}")
                                .when().post("/v1/notes/" + noteId + "/draft")
                                .then()
                                .statusCode(204);

                // 3. Get with draft=true (default)
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .body("fields", is("Draft"));

                // 4. Get with draft=false (expect Original)
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("draft", false)
                                .when().get("/v1/notes/" + noteId)
                                .then()
                                .body("fields", is("Original"));
        }

        @Test
        public void testListWithDeckFilterAndSort() throws Exception {
                userTransaction.begin();
                br.com.powercards.model.Deck deck = new br.com.powercards.model.Deck();
                try {
                        // 1. Create Deck and Cards
                        deck.name = "Test Deck";
                        // Reattach workspace if needed, or rely on merge
                        // Since workspace is detached, we need to find it or merge it
                        // But simpler might be to findById inside transaction
                        br.com.powercards.model.Workspace ws = br.com.powercards.model.Workspace.findById(workspace.id);
                        deck.workspace = ws;
                        deck.persist();

                        Note note = new Note();
                        note.flds = "New Note";
                        note.workspace = ws;
                        note.persist();

                        Card card = new Card();
                        card.deck = deck;
                        card.note = note;
                        card.persist();

                        userTransaction.commit();
                } catch (Exception e) {
                        userTransaction.rollback();
                        throw e;
                }

                // 2. List with deckId and sort=id (triggers join and ambiguity if not fixed)
                given()
                                .header("X-Workspace-Id", workspace.id)
                                .queryParam("deckId", deck.id)
                                .queryParam("sort", "id") // Ambiguous without alias!
                                .when().get("/v1/notes")
                                .then()
                                .statusCode(200)
                                .body("data.size()", is(1));
        }
}

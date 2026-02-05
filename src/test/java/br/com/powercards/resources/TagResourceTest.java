package br.com.powercards.resources;

import br.com.powercards.model.Tag;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.CoreMatchers.is;
import io.quarkus.test.security.TestSecurity;
import static org.hamcrest.Matchers.empty;

@QuarkusTest
@TestSecurity(user = "test-user", roles = "user")
public class TagResourceTest {

    private br.com.powercards.model.Workspace workspace;

    @BeforeEach
    @Transactional
    void setUp() {
        br.com.powercards.domain.entities.AnkiMedia.deleteAll();
        br.com.powercards.model.Card.deleteAll();
        br.com.powercards.model.Note.deleteAll();
        br.com.powercards.model.Deck.deleteAll();
        br.com.powercards.model.AnkiTemplate.deleteAll();
        br.com.powercards.model.AnkiField.deleteAll();
        br.com.powercards.model.AnkiModel.deleteAll();
        Tag.deleteAll();
        br.com.powercards.model.Workspace.deleteAll();

        workspace = new br.com.powercards.model.Workspace();
        workspace.name = "Test Workspace";
        workspace.persist();

        Tag t1 = new Tag();
        t1.name = "urgent";
        t1.workspace = workspace;
        t1.persist();

        Tag t2 = new Tag();
        t2.name = "important";
        t2.workspace = workspace;
        t2.persist();

        Tag t3 = new Tag();
        t3.name = "waiting";
        t3.workspace = workspace;
        t3.persist();
    }

    @Test
    public void testListSearch() {
        given()
                .header("X-Workspace-Id", workspace.id)
                .queryParam("search", "urg")
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("name", hasItem("urgent"));

        given()
                .header("X-Workspace-Id", workspace.id)
                .queryParam("search", "nt")
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(2)); // urgent, important
    }

    @Test
    public void testListLimit() {
        // Create more tags
        createTags(15);

        given()
                .header("X-Workspace-Id", workspace.id)
                .when().get("/v1/tags")
                .then()
                .statusCode(200)
                .body("size()", is(10));
    }

    @Test
    public void testTagStats() {
        // Create notes with tags
        createNoteWithTags("urgent", "important");
        createNoteWithTags("urgent");
        createNoteWithTags("other");

        given()
                .header("X-Workspace-Id", workspace.id)
                .when().get("/v1/tags/stats")
                .then()
                .statusCode(200)
                .body("data.find { it.name == 'urgent' }.noteCount", is(2))
                .body("data.find { it.name == 'important' }.noteCount", is(1))
                .body("data.find { it.name == 'waiting' }.noteCount", is(0));
    }

    @Test
    public void testDeleteTagCascade() {
        createNoteWithTags("urgent", "important");

        Tag tag = Tag.find("name = ?1 and workspace.id = ?2", "urgent", workspace.id).firstResult();
        // Since tag name + workspace is unique, this should find our tag associated
        // with this workspace

        given()
                .header("X-Workspace-Id", workspace.id)
                .when().delete("/v1/tags/" + tag.id)
                .then()
                .statusCode(204);

        // Verify tag is gone from Note
        br.com.powercards.model.Note note = br.com.powercards.model.Note.find("workspace.id", workspace.id)
                .firstResult();
        // The tag "urgent" should be removed. "important" should remain.
        // Logic implemented: TRIM(REPLACE(concat(' ', n.tags, ' '), concat(' ',
        // :tagName, ' '), ' '))
        // " urgent important " -> replace " urgent " with " " -> " important " -> trim
        // -> "important"
        assert !note.tags.contains("urgent");
        assert note.tags.contains("important");
    }

    @Transactional
    void createNoteWithTags(String... tags) {
        br.com.powercards.model.Note note = new br.com.powercards.model.Note();
        note.tags = String.join(" ", tags);
        note.workspace = workspace;
        note.model = new br.com.powercards.model.AnkiModel();
        note.model.workspace = workspace;
        note.model.persist(); // simple persist
        note.persist();
    }

    @Transactional
    void createTags(int count) {
        for (int i = 0; i < count; i++) {
            Tag t = new Tag();
            t.name = "generated_" + i;
            t.workspace = workspace;
            t.persist();
        }
    }
}

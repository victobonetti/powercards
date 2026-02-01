package br.com.powercards;

import br.com.powercards.domain.entities.AnkiMedia;
import br.com.powercards.model.Note;
import br.com.powercards.services.AnkiService;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class AnkiMediaReplacementTest {

    @Inject
    AnkiService ankiService;

    @Test
    @TestTransaction
    public void testMediaReplacementPatterns() {
        Long noteId = 999L;
        String minioBaseUrl = "http://localhost:9000/anki-media/";

        // Setup mock media
        new AnkiMedia(noteId, "cat.png", minioBaseUrl + "cat.png").persist();
        new AnkiMedia(noteId, "meow.mp3", minioBaseUrl + "meow.mp3").persist();
        new AnkiMedia(noteId, "dog.jpg", minioBaseUrl + "dog.jpg").persist();

        // 1. Test standard img src replacement (with quotes)
        String content1 = "Look at this <img src=\"cat.png\">";
        String result1 = ankiService.replaceMediaWithUrls(noteId, content1);
        assertEquals("Look at this <img src=\"" + minioBaseUrl + "cat.png\">", result1);

        // 2. Test user's img= replacement (no quotes mentions)
        String content2 = "Another image img=cat.png inside";
        String result2 = ankiService.replaceMediaWithUrls(noteId, content2);
        assertEquals("Another image src=\"" + minioBaseUrl + "cat.png\" inside", result2);

        // 2b. Test single quotes and no quotes in src
        assertEquals("src=\"" + minioBaseUrl + "cat.png\"", ankiService.replaceMediaWithUrls(noteId, "src='cat.png'"));
        assertEquals("src=\"" + minioBaseUrl + "cat.png\"", ankiService.replaceMediaWithUrls(noteId, "src=cat.png"));

        // 2c. Test spaces around =
        assertEquals("src=\"" + minioBaseUrl + "cat.png\"",
                ankiService.replaceMediaWithUrls(noteId, "src  =  \"cat.png\""));
        assertEquals("src=\"" + minioBaseUrl + "cat.png\"", ankiService.replaceMediaWithUrls(noteId, "img = cat.png"));

        // 2d. Test termination before unit separator
        String contentWithUS = "src=cat.png\u001fNextField";
        assertEquals("src=\"" + minioBaseUrl + "cat.png\"\u001fNextField",
                ankiService.replaceMediaWithUrls(noteId, contentWithUS));

        // 3. Test [sound:...] replacement
        String content3 = "Listen: [sound:meow.mp3]";
        String result3 = ankiService.replaceMediaWithUrls(noteId, content3);
        assertEquals("Listen: <audio controls src=\"" + minioBaseUrl + "meow.mp3\"></audio>", result3);

        // 4. Test [source:...] replacement
        String content4 = "Source sound: [source:meow.mp3]";
        String result4 = ankiService.replaceMediaWithUrls(noteId, content4);
        assertEquals("Source sound: <audio controls src=\"" + minioBaseUrl + "meow.mp3\"></audio>", result4);

        // 5. Test missing media (should remain unchanged or follow fallback)
        String content5 = "Unknown <img src=\"missing.png\"> and [sound:missing.mp3]";
        String result5 = ankiService.replaceMediaWithUrls(noteId, content5);
        assertEquals(content5, result5, "Missing media should not be replaced");

        // 6. Test complex filename with dashes (reported by user)
        String complexFile = "image-650be0aafaee818e5f824b2dd4990090da291019.png";
        new AnkiMedia(noteId, complexFile, minioBaseUrl + complexFile).persist();
        String contentComplex = "<img src=\"" + complexFile + "\">";
        assertEquals("<img src=\"" + minioBaseUrl + complexFile + "\">",
                ankiService.replaceMediaWithUrls(noteId, contentComplex));
    }

    @Test
    @TestTransaction
    public void testDatabaseStaysIntactAfterReplacement() {
        // Create a real note
        Note note = new Note();
        note.flds = "Original content with [sound:meow.mp3]";
        note.persist();
        Long noteId = note.id;

        // Setup media
        new AnkiMedia(noteId, "meow.mp3", "http://minio/meow.mp3").persist();

        // Trigger replacement (what resource does during rendering)
        String renderedContent = ankiService.replaceMediaWithUrls(noteId, note.flds);

        // Verify replacement happened in result
        assertTrue(renderedContent.contains("<audio"), "Content should be rendered");

        // Verify entity in DB is UNCHANGED
        Note fetchedNote = Note.findById(noteId);
        assertEquals("Original content with [sound:meow.mp3]", fetchedNote.flds,
                "Database content must remain original");
    }
}

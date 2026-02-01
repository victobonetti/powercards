package br.com.powercards.services;

import br.com.powercards.domain.entities.AnkiMedia;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
public class AnkiServiceTest {

    @Inject
    AnkiService ankiService;

    private static final Long NOTE_ID = 123L;

    @BeforeEach
    @Transactional
    public void setup() {
        AnkiMedia.deleteAll();

        new AnkiMedia(NOTE_ID, "image1.jpg", "http://minio/bucket/image1.jpg").persist();
        new AnkiMedia(NOTE_ID, "audio1.mp3", "http://minio/bucket/audio1.mp3").persist();
        new AnkiMedia(NOTE_ID, "nested/path/image2.png", "http://minio/bucket/image2.png").persist();
    }

    @Test
    public void testReplaceNoMedia() {
        String content = "This is a simple text with no media.";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(content, result);
    }

    @Test
    public void testReplaceImage() {
        String content = "Here is an image: <img src=\"image1.jpg\"> and another text.";
        String expected = "Here is an image: <img src=\"http://minio/bucket/image1.jpg\"> and another text.";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(expected, result);
    }

    @Test
    public void testReplaceAudio() {
        String content = "Listen to this: [sound:audio1.mp3] end.";
        String expected = "Listen to this: [sound:http://minio/bucket/audio1.mp3] end.";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(expected, result);
    }

    @Test
    public void testReplaceMixed() {
        String content = "Image <img src=\"image1.jpg\"> and Sound [sound:audio1.mp3]";
        String expected = "Image <img src=\"http://minio/bucket/image1.jpg\"> and Sound [sound:http://minio/bucket/audio1.mp3]";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(expected, result);
    }

    @Test
    public void testReplaceMultipleSameType() {
        String content = "<img src=\"image1.jpg\"><img src=\"image1.jpg\">";
        String expected = "<img src=\"http://minio/bucket/image1.jpg\"><img src=\"http://minio/bucket/image1.jpg\">";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(expected, result);
    }

    @Test
    public void testReplaceMissingMedia() {
        String content = "Missing <img src=\"unknown.jpg\"> and [sound:missing.mp3]";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(content, result);
    }

    @Test
    public void testReplaceWithNestedPath() {
        String content = "Nested <img src=\"nested/path/image2.png\">";
        String expected = "Nested <img src=\"http://minio/bucket/image2.png\">";
        String result = ankiService.replaceMediaWithUrls(NOTE_ID, content);
        assertEquals(expected, result);
    }
}

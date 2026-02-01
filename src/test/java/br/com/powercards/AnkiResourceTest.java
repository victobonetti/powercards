package br.com.powercards;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@QuarkusTest
public class AnkiResourceTest {

        private Path tempTestDir;
        private File apkgFile;

        @BeforeEach
        public void setUp() throws Exception {
                tempTestDir = Files.createTempDirectory("anki_upload_test");
                createSyntheticApkg();
        }

        @AfterEach
        public void tearDown() throws IOException {
                if (tempTestDir != null) {
                        Files.walkFileTree(tempTestDir, new SimpleFileVisitor<Path>() {
                                @Override
                                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
                                                throws IOException {
                                        Files.delete(file);
                                        return FileVisitResult.CONTINUE;
                                }

                                @Override
                                public FileVisitResult postVisitDirectory(Path dir, IOException exc)
                                                throws IOException {
                                        Files.delete(dir);
                                        return FileVisitResult.CONTINUE;
                                }
                        });
                }
        }

        private void createSyntheticApkg() throws Exception {
                Path dbPath = tempTestDir.resolve("collection.anki21");
                String url = "jdbc:sqlite:" + dbPath.toAbsolutePath();

                try (Connection conn = DriverManager.getConnection(url);
                                Statement stmt = conn.createStatement()) {

                        stmt.execute(
                                        "CREATE TABLE col (id INTEGER PRIMARY KEY, crt INTEGER, mod INTEGER, scm INTEGER, ver INTEGER, dty INTEGER, usn INTEGER, ls INTEGER, conf TEXT, models TEXT, decks TEXT, dconf TEXT, tags TEXT)");
                        stmt.execute(
                                        "CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, mod INTEGER, usn INTEGER, tags TEXT, flds TEXT, sfld TEXT, csum INTEGER, flags INTEGER, data TEXT)");
                        stmt.execute(
                                        "CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER, ord INTEGER, mod INTEGER, usn INTEGER, type INTEGER, queue INTEGER, due INTEGER, ivl INTEGER, factor INTEGER, reps INTEGER, lapses INTEGER, left INTEGER, odue INTEGER, odid INTEGER, flags INTEGER, data TEXT)");
                        stmt.execute(
                                        "CREATE TABLE revlog (id INTEGER PRIMARY KEY, cid INTEGER, usn INTEGER, ease INTEGER, ivl INTEGER, lastIvl INTEGER, factor INTEGER, time INTEGER, type INTEGER)");
                        stmt.execute("CREATE TABLE graves (usn INTEGER, oid INTEGER, type INTEGER)");

                        String decksJson = "{\"1\": {\"name\": \"Default\", \"id\": 1}, \"100\": {\"name\": \"Test Deck Upload\", \"id\": 100}}";
                        String modelsJson = "{\"1\": {\"id\": 1, \"name\": \"Basic\", \"css\": \"\", \"flds\": [{\"name\": \"Front\", \"ord\": 0}, {\"name\": \"Back\", \"ord\": 1}], \"tmpls\": [{\"name\": \"Card 1\", \"qfmt\": \"{{Front}}\", \"afmt\": \"{{Back}}\", \"ord\": 0}]}}";

                        stmt.execute(
                                        "INSERT INTO col (id, decks, models, crt, mod, scm, ver, dty, usn, ls, conf, dconf, tags) VALUES (1, '"
                                                        + decksJson + "', '" + modelsJson
                                                        + "', 0, 0, 0, 11, 0, 0, 0, '{}', '{}', '{}')");

                        long uniqueId = System.currentTimeMillis();
                        stmt.execute(
                                        "INSERT INTO notes (id, guid, flds, mid) VALUES (10, 'guid" + uniqueId
                                                        + "', 'Front"
                                                        + (char) 31 + "Back', 1)");
                        stmt.execute("INSERT INTO cards (id, nid, did, ord) VALUES (1000, 10, 100, 0)");
                }

                apkgFile = tempTestDir.resolve("test.apkg").toFile();
                try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(apkgFile))) {
                        ZipEntry entry = new ZipEntry("collection.anki21");
                        zos.putNextEntry(entry);
                        Files.copy(dbPath, zos);
                        zos.closeEntry();
                }
        }

        @Test
        public void testUploadAndPersistence() {
                // Extract generated IDs from response
                io.restassured.response.ExtractableResponse<io.restassured.response.Response> response = given()
                                .multiPart("file", apkgFile)
                                .when()
                                .post("/v1/anki/upload")
                                .then()
                                .statusCode(200)
                                .body("decks.size()", greaterThanOrEqualTo(1))
                                .body("importedNotes", greaterThanOrEqualTo(1))
                                .extract();

                Integer deckId = response.path("decks[0].id");
                String deckName = response.path("decks[0].name");

                // Verify Deck CRUD
                given()
                                .when().get("/v1/decks/" + deckId)
                                .then()
                                .statusCode(200)
                                .body("name", is(deckName));
        }

        @Test
        public void testDuplicateAndForceUpload() {
                // 1. First Upload
                given()
                                .multiPart("file", apkgFile)
                                .when()
                                .post("/v1/anki/upload")
                                .then()
                                .statusCode(200)
                                .body("importedNotes", is(1))
                                .body("skippedNotes", is(0));

                // 2. Duplicate Upload (Force = false by default or explicit)
                given()
                                .multiPart("file", apkgFile)
                                .multiPart("force", "false")
                                .when()
                                .post("/v1/anki/upload")
                                .then()
                                .statusCode(200)
                                .body("importedNotes", is(0))
                                .body("updatedNotes", is(0))
                                .body("skippedNotes", is(1))
                                .body("status", is("SKIPPED"));

                // 3. Force Upload
                given()
                                .multiPart("file", apkgFile)
                                .multiPart("force", "true")
                                .when()
                                .post("/v1/anki/upload")
                                .then()
                                .statusCode(200)
                                .body("importedNotes", is(0))
                                .body("updatedNotes", is(1))
                                .body("skippedNotes", is(0));
        }
}

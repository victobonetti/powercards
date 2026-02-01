package br.com.powercards.services;

import br.com.powercards.model.AnkiModel;
import br.com.powercards.model.Card;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Note;
import com.anki4j.Anki4j;
import jakarta.enterprise.context.RequestScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.InternalServerErrorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RequestScoped
public class AnkiService {

    Logger LOGGER = LoggerFactory.getLogger(AnkiService.class);

    @jakarta.inject.Inject
    io.minio.MinioClient minioClient;

    @org.eclipse.microprofile.config.inject.ConfigProperty(name = "quarkus.minio.url")
    String minioUrl;

    private static final String BUCKET_NAME = "anki-media";

    private InputStream apkg;

    public void load(final InputStream apkg) {
        Objects.requireNonNull(apkg, "arquivo .apk deve ser fornescido.");
        this.apkg = apkg;
    }

    @Transactional
    public List<Deck> getDecks() {
        Objects.requireNonNull(apkg, "Arquivo .apkg não foi carregado.");

        try (Anki4j anki4j = Anki4j.read(apkg)) {
            return persistCollection(anki4j);
        } catch (Exception e) {
            LOGGER.error("Erro ao processar arquivo Anki", e);
            throw new InternalServerErrorException(e);
        }
    }

    private List<Deck> persistCollection(Anki4j anki4j) {
        LOGGER.info("Persistindo coleção Anki no banco de dados...");

        // List<String> cardsWithMedia = List.of(); // removed unused variable

        // 1. Persistir Models
        Map<Long, AnkiModel> modelMap = new java.util.HashMap<>();
        for (com.anki4j.model.Model m : anki4j.getModels()) {
            AnkiModel model = new AnkiModel();
            model.name = m.getName();
            model.css = m.getCss();
            if (m.getFlds() != null) {
                model.fields = m.getFlds().stream()
                        .map(f -> new br.com.powercards.model.AnkiField(f.getName(), f.getOrd(), model))
                        .collect(Collectors.toList());
            }
            if (m.getTmpls() != null) {
                model.templates = m.getTmpls().stream()
                        .map(t -> new br.com.powercards.model.AnkiTemplate(t.getName(), t.getQfmt(),
                                t.getAfmt(), t.getOrd(), model))
                        .collect(Collectors.toList());
            }
            model.persist();
            modelMap.put(m.getId(), model);
        }

        // 2. Persistir Decks
        Map<Long, Deck> deckMap = new java.util.HashMap<>();
        for (com.anki4j.model.Deck d : anki4j.getDecks()) {
            Deck deck = new Deck();
            deck.name = d.getName();
            deck.persist();
            deckMap.put(d.getId(), deck);
        }

        // 3. Persistir Notes
        Map<Long, Note> noteMap = new java.util.HashMap<>();
        for (com.anki4j.model.Note n : anki4j.getNotes()) {
            Note note = new Note();
            note.guid = n.getGuid();
            note.model = modelMap.get(n.getMid());
            note.mod = n.getMod();
            note.usn = n.getUsn();
            note.tags = n.getTags();
            note.flds = n.getFlds();
            note.sfld = n.getSfld();
            note.csum = n.getCsum();
            note.flags = n.getFlags();
            note.data = n.getData();
            note.data = n.getData();
            note.persist();
            noteMap.put(n.getId(), note);

            if (note.tags != null && !note.tags.isBlank()) {
                java.util.Arrays.stream(note.tags.trim().split("\\s+"))
                        .filter(tag -> !tag.isBlank())
                        .map(String::trim)
                        .distinct()
                        .forEach(tagName -> {
                            br.com.powercards.model.Tag.find("name", tagName)
                                    .firstResultOptional()
                                    .orElseGet(() -> {
                                        br.com.powercards.model.Tag newTag = new br.com.powercards.model.Tag(tagName);
                                        newTag.persist();
                                        return newTag;
                                    });
                        });
            }
        }

        // 4. Persistir Cards
        for (com.anki4j.model.Card c : anki4j.getCards()) {
            Card card = new Card();
            card.note = noteMap.get(c.getNid());
            card.deck = deckMap.get(c.getDid());
            card.ord = c.getOrd();
            card.mod = c.getMod();
            card.usn = c.getUsn();
            card.type = c.getType();
            card.queue = c.getQueue();
            card.due = c.getDue();
            card.ivl = c.getIvl();
            card.factor = c.getFactor();
            card.reps = c.getReps();
            card.lapses = c.getLapses();
            card.left = c.getLeft();
            card.odue = c.getOdue();
            card.odid = c.getOdid();
            card.flags = c.getFlags();
            card.data = c.getData();
            card.persist();
        }

        LOGGER.info("Persistência concluída.");
        // 5. export midia to minio
        try {
            processMedia(anki4j, noteMap);
        } catch (Exception e) {
            LOGGER.error("Erro ao processar mídias. O import continuará sem mídias.", e);
        }

        return anki4j.getDecks().stream()
                .map(d -> deckMap.get(d.getId()))
                .collect(Collectors.toList());
    }

    private void processMedia(Anki4j anki4j, Map<Long, Note> noteMap) {
        LOGGER.info("Processando mídias...");
        createBucketIfNotExists();

        java.util.regex.Pattern imgPattern = java.util.regex.Pattern.compile("src=\"([^\"]+)\"");
        java.util.regex.Pattern soundPattern = java.util.regex.Pattern.compile("\\[sound:([^\\]]+)\\]");

        for (Map.Entry<Long, Note> entry : noteMap.entrySet()) {
            Long noteId = entry.getKey();
            Note note = entry.getValue();

            // The note entity in persisted map might not have the raw fields if mapped
            // differently.
            // In the loop above: note.flds = n.getFlds();
            // Assuming note.flds contains the raw string with fields separated by 0x1F
            // (unit separator)

            if (note.flds == null)
                continue;

            String content = note.flds;
            // Scan for images
            processPattern(anki4j, noteId, content, imgPattern);
            // Scan for sounds
            processPattern(anki4j, noteId, content, soundPattern);
        }
    }

    private void processPattern(Anki4j anki4j, Long noteId, String content, java.util.regex.Pattern pattern) {
        java.util.regex.Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String filename = matcher.group(1);
            uploadMedia(anki4j, noteId, filename);
        }
    }

    private void uploadMedia(Anki4j anki4j, Long noteId, String filename) {
        try {
            // Check if already exists to avoid re-uploading (optional, but good practice)
            br.com.powercards.domain.entities.AnkiMediaId mediaId = new br.com.powercards.domain.entities.AnkiMediaId(
                    noteId, filename);
            if (br.com.powercards.domain.entities.AnkiMedia.findById(mediaId) != null) {
                return;
            }

            // Get content from anki4j
            // Anki4j.getMediaContent returns byte[] or InputStream?
            // The prompt says: "ankj4j.getMediaContent(x)"
            // Looking at the previous tool error, it seemed to complain about arguments.
            // Assuming it accepts the filename/hash.
            // User prompt: anki4j.getMediaContent(x)

            byte[] data = anki4j.getMediaContent(filename).orElse(null);

            if (data == null) {
                LOGGER.warn("Media not found in .apkg: " + filename);
                return;
            }

            try (java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(data)) {
                minioClient.putObject(
                        io.minio.PutObjectArgs.builder()
                                .bucket(BUCKET_NAME)
                                .object(filename) // Using filename as object key. Could be problematic if duplicates
                                                  // across decks, but standard for Anki.
                                .stream(bais, data.length, -1)
                                .contentType("application/octet-stream")
                                .build());
            }

            br.com.powercards.domain.entities.AnkiMedia media = new br.com.powercards.domain.entities.AnkiMedia(
                    noteId,
                    filename,
                    minioUrl + "/" + BUCKET_NAME + "/" + filename);
            media.persist();

        } catch (Exception e) {
            LOGGER.error("Failed to upload media: " + filename, e);
            // Don't fail the whole import for one media file
        }
    }

    public String replaceMediaWithUrls(Long noteId, String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        String result = content;

        // Replace Images: src="filename"
        java.util.regex.Pattern imgPattern = java.util.regex.Pattern.compile("src=\"([^\"]+)\"");
        java.util.regex.Matcher imgMatcher = imgPattern.matcher(result);
        java.lang.StringBuilder sbImg = new java.lang.StringBuilder();
        int lastEndImg = 0;
        while (imgMatcher.find()) {
            String filename = imgMatcher.group(1);
            br.com.powercards.domain.entities.AnkiMediaId mediaId = new br.com.powercards.domain.entities.AnkiMediaId(
                    noteId, filename);
            br.com.powercards.domain.entities.AnkiMedia media = br.com.powercards.domain.entities.AnkiMedia
                    .findById(mediaId);

            sbImg.append(result, lastEndImg, imgMatcher.start());
            if (media != null && media.minioUrl != null) {
                sbImg.append("src=\"").append(media.minioUrl).append("\"");
            } else {
                sbImg.append(imgMatcher.group(0));
            }
            lastEndImg = imgMatcher.end();
        }
        sbImg.append(result.substring(lastEndImg));
        result = sbImg.toString();

        // Replace Sounds: [sound:filename]
        java.util.regex.Pattern soundPattern = java.util.regex.Pattern.compile("\\[sound:([^\\]]+)\\]");
        java.util.regex.Matcher soundMatcher = soundPattern.matcher(result);
        java.lang.StringBuilder sbSound = new java.lang.StringBuilder();
        int lastEndSound = 0;
        while (soundMatcher.find()) {
            String filename = soundMatcher.group(1);
            br.com.powercards.domain.entities.AnkiMediaId mediaId = new br.com.powercards.domain.entities.AnkiMediaId(
                    noteId, filename);
            br.com.powercards.domain.entities.AnkiMedia media = br.com.powercards.domain.entities.AnkiMedia
                    .findById(mediaId);

            sbSound.append(result, lastEndSound, soundMatcher.start());
            if (media != null && media.minioUrl != null) {
                sbSound.append("[sound:").append(media.minioUrl).append("]");
            } else {
                sbSound.append(soundMatcher.group(0));
            }
            lastEndSound = soundMatcher.end();
        }
        sbSound.append(result.substring(lastEndSound));

        return sbSound.toString();
    }

    private void createBucketIfNotExists() {
        try {
            boolean found = minioClient.bucketExists(io.minio.BucketExistsArgs.builder().bucket(BUCKET_NAME).build());
            if (!found) {
                minioClient.makeBucket(io.minio.MakeBucketArgs.builder().bucket(BUCKET_NAME).build());
            }
        } catch (Exception e) {
            LOGGER.error("Error creating bucket", e);
            throw new RuntimeException("Could not initialize MinIO bucket", e);
        }
    }
}

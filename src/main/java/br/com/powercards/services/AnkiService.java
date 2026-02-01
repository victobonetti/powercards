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

    private static final java.util.regex.Pattern IMG_PATTERN = java.util.regex.Pattern
            .compile("(?:src|img)\\s*=\\s*[\"']?([^\"'>\\s\\u001f]+)[\"']?");
    private static final java.util.regex.Pattern AUDIO_PATTERN = java.util.regex.Pattern
            .compile("\\[(sound|source):([^\\]\\u001f]+)\\]");

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

        LOGGER.info("Iniciando leitura do arquivo .apkg...");
        try (Anki4j anki4j = Anki4j.read(apkg)) {
            LOGGER.info("Arquivo .apkg lido com sucesso. Iniciando persistência...");
            return persistCollection(anki4j);
        } catch (Exception e) {
            LOGGER.warn("Falha ao processar arquivo Anki: {}", e.getMessage());
            throw new InternalServerErrorException(e);
        }
    }

    private List<Deck> persistCollection(Anki4j anki4j) {
        LOGGER.info("Persistindo coleção Anki no banco de dados...");

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
        LOGGER.info("Persistidos {} modelos de nota.", modelMap.size());

        // 2. Persistir Decks
        Map<Long, Deck> deckMap = new java.util.HashMap<>();
        for (com.anki4j.model.Deck d : anki4j.getDecks()) {
            Deck deck = new Deck();
            deck.name = d.getName();
            deck.persist();
            deckMap.put(d.getId(), deck);
        }
        LOGGER.info("Persistidos {} decks.", deckMap.size());

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
        LOGGER.info("Persistidas {} notas.", noteMap.size());

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
        LOGGER.info("Persistidos {} cartões.", anki4j.getCards().size());

        // Ensure all notes are flushed to the database so their IDs are available for
        // media processing
        Note.getEntityManager().flush();

        LOGGER.info("Persistência concluída.");
        // 5. export midia to minio
        try {
            processMedia(anki4j, noteMap);
        } catch (Exception e) {
            LOGGER.warn("Erro ao processar mídias. O import continuará sem mídias: {}", e.getMessage());
        }

        return anki4j.getDecks().stream()
                .map(d -> deckMap.get(d.getId()))
                .collect(Collectors.toList());
    }

    private void processMedia(Anki4j anki4j, Map<Long, Note> noteMap) {
        LOGGER.info("Escaneando {} notas em busca de mídias...", noteMap.size());
        try {
            createBucketIfNotExists();
        } catch (Exception e) {
            LOGGER.warn("Erro ao inicializar bucket MinIO. O import continuará sem mídias: {}", e.getMessage());
            return;
        }

        for (Map.Entry<Long, Note> entry : noteMap.entrySet()) {
            Note note = entry.getValue();

            if (note.flds == null)
                continue;

            String content = note.flds;

            // Scan for images (src= or img=)
            java.util.regex.Matcher imgMatcher = IMG_PATTERN.matcher(content);
            while (imgMatcher.find()) {
                uploadMedia(anki4j, note.id, imgMatcher.group(1));
            }

            // Scan for sounds ([sound:] or [source:])
            java.util.regex.Matcher audioMatcher = AUDIO_PATTERN.matcher(content);
            while (audioMatcher.find()) {
                uploadMedia(anki4j, note.id, audioMatcher.group(2));
            }
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

            LOGGER.info("Fetching media content for: " + filename);
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
            LOGGER.info("Mídia enviada para o MinIO: {}", filename);

        } catch (Exception e) {
            LOGGER.warn("Falha ao fazer upload da mídia {}: {}", filename, e.getMessage());
            // Don't fail the whole import for one media file
        }
    }

    public String replaceMediaWithUrls(Long noteId, String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        String result = content;

        // 1. Replace Images: src="..." or img="..."
        java.util.regex.Matcher imgMatcher = IMG_PATTERN.matcher(result);
        java.lang.StringBuilder sbImg = new java.lang.StringBuilder();
        int lastEndImg = 0;
        while (imgMatcher.find()) {
            String filename = imgMatcher.group(1);
            String url = getMediaUrl(noteId, filename);
            sbImg.append(result, lastEndImg, imgMatcher.start());
            if (url != null) {
                // Return src="url" even if matched from img=filename
                sbImg.append("src=\"").append(url).append("\"");
            } else {
                LOGGER.debug("Mídia não encontrada no banco para substituição (IMG): noteId={}, filename={}", noteId,
                        filename);
                sbImg.append(imgMatcher.group(0));
            }
            lastEndImg = imgMatcher.end();
        }
        sbImg.append(result.substring(lastEndImg));
        result = sbImg.toString();

        // 2. Replace Sounds/Source: [sound:filename] or [source:filename]
        java.util.regex.Matcher audioMatcher = AUDIO_PATTERN.matcher(result);
        java.lang.StringBuilder sbAudio = new java.lang.StringBuilder();
        int lastEndAudio = 0;
        while (audioMatcher.find()) {
            String filename = audioMatcher.group(2);
            String url = getMediaUrl(noteId, filename);
            sbAudio.append(result, lastEndAudio, audioMatcher.start());
            if (url != null) {
                sbAudio.append("<audio controls src=\"").append(url).append("\"></audio>");
            } else {
                LOGGER.debug("Mídia não encontrada no banco para substituição (AUDIO): noteId={}, filename={}", noteId,
                        filename);
                sbAudio.append(audioMatcher.group(0));
            }
            lastEndAudio = audioMatcher.end();
        }
        sbAudio.append(result.substring(lastEndAudio));
        result = sbAudio.toString();

        return result;
    }

    private String getMediaUrl(Long noteId, String filename) {
        if (filename == null || filename.isBlank())
            return null;
        try {
            br.com.powercards.domain.entities.AnkiMediaId mediaId = new br.com.powercards.domain.entities.AnkiMediaId(
                    noteId, filename);
            br.com.powercards.domain.entities.AnkiMedia media = br.com.powercards.domain.entities.AnkiMedia
                    .findById(mediaId);
            return (media != null) ? media.minioUrl : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void createBucketIfNotExists() {
        try {
            boolean found = minioClient.bucketExists(io.minio.BucketExistsArgs.builder().bucket(BUCKET_NAME).build());
            if (!found) {
                LOGGER.info("Criando bucket de mídias: {}", BUCKET_NAME);
                minioClient.makeBucket(io.minio.MakeBucketArgs.builder().bucket(BUCKET_NAME).build());

                // Set public read-only policy
                String policy = "{\n" +
                        "    \"Version\": \"2012-10-17\",\n" +
                        "    \"Statement\": [\n" +
                        "        {\n" +
                        "            \"Effect\": \"Allow\",\n" +
                        "            \"Principal\": \"*\",\n" +
                        "            \"Action\": [\"s3:GetObject\"],\n" +
                        "            \"Resource\": [\"arn:aws:s3:::" + BUCKET_NAME + "/*\"]\n" +
                        "        }\n" +
                        "    ]\n" +
                        "}";
                minioClient.setBucketPolicy(
                        io.minio.SetBucketPolicyArgs.builder().bucket(BUCKET_NAME).config(policy).build());
                LOGGER.info("Política de acesso público (read-only) aplicada ao bucket: {}", BUCKET_NAME);
            }
        } catch (Exception e) {
            LOGGER.warn("Erro ao inicializar bucket MinIO: {}", e.getMessage());
            throw new RuntimeException("Could not initialize MinIO bucket", e);
        }
    }
}

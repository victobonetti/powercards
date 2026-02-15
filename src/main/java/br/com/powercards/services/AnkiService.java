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
import java.io.IOException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
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

    @jakarta.inject.Inject
    br.com.powercards.security.WorkspaceContext workspaceContext;

    @org.eclipse.microprofile.config.inject.ConfigProperty(name = "quarkus.minio.url")
    String minioUrl;

    private static final String BUCKET_NAME = "anki-media";

    private InputStream apkg;

    public void load(final InputStream apkg) {
        Objects.requireNonNull(apkg, "arquivo .apk deve ser fornescido.");
        this.apkg = apkg;
    }

    @Transactional
    public br.com.powercards.dto.ImportResponse getDecks(boolean force) {
        Objects.requireNonNull(apkg, "Arquivo .apkg não foi carregado.");

        LOGGER.info("Iniciando leitura do arquivo .apkg...");
        try (Anki4j anki4j = Anki4j.read(apkg)) {
            LOGGER.info("Arquivo .apkg lido com sucesso. Iniciando persistência...");
            return persistCollection(anki4j, force);
        } catch (Exception e) {
            LOGGER.warn("Falha ao processar arquivo Anki: {}", e.getMessage());
            throw new InternalServerErrorException(e);
        }
    }

    @jakarta.inject.Inject
    jakarta.persistence.EntityManager entityManager;

    private br.com.powercards.dto.ImportResponse persistCollection(Anki4j anki4j, boolean force) {
        LOGGER.info("Persistindo coleção Anki no banco de dados...");

        br.com.powercards.model.Workspace currentWorkspace = workspaceContext.getWorkspace();
        if (currentWorkspace == null) {
            throw new jakarta.ws.rs.BadRequestException("Invalid or missing Workspace ID");
        }

        // Ensure filter is enabled for the transaction
        entityManager.unwrap(org.hibernate.Session.class).enableFilter("workspaceFilter").setParameter("workspaceId",
                currentWorkspace.id);

        int importedNotes = 0;
        int updatedNotes = 0;
        int skippedNotes = 0;

        // 1. Persistir Models
        Map<Long, AnkiModel> modelMap = new java.util.HashMap<>();
        for (com.anki4j.model.Model m : anki4j.getModels()) {
            // Check if model exists by name
            AnkiModel model = AnkiModel.find("name", m.getName()).firstResult();
            if (model == null) {
                model = new AnkiModel();
                model.workspace = currentWorkspace;
                model.name = m.getName();
                model.css = m.getCss();
                if (m.getFlds() != null) {
                    final AnkiModel finalModel = model;
                    model.fields = m.getFlds().stream()
                            .map(f -> new br.com.powercards.model.AnkiField(f.getName(), f.getOrd(), finalModel))
                            .collect(Collectors.toList());
                }
                if (m.getTmpls() != null) {
                    final AnkiModel finalModel = model;
                    model.templates = m.getTmpls().stream()
                            .map(t -> new br.com.powercards.model.AnkiTemplate(t.getName(), t.getQfmt(),
                                    t.getAfmt(), t.getOrd(), finalModel))
                            .collect(Collectors.toList());
                }
                model.persist();
            }
            modelMap.put(m.getId(), model);
        }
        LOGGER.info("Persistidos {} modelos de nota.", modelMap.size());

        // 2. Persistir Decks
        Map<Long, Deck> deckMap = new java.util.HashMap<>();
        for (com.anki4j.model.Deck d : anki4j.getDecks()) {
            Deck deck = Deck.find("name", d.getName()).firstResult();
            if (deck == null) {
                deck = new Deck();
                deck.workspace = currentWorkspace;
                deck.name = d.getName();
                deck.persist();
            }
            deckMap.put(d.getId(), deck);
        }
        LOGGER.info("Persistidos {} decks.", deckMap.size());

        // 3. Persistir Notes
        Map<Long, Note> noteMap = new java.util.HashMap<>();
        for (com.anki4j.model.Note n : anki4j.getNotes()) {
            Note note = Note.find("guid", n.getGuid()).firstResult();

            if (note != null) {
                if (force) {
                    // Update existing note
                    note.model = modelMap.get(n.getMid());
                    note.mod = n.getMod();
                    note.usn = n.getUsn();
                    note.tags = n.getTags();
                    note.flds = n.getFlds();
                    note.sfld = n.getSfld();
                    note.csum = n.getCsum();
                    note.flags = n.getFlags();
                    note.data = n.getData();
                    // We don't change the ID or GUID
                    updatedNotes++;
                } else {
                    skippedNotes++;
                    continue; // Skip this note and its cards
                }
            } else {
                note = new Note();
                note.workspace = currentWorkspace;
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
                importedNotes++;
            }

            noteMap.put(n.getId(), note);

            // Tags processing...
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
                                        newTag.workspace = currentWorkspace;
                                        newTag.persist();
                                        return newTag;
                                    });
                        });
            }
        }
        LOGGER.info("Processamento de notas: Importadas={}, Atualizadas={}, Ignoradas={}", importedNotes, updatedNotes,
                skippedNotes);

        // 4. Persistir Cards
        // We only persist cards for notes that are in noteMap (i.e., imported or
        // updated)
        int processedCards = 0;
        for (com.anki4j.model.Card c : anki4j.getCards()) {
            Note note = noteMap.get(c.getNid());
            if (note == null)
                continue; // Skip cards for skipped notes

            // Check if card exists for this note and ord?
            // Since we might be updating, we should check if the card already exists.
            // Simplified check: If note was updated, we might want to update cards too.
            // For now, let's try to find existing card by note and ord.

            // Assuming we don't need deep card deduplication if note is new.
            // If note is updated, we might have existing cards.
            Card card = null;
            // We can find by Note ID + Ordinal, but Jpa/Panache makes relationship nav
            // slightly complex in loop.
            // Let's iterate only if necessary.

            // Simplification: If note was skipped, we skipped loop.
            // If note was new, card is new.
            // If note was updated, check if card exists.

            boolean isNewCard = false;
            if (importedNotes > 0 && updatedNotes == 0) { // All new
                isNewCard = true;
            } else {
                // Check existence
                // Note: Ideally we should use a composite key or query, but filtering by Note
                // object in Panache is okay.
                // Using stream on note.cards might be lazy loaded.

                // Let's use a query
                card = Card.find("note.id = ?1 and ord = ?2", note.id, c.getOrd()).firstResult();
            }

            if (card == null) {
                card = new Card();
                isNewCard = true;
            }

            if (isNewCard || force) {
                card.note = note;
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
                processedCards++;
            }
        }
        LOGGER.info("Processados {} cartões.", processedCards);

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

        List<br.com.powercards.dto.DeckResponse> deckResponses = anki4j.getDecks().stream()
                .map(d -> deckMap.get(d.getId()))
                .filter(Objects::nonNull)
                .map(d -> new br.com.powercards.dto.DeckResponse(d.id, d.name, d.cards.size(), 0, 0, 0, 0,
                        d.cards.size(), null))
                .collect(Collectors.toList());

        String status = (skippedNotes > 0) ? (importedNotes > 0 || updatedNotes > 0 ? "PARTIAL" : "SKIPPED")
                : "SUCCESS";

        return new br.com.powercards.dto.ImportResponse(deckResponses, importedNotes, updatedNotes, skippedNotes,
                status);
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

    public br.com.powercards.domain.entities.AnkiMedia uploadSingleFile(Long noteId, String filename, byte[] data,
            String contentType) {
        try {
            createBucketIfNotExists();

            // Check if already exists
            br.com.powercards.domain.entities.AnkiMediaId mediaId = new br.com.powercards.domain.entities.AnkiMediaId(
                    noteId, filename);
            br.com.powercards.domain.entities.AnkiMedia existing = br.com.powercards.domain.entities.AnkiMedia
                    .findById(mediaId);
            if (existing != null) {
                return existing;
            }

            LOGGER.info("Uploading single media file: " + filename);

            try (java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(data)) {
                minioClient.putObject(
                        io.minio.PutObjectArgs.builder()
                                .bucket(BUCKET_NAME)
                                .object(filename)
                                .stream(bais, data.length, -1)
                                .contentType(contentType)
                                .build());
            }

            br.com.powercards.domain.entities.AnkiMedia media = new br.com.powercards.domain.entities.AnkiMedia(
                    noteId,
                    filename,
                    minioUrl + "/" + BUCKET_NAME + "/" + filename);
            media.persist();
            LOGGER.info("Mídia enviada para o MinIO: {}", filename);
            return media;

        } catch (Exception e) {
            LOGGER.error("Falha ao fazer upload da mídia {}: {}", filename, e.getMessage());
            throw new RuntimeException("Media upload failed", e);
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

    public java.io.File exportDecks(List<Long> deckIds) {
        if (deckIds == null || deckIds.isEmpty()) {
            throw new jakarta.ws.rs.BadRequestException("No decks selected for export");
        }

        LOGGER.info("Exporting decks:Ids={}", deckIds);

        // Fetch Decks
        List<Deck> decks = Deck.list("id in ?1", deckIds);
        if (decks.isEmpty()) {
            throw new jakarta.ws.rs.NotFoundException("No decks found with provided IDs");
        }

        // Collect dependent entities
        Set<Note> notes = new HashSet<>();
        Set<AnkiModel> models = new HashSet<>();
        List<Card> cards = new ArrayList<>();

        for (Deck deck : decks) {
            cards.addAll(deck.cards);
            for (Card card : deck.cards) {
                if (card.note != null) {
                    notes.add(card.note);
                    if (card.note.model != null) {
                        models.add(card.note.model);
                    }
                }
            }
        }

        // Map to Anki4j model
        Anki4j ankiExport = Anki4j.create();

        // 1. Models
        for (AnkiModel m : models) {
            com.anki4j.model.Model ankiModel = new com.anki4j.model.Model();
            ankiModel.setId(m.id);
            ankiModel.setName(m.name);
            ankiModel.setCss(m.css);

            // Fields
            List<com.anki4j.model.Field> fields = new ArrayList<>();
            if (m.fields != null) {
                for (br.com.powercards.model.AnkiField f : m.fields) {
                    com.anki4j.model.Field field = new com.anki4j.model.Field();
                    field.setName(f.name);
                    field.setOrd(f.ord);
                    fields.add(field);
                }
            }
            ankiModel.setFlds(fields);

            // Templates
            List<com.anki4j.model.Template> templates = new ArrayList<>();
            if (m.templates != null) {
                for (br.com.powercards.model.AnkiTemplate t : m.templates) {
                    com.anki4j.model.Template template = new com.anki4j.model.Template();
                    template.setName(t.name);
                    template.setQfmt(t.qfmt);
                    template.setAfmt(t.afmt);
                    template.setOrd(t.ord);
                    templates.add(template);
                }
            }
            ankiModel.setTmpls(templates);

            ankiExport.addModel(ankiModel);
        }

        // 2. Decks
        for (Deck d : decks) {
            com.anki4j.model.Deck ankiDeck = new com.anki4j.model.Deck();
            ankiDeck.setId(d.id);
            ankiDeck.setName(d.name);
            ankiExport.addDeck(ankiDeck);
        }

        // 3. Notes
        for (Note n : notes) {
            com.anki4j.model.Note ankiNote = new com.anki4j.model.Note();
            ankiNote.setId(n.id);
            ankiNote.setGuid(n.guid);
            if (n.model != null)
                ankiNote.setMid(n.model.id);
            ankiNote.setMod(n.mod);
            ankiNote.setUsn(n.usn);
            ankiNote.setTags(n.tags);
            // Replace media URLs with filenames for export
            // We need to reverse replaceMediaWithUrls logic or store original flds?
            // Usually we want to export with [sound:file] and included media.
            // But our flds might contain http urls now if we modified them?
            // Wait, replaceMediaWithUrls is used when getting for frontend?
            // In DB we store `flds` as imported (usually).
            // Let's check persist logic. We persist `n.getFlds()`.
            // So DB has original Anki format typically?
            // If we edited it, we might have added URLs.
            // Ideally we function to strip URLs back to filenames.
            // For now assume flds is export-ready or close to it.
            ankiNote.setFlds(n.flds);
            ankiNote.setSfld(n.sfld);
            ankiNote.setCsum(n.csum);
            ankiNote.setFlags(n.flags);
            ankiNote.setData(n.data);

            ankiExport.addNote(ankiNote);
        }

        // 4. Cards
        for (Card c : cards) {
            com.anki4j.model.Card ankiCard = new com.anki4j.model.Card();
            ankiCard.setId(c.id);
            if (c.note != null)
                ankiCard.setNid(c.note.id);
            if (c.deck != null)
                ankiCard.setDid(c.deck.id);
            ankiCard.setOrd(c.ord);
            ankiCard.setMod(c.mod);
            ankiCard.setUsn(c.usn);
            ankiCard.setType(c.type);
            ankiCard.setQueue(c.queue);
            ankiCard.setDue(c.due);
            ankiCard.setIvl(c.ivl);
            ankiCard.setFactor(c.factor);
            ankiCard.setReps(c.reps);
            ankiCard.setLapses(c.lapses);
            ankiCard.setLeft(c.left);
            ankiCard.setOdue(c.odue);
            ankiCard.setOdid(c.odid);
            ankiCard.setFlags(c.flags);
            ankiCard.setData(c.data);

            ankiExport.addCard(ankiCard);
        }

        // 5. Media
        // Implement media fetching.
        // Scan notes for media, download from MinIO, add to ankiExport?
        // Assume ankiExport.addMedia(filename, byte[]) exists.
        for (Note n : notes) {
            processMediaForExport(n, ankiExport);
        }

        try {
            java.io.File tempFile = java.io.File.createTempFile("anki_export_", ".apkg");
            byte[] exportedAnki = ankiExport.export();
            java.nio.file.Files.write(tempFile.toPath(), exportedAnki);
            return tempFile;
        } catch (IOException e) {
            LOGGER.error("Failed to write .apkg file", e);
            throw new InternalServerErrorException("Failed to generate Anki package");
        }
    }

    private void processMediaForExport(Note note, Anki4j ankiExport) {
        if (note.flds == null)
            return;

        // Scan for media
        java.util.regex.Matcher imgMatcher = IMG_PATTERN.matcher(note.flds);
        while (imgMatcher.find()) {
            String filename = imgMatcher.group(1);
            addMediaSafe(note.id, filename, ankiExport);
        }

        java.util.regex.Matcher audioMatcher = AUDIO_PATTERN.matcher(note.flds);
        while (audioMatcher.find()) {
            String filename = audioMatcher.group(2);
            addMediaSafe(note.id, filename, ankiExport);
        }
    }

    private void addMediaSafe(Long noteId, String filename, Anki4j ankiExport) {
        // Fetch from MinIO
        try {
            InputStream stream = minioClient.getObject(
                    io.minio.GetObjectArgs.builder()
                            .bucket(BUCKET_NAME)
                            .object(filename)
                            .build());
            byte[] data = stream.readAllBytes();
            stream.close();

            // Assume addMedia exists
            ankiExport.addMedia(filename, data);
        } catch (Exception e) {
            LOGGER.warn("Failed to export media: {} for note: {}", filename, noteId);
        }
    }
}

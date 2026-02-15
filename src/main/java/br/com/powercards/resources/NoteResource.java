package br.com.powercards.resources;

import br.com.powercards.model.Note;
import br.com.powercards.model.AnkiModel;
import br.com.powercards.dto.NoteRequest;
import br.com.powercards.dto.NoteResponse;
import br.com.powercards.dto.PaginatedResponse;
import br.com.powercards.dto.PaginationMeta;
import br.com.powercards.dto.BulkDeleteRequest;
import br.com.powercards.dto.BulkTagRequest;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.util.List;

@Path("/v1/notes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NoteResource {

    @jakarta.inject.Inject
    br.com.powercards.services.AnkiService ankiService;

    @jakarta.inject.Inject
    br.com.powercards.security.WorkspaceContext workspaceContext;

    // Helper to ensure Tags exist
    private void syncTags(String tags) {
        if (tags != null && !tags.isBlank()) {
            java.util.Arrays.stream(tags.trim().split("\\s+"))
                    .filter(tag -> !tag.isBlank())
                    .map(String::trim)
                    .distinct()
                    .forEach(tagName -> {
                        br.com.powercards.model.Tag.find("name", tagName)
                                .firstResultOptional()
                                .orElseGet(() -> {
                                    br.com.powercards.model.Tag newTag = new br.com.powercards.model.Tag(tagName);
                                    newTag.workspace = workspaceContext.getWorkspace();
                                    newTag.persist();
                                    return newTag;
                                });
                    });
        }
    }

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all notes")
    public PaginatedResponse<NoteResponse> list(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("perPage") @DefaultValue("20") int perPage,
            @QueryParam("search") String search,
            @QueryParam("sort") String sort,
            @Context UriInfo uriInfo) {

        if (page < 1)
            page = 1;
        if (perPage < 1)
            perPage = 20;

        io.quarkus.panache.common.Sort sortObj = io.quarkus.panache.common.Sort.by("id");
        if (sort != null && !sort.isBlank()) {
            if (sort.startsWith("-")) {
                sortObj = io.quarkus.panache.common.Sort.descending(sort.substring(1));
            } else {
                sortObj = io.quarkus.panache.common.Sort.ascending(sort);
            }
        }

        io.quarkus.hibernate.orm.panache.PanacheQuery<Note> query;
        if (search != null && !search.isBlank()) {
            if (search.toLowerCase().startsWith("tag=")) {
                String tag = search.substring(4);
                query = Note.find("lower(tags) like ?1", sortObj, "%" + tag.toLowerCase() + "%");
            } else {
                String term = "%" + search.toLowerCase() + "%";
                query = Note.find("lower(flds) like ?1 or lower(sfld) like ?1", sortObj, term);
            }
        } else {
            query = Note.findAll(sortObj);
        }

        long total = query.count();
        List<Note> notes = query.page(page - 1, perPage).list();
        // Optimized: Batch fetch draft existence
        java.util.Set<Long> notesWithDrafts = new java.util.HashSet<>();
        if (!notes.isEmpty()) {
            java.util.List<Long> ids = notes.stream().map(n -> n.id).toList();
            // We just need to know if a draft exists
            java.util.List<br.com.powercards.model.NoteDraft> drafts = br.com.powercards.model.NoteDraft
                    .list("note.id in ?1", ids);
            drafts.forEach(d -> notesWithDrafts.add(d.note.id));
        }

        List<NoteResponse> data = notes.stream()
                .map(n -> toResponse(n, notesWithDrafts.contains(n.id)))
                .toList();

        long totalPages = (total + perPage - 1) / perPage;
        if (totalPages == 0)
            totalPages = 1;

        String nextPageUri = null;
        if (page < totalPages) {
            var builder = uriInfo.getAbsolutePathBuilder()
                    .queryParam("page", page + 1)
                    .queryParam("perPage", perPage);
            if (search != null)
                builder.queryParam("search", search);
            if (sort != null)
                builder.queryParam("sort", sort);
            nextPageUri = builder.build().toString();
        }

        var lastPageBuilder = uriInfo.getAbsolutePathBuilder()
                .queryParam("page", totalPages)
                .queryParam("perPage", perPage);
        if (search != null)
            lastPageBuilder.queryParam("search", search);
        if (sort != null)
            lastPageBuilder.queryParam("sort", sort);
        String lastPageUri = lastPageBuilder.build().toString();

        PaginationMeta meta = new PaginationMeta(total, page, nextPageUri, lastPageUri);
        return new PaginatedResponse<>(meta, data);
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get a note by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Note found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Note found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    public NoteResponse get(@PathParam("id") Long id, @QueryParam("draft") @DefaultValue("true") boolean includeDraft) {
        Note note = Note.findById(id);
        if (note == null) {
            throw new NotFoundException();
        }

        if (includeDraft) {
            br.com.powercards.model.NoteDraft draft = br.com.powercards.model.NoteDraft.find("note.id", id)
                    .firstResult();
            if (draft != null) {
                // Overlay draft content
                return new NoteResponse(
                        note.id,
                        note.guid,
                        note.model != null ? note.model.id : null,
                        note.mod,
                        note.usn,
                        draft.tags != null ? draft.tags : note.tags,
                        ankiService.replaceMediaWithUrls(note.id, draft.flds != null ? draft.flds : note.flds),
                        note.sfld,
                        note.csum,
                        note.flags,
                        note.data,
                        true);
            }
        }

        return toResponse(note, false);
    }

    @jakarta.inject.Inject
    jakarta.persistence.EntityManager entityManager;

    private void ensureFilter() {
        br.com.powercards.model.Workspace currentWorkspace = workspaceContext.getWorkspace();
        if (currentWorkspace != null) {
            entityManager.unwrap(org.hibernate.Session.class).enableFilter("workspaceFilter")
                    .setParameter("workspaceId", currentWorkspace.id);
        }
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Note created")
    public Response create(NoteRequest noteRequest) {
        ensureFilter();
        br.com.powercards.model.Workspace currentWorkspace = workspaceContext.getWorkspace();
        if (currentWorkspace == null) {
            throw new BadRequestException("Invalid or missing Workspace ID");
        }
        Note note = new Note();
        note.workspace = currentWorkspace;
        note.tags = noteRequest.tags();
        note.flds = noteRequest.fields();
        note.data = noteRequest.customData();
        if (noteRequest.modelId() != null) {
            note.model = AnkiModel.findById(noteRequest.modelId());
        }
        note.persist();
        syncTags(note.tags);
        System.out.println("DEBUG: Created note with ID: " + note.id);
        return Response.status(Response.Status.CREATED).entity(toResponse(note, false)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Note updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    public NoteResponse update(@PathParam("id") Long id, NoteRequest noteRequest) {
        ensureFilter();
        Note entity = Note.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.tags = noteRequest.tags();
        entity.flds = noteRequest.fields();
        entity.data = noteRequest.customData();
        if (noteRequest.modelId() != null) {
            entity.model = AnkiModel.findById(noteRequest.modelId());
        }
        // Force flush to ensure update is visible to cleanup query
        Note.getEntityManager().flush();
        syncTags(entity.tags);
        deleteOrphanTags();

        // Clear draft on save
        br.com.powercards.model.NoteDraft.delete("note.id", id);

        return toResponse(entity, false);
    }

    @POST
    @Path("/{id}/draft")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Save a draft for a note")
    public void saveDraft(@PathParam("id") Long id, NoteRequest noteRequest) {
        ensureFilter();
        Note note = Note.findById(id);
        if (note == null) {
            throw new NotFoundException();
        }

        br.com.powercards.model.NoteDraft draft = br.com.powercards.model.NoteDraft.find("note.id", id).firstResult();
        if (draft == null) {
            draft = new br.com.powercards.model.NoteDraft();
            draft.note = note;
        }
        draft.flds = noteRequest.fields();
        draft.tags = noteRequest.tags();
        draft.persist();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete a note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Note deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    public void delete(@PathParam("id") Long id) {
        ensureFilter();
        Note entity = Note.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        // Delete draft first
        br.com.powercards.model.NoteDraft.delete("note.id", id);
        br.com.powercards.model.Card.delete("note.id = ?1", id);
        entity.delete();
        deleteOrphanTags();
    }

    private void deleteOrphanTags() {
        // Delete tags that do not have any associated notes
        // Note: Ideally this should be an async background job for performance,
        // but for now we do it synchronously as requested.
        // We use native query or JPQL to find tags with no notes.
        // Assuming tags are stored as simple string in Note for now, we rely on LIKE
        // search which is heavy.
        // A better approach in future is valid ManyToMany relationship.

        // Find tags where no note has this tag name
        // Iterate all tags and check if any note uses it. This is potentially slow.
        // Optimized:
        // DELETE FROM Tag t WHERE NOT EXISTS (SELECT 1 FROM Note n WHERE n.tags LIKE
        // concat('%', t.name, '%'))

        // IMPORTANT: Orphan cleanup needs to be aware of workspace?
        // Yes, if we delete a tag because no note uses it in THIS workspace.
        // The filter is enabled on the session, so `Tag` (entity delete) and `Note`
        // select should be filtered.
        // But native query might bypass?
        // JPQL: DELETE FROM Tag t ... respects entity mapping?
        // Tag entity has @Filter.
        // Does "DELETE FROM Tag t" apply filter? Hibernate usually supports it on HQL
        // delete.
        // But the subquery `FROM Note n`?

        try {
            // Creating native query or HQL for bulk delete
            Note.getEntityManager().createQuery(
                    "DELETE FROM Tag t WHERE (SELECT count(n) FROM Note n WHERE n.tags LIKE concat('%', t.name, '%')) = 0")
                    .executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to cleanup orphan tags: " + e.getMessage());
        }
    }

    @POST
    @Path("/bulk/delete")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Bulk delete notes")
    public void bulkDelete(BulkDeleteRequest request) {
        ensureFilter();
        if (request.ids() != null && !request.ids().isEmpty()) {
            // Delete associated cards first to satisfy Foreign Key constraints
            // Also drafts
            br.com.powercards.model.NoteDraft.delete("note.id in ?1", request.ids());
            br.com.powercards.model.Card.delete("note.id in ?1", request.ids());
            Note.delete("id in ?1", request.ids());
            deleteOrphanTags();
        }
    }

    @POST
    @Path("/{id}/media")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Upload media for a note")
    public Response uploadMedia(@PathParam("id") Long id,
            @org.jboss.resteasy.reactive.RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file) {
        ensureFilter();
        Note note = Note.findById(id);
        if (note == null) {
            throw new NotFoundException();
        }

        if (file == null) {
            throw new BadRequestException("File is required");
        }

        try {
            String filename = file.fileName();
            // Basic sanitization
            filename = java.nio.file.Paths.get(filename).getFileName().toString();

            // Read all bytes
            byte[] data = java.nio.file.Files.readAllBytes(file.uploadedFile());

            br.com.powercards.domain.entities.AnkiMedia media = ankiService.uploadSingleFile(id, filename, data,
                    file.contentType());

            java.util.Map<String, String> result = new java.util.HashMap<>();
            result.put("url", media.minioUrl);
            result.put("filename", filename);

            return Response.ok(result).build();
        } catch (java.io.IOException e) {
            throw new InternalServerErrorException("Failed to process file", e);
        }
    }

    @jakarta.inject.Inject
    br.com.powercards.services.AIEnhancementService aiEnhancementService;

    @POST
    @Path("/bulk/enhance")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Batch enhance notes using AI")
    public void batchEnhance(br.com.powercards.dto.BatchEnhanceRequest request) {
        ensureFilter();
        if (request.noteIds() != null && !request.noteIds().isEmpty()) {
            List<Note> notes = Note.list("id in ?1", request.noteIds());
            for (Note note : notes) {
                // Check for existing draft to start from? Or always source from original note?
                // Plan says "Process AI enhancement. Save results as NoteDrafts."
                // Usually one enhances the ORIGINAL content.
                // If a draft exists, should we enhance the draft?
                // Probably yes, if the user has unsaved edits they want enhanced.
                // But for bulk, maybe safety first: Enhance original?
                // Let's enhance ORIGINAL for simplicity in bulk.
                // Or check draft?
                // Let's check draft. If draft exists, use it.

                String fieldsToEnhance = note.flds;
                br.com.powercards.model.NoteDraft existingDraft = br.com.powercards.model.NoteDraft
                        .find("note.id", note.id).firstResult();
                if (existingDraft != null) {
                    fieldsToEnhance = existingDraft.flds;
                }

                // Split fields (Anki uses \u001f separator)
                // But wait, the AI service expects a List<String>.
                // Note fields are stored as a single string joined by \u001f?
                // Accessing `note.flds`: it is a String.
                // We need to split it.
                // AnkiSEPARATOR is usually \u001f (Unit Separator).

                String[] fieldsArray = fieldsToEnhance.split("\u001f", -1); // -1 to keep empty trailing fields
                java.util.List<String> fieldsList = java.util.Arrays.asList(fieldsArray);

                try {
                    java.util.List<String> enhancedFields = aiEnhancementService.enhanceModel(fieldsList);

                    // Join back
                    String newFields = String.join("\u001f", enhancedFields);

                    // Create or Update Draft
                    if (existingDraft == null) {
                        existingDraft = new br.com.powercards.model.NoteDraft();
                        existingDraft.note = note;
                    }
                    existingDraft.flds = newFields;
                    // Keep tags as is (or should AI enhance tags? Service doesn't seem to)
                    existingDraft.tags = (existingDraft.tags != null) ? existingDraft.tags : note.tags;
                    existingDraft.persist();

                } catch (Exception e) {
                    System.err.println("Failed to enhance note " + note.id + ": " + e.getMessage());
                    // Continue with other notes
                }
            }
        }
    }

    @DELETE
    @Path("/{id}/draft")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Discard a note draft")
    public void discardDraft(@PathParam("id") Long id) {
        ensureFilter();
        Note note = Note.findById(id);
        if (note == null) {
            throw new jakarta.ws.rs.NotFoundException();
        }
        br.com.powercards.model.NoteDraft.delete("note.id = ?1", id);
    }

    @POST
    @Path("/bulk/tags")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Bulk add tags to notes")
    public void bulkTags(BulkTagRequest request) {
        ensureFilter();
        if (request.noteIds() != null && !request.noteIds().isEmpty() && request.tags() != null
                && !request.tags().isEmpty()) {
            List<Note> notes = Note.list("id in ?1", request.noteIds());
            String tagsToAdd = String.join(" ", request.tags());
            syncTags(tagsToAdd);

            for (Note note : notes) {
                java.util.Set<String> tagSet = new java.util.LinkedHashSet<>();
                if (note.tags != null && !note.tags.isBlank()) {
                    java.util.Collections.addAll(tagSet, note.tags.trim().split("\\s+"));
                }
                tagSet.addAll(request.tags());
                note.tags = String.join(" ", tagSet);
                note.persist();
            }
        }
    }

    private NoteResponse toResponse(Note note, boolean isDraft) {
        return new NoteResponse(
                note.id,
                note.guid,
                note.model != null ? note.model.id : null,
                note.mod,
                note.usn,
                note.tags,
                ankiService.replaceMediaWithUrls(note.id, note.flds),
                note.sfld,
                note.csum,
                note.flags,
                note.data,
                isDraft);
    }
}

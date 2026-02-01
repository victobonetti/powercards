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
        List<NoteResponse> data = notes.stream()
                .map(this::toResponse)
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
    public NoteResponse get(@PathParam("id") Long id) {
        Note note = Note.findById(id);
        if (note == null) {
            throw new NotFoundException();
        }
        return toResponse(note);
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Note created")
    public Response create(NoteRequest noteRequest) {
        Note note = new Note();
        note.tags = noteRequest.tags();
        note.flds = noteRequest.fields();
        note.data = noteRequest.customData();
        if (noteRequest.modelId() != null) {
            note.model = AnkiModel.findById(noteRequest.modelId());
        }
        note.persist();
        syncTags(note.tags);
        System.out.println("DEBUG: Created note with ID: " + note.id);
        return Response.status(Response.Status.CREATED).entity(toResponse(note)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Note updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    public NoteResponse update(@PathParam("id") Long id, NoteRequest noteRequest) {
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
        return toResponse(entity);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete a note")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Note deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Note not found")
    public void delete(@PathParam("id") Long id) {
        Note entity = Note.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
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
        if (request.ids() != null && !request.ids().isEmpty()) {
            // Delete associated cards first to satisfy Foreign Key constraints
            br.com.powercards.model.Card.delete("note.id in ?1", request.ids());
            Note.delete("id in ?1", request.ids());
            deleteOrphanTags();
        }
    }

    @POST
    @Path("/bulk/tags")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Bulk add tags to notes")
    public void bulkTags(BulkTagRequest request) {
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

    private NoteResponse toResponse(Note note) {
        return new NoteResponse(
                note.id,
                note.guid,
                note.model != null ? note.model.id : null,
                note.mod,
                note.usn,
                note.tags,
                note.flds,
                note.sfld,
                note.csum,
                note.flags,
                note.data);
    }
}

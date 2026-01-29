package br.com.powercards.resources;

import br.com.powercards.model.Note;
import br.com.powercards.model.AnkiModel;
import br.com.powercards.dto.NoteRequest;
import br.com.powercards.dto.NoteResponse;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/notes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NoteResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all notes")
    public List<NoteResponse> list() {
        return Note.<Note>listAll().stream()
                .map(this::toResponse)
                .toList();
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
        note.flds = noteRequest.flds();
        note.data = noteRequest.data();
        if (noteRequest.modelId() != null) {
            note.model = AnkiModel.findById(noteRequest.modelId());
        }
        note.persist();
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
        entity.flds = noteRequest.flds();
        entity.data = noteRequest.data();
        if (noteRequest.modelId() != null) {
            entity.model = AnkiModel.findById(noteRequest.modelId());
        }
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
        entity.delete();
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

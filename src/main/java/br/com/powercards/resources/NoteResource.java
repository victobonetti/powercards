package br.com.powercards.resources;

import br.com.powercards.model.Note;
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
    public List<Note> list() {
        return Note.listAll();
    }

    @GET
    @Path("/{id}")
    public Note get(@PathParam("id") Long id) {
        Note note = Note.findById(id);
        if (note == null) {
            throw new NotFoundException();
        }
        return note;
    }

    @POST
    @Transactional
    public Response create(Note note) {
        note.persist();
        return Response.status(Response.Status.CREATED).entity(note).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Note update(@PathParam("id") Long id, Note note) {
        Note entity = Note.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.guid = note.guid;
        entity.model = note.model;
        entity.mod = note.mod;
        entity.usn = note.usn;
        entity.tags = note.tags;
        entity.flds = note.flds;
        entity.sfld = note.sfld;
        entity.csum = note.csum;
        entity.flags = note.flags;
        entity.data = note.data;
        return entity;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void delete(@PathParam("id") Long id) {
        Note entity = Note.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}

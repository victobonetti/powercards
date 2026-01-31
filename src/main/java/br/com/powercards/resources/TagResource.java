package br.com.powercards.resources;

import br.com.powercards.model.Tag;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TagResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all tags")
    public List<Tag> list() {
        return Tag.listAll();
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new tag")
    public Response create(Tag tag) {
        if (tag.name == null || tag.name.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Tag name is required").build();
        }

        String trimmedName = tag.name.trim();
        Tag existing = Tag.find("name", trimmedName).firstResult();
        if (existing != null) {
            return Response.ok(existing).build();
        }

        try {
            tag.name = trimmedName;
            tag.persistAndFlush();
            return Response.status(Response.Status.CREATED).entity(tag).build();
        } catch (Exception e) {
            // Fallback in case of concurrent creation that passed the check
            Tag existingFallback = Tag.find("name", trimmedName).firstResult();
            if (existingFallback != null) {
                return Response.ok(existingFallback).build();
            }
            throw e;
        }
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete a tag")
    public void delete(@PathParam("id") Long id) {
        Tag entity = Tag.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}

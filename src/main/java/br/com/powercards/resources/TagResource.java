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

    @jakarta.inject.Inject
    jakarta.persistence.EntityManager em;

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List tags")
    public List<Tag> list(@QueryParam("search") String search) {
        if (search != null && !search.isBlank()) {
            return Tag.find("lower(name) like ?1", "%" + search.toLowerCase() + "%")
                    .page(0, 10)
                    .list();
        }
        return Tag.findAll().page(0, 10).list();
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

    @GET
    @Path("/stats")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List tags with stats")
    public List<br.com.powercards.dto.TagStats> listStats() {
        return em.createQuery(
                "SELECT new br.com.powercards.dto.TagStats(t.id, t.name, (SELECT count(n) FROM Note n WHERE n.tags LIKE concat('%', t.name, '%'))) FROM Tag t ORDER BY t.name",
                br.com.powercards.dto.TagStats.class).getResultList();
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

        // Update all notes containing this tag
        String tagName = entity.name;
        // Postgres/H2 compatible string replacement for space-separated tags
        // Assuming tags are space separated strings like "tag1 tag2 tag3"
        em.createQuery(
                "UPDATE Note n SET n.tags = TRIM(REPLACE(concat(' ', n.tags, ' '), concat(' ', :tagName, ' '), ' ')) WHERE n.tags LIKE :likePattern")
                .setParameter("tagName", tagName)
                .setParameter("likePattern", "%" + tagName + "%")
                .executeUpdate();

        entity.delete();
    }
}

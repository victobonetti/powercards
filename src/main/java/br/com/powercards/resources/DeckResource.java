package br.com.powercards.resources;

import br.com.powercards.model.Deck;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/decks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DeckResource {

    @GET
    public List<Deck> list() {
        return Deck.listAll();
    }

    @GET
    @Path("/{id}")
    public Deck get(@PathParam("id") Long id) {
        Deck deck = Deck.findById(id);
        if (deck == null) {
            throw new NotFoundException();
        }
        return deck;
    }

    @POST
    @Transactional
    public Response create(Deck deck) {
        deck.persist();
        return Response.status(Response.Status.CREATED).entity(deck).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Deck update(@PathParam("id") Long id, Deck deck) {
        Deck entity = Deck.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.name = deck.name;
        return entity;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void delete(@PathParam("id") Long id) {
        Deck entity = Deck.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}

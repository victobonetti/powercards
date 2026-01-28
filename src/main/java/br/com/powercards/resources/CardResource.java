package br.com.powercards.resources;

import br.com.powercards.model.Card;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/cards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CardResource {

    @GET
    public List<Card> list() {
        return Card.listAll();
    }

    @GET
    @Path("/{id}")
    public Card get(@PathParam("id") Long id) {
        Card card = Card.findById(id);
        if (card == null) {
            throw new NotFoundException();
        }
        return card;
    }

    @POST
    @Transactional
    public Response create(Card card) {
        card.persist();
        return Response.status(Response.Status.CREATED).entity(card).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Card update(@PathParam("id") Long id, Card card) {
        Card entity = Card.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.note = card.note;
        entity.deck = card.deck;
        entity.ord = card.ord;
        entity.mod = card.mod;
        entity.usn = card.usn;
        entity.type = card.type;
        entity.queue = card.queue;
        entity.due = card.due;
        entity.ivl = card.ivl;
        entity.factor = card.factor;
        entity.reps = card.reps;
        entity.lapses = card.lapses;
        entity.left = card.left;
        entity.odue = card.odue;
        entity.odid = card.odid;
        entity.flags = card.flags;
        entity.data = card.data;
        return entity;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void delete(@PathParam("id") Long id) {
        Card entity = Card.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }
}

package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import br.com.powercards.model.Deck;
import br.com.powercards.dto.CardRequest;
import br.com.powercards.dto.CardResponse;
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
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all cards")
    public List<CardResponse> list() {
        return Card.<Card>listAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get a card by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Card found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Card not found")
    public CardResponse get(@PathParam("id") Long id) {
        Card card = Card.findById(id);
        if (card == null) {
            throw new NotFoundException();
        }
        return toResponse(card);
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new card")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Card created")
    public Response create(CardRequest cardRequest) {
        Card card = new Card();
        updateEntity(card, cardRequest);
        card.persist();
        return Response.status(Response.Status.CREATED).entity(toResponse(card)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing card")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Card updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Card not found")
    public CardResponse update(@PathParam("id") Long id, CardRequest cardRequest) {
        Card entity = Card.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        updateEntity(entity, cardRequest);
        return toResponse(entity);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete a card")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Card deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Card not found")
    public void delete(@PathParam("id") Long id) {
        Card entity = Card.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }

    private void updateEntity(Card entity, CardRequest request) {
        if (request.noteId() != null) {
            entity.note = Note.findById(request.noteId());
        }
        if (request.deckId() != null) {
            entity.deck = Deck.findById(request.deckId());
        }
        entity.ord = request.ordinal();
        entity.type = request.type();
        entity.queue = request.queue();
        entity.due = request.due();
        entity.ivl = request.interval();
        entity.factor = request.easeFactor();
        entity.reps = request.repetitions();
        entity.lapses = request.lapses();
        entity.left = request.remainingSteps();
        entity.odue = request.originalDue();
        entity.odid = request.originalDeckId();
        entity.flags = request.flags();
        entity.data = request.customData();
    }

    private CardResponse toResponse(Card card) {
        return new CardResponse(
                card.id,
                card.note != null ? card.note.id : null,
                card.deck != null ? card.deck.id : null,
                card.ord,
                card.mod,
                card.usn,
                card.type,
                card.queue,
                card.due,
                card.ivl,
                card.factor,
                card.reps,
                card.lapses,
                card.left,
                card.odue,
                card.odid,
                card.flags,
                card.data);
    }
}

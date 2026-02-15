package br.com.powercards.resources;

import br.com.powercards.model.Card;
import br.com.powercards.model.Note;
import br.com.powercards.model.Deck;
import br.com.powercards.dto.CardRequest;
import br.com.powercards.dto.CardResponse;
import br.com.powercards.dto.PaginatedResponse;
import br.com.powercards.dto.PaginationMeta;
import br.com.powercards.dto.BulkDeleteRequest;
import br.com.powercards.dto.BulkMoveRequest;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.util.List;

@Path("/v1/cards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CardResource {

    @jakarta.inject.Inject
    br.com.powercards.services.AnkiService ankiService;

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all cards")
    public PaginatedResponse<CardResponse> list(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("perPage") @DefaultValue("20") int perPage,
            @QueryParam("deckId") Long deckId,
            @QueryParam("search") String search,
            @QueryParam("sort") String sort,
            @Context UriInfo uriInfo) {

        if (page < 1)
            page = 1;
        if (perPage < 1)
            perPage = 20;

        io.quarkus.panache.common.Sort sortObj = io.quarkus.panache.common.Sort.by("c.id");
        if (sort != null && !sort.isBlank()) {
            boolean descending = sort.startsWith("-");
            String sortField = descending ? sort.substring(1) : sort;

            // Qualify fields with 'c.' to avoid ambiguity with joined Note
            // Assuming all sortable fields are on Card unless specific override
            String qualifiedField;

            if (sortField.equals("tags")) {
                qualifiedField = "c.note.tags";
            } else {
                qualifiedField = "c." + sortField;
            }

            if (descending) {
                sortObj = io.quarkus.panache.common.Sort.descending(qualifiedField);
            } else {
                sortObj = io.quarkus.panache.common.Sort.ascending(qualifiedField);
            }
        }

        StringBuilder queryBuilder = new StringBuilder("select c from Card c left join fetch c.note n where 1=1");
        java.util.Map<String, Object> params = new java.util.HashMap<>();

        if (deckId != null) {
            queryBuilder.append(" and c.deck.id = :deckId");
            params.put("deckId", deckId);
        }

        if (search != null && !search.isBlank()) {
            if (search.toLowerCase().startsWith("tag=")) {
                String tag = search.substring(4);
                queryBuilder.append(" and lower(n.tags) like :tag");
                params.put("tag", "%" + tag.toLowerCase() + "%");
            } else {
                queryBuilder.append(" and lower(n.flds) like :search");
                params.put("search", "%" + search.toLowerCase() + "%");
            }
        }

        io.quarkus.hibernate.orm.panache.PanacheQuery<Card> query = Card.find(queryBuilder.toString(), sortObj, params);

        long total = query.count();
        List<Card> cards = query.page(page - 1, perPage).list();
        List<CardResponse> data = cards.stream()
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

    @POST
    @Path("/bulk/delete")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Bulk delete cards")
    public void bulkDelete(BulkDeleteRequest request) {
        if (request.ids() != null && !request.ids().isEmpty()) {
            Card.delete("id in ?1", request.ids());
        }
    }

    @POST
    @Path("/bulk/move")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Bulk move cards to deck")
    public void bulkMove(BulkMoveRequest request) {
        if (request.cardIds() != null && !request.cardIds().isEmpty() && request.targetDeckId() != null) {
            Deck deck = Deck.findById(request.targetDeckId());
            if (deck == null) {
                throw new NotFoundException("Target deck not found");
            }
            Card.update("deck = ?1 where id in ?2", deck, request.cardIds());
        }
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

        // Update Note fields if present
        if (entity.note != null) {
            if (request.noteContent() != null) {
                entity.note.flds = request.noteContent();
            }
            if (request.noteTags() != null) {
                entity.note.tags = request.noteTags();
            }
        }
    }

    private CardResponse toResponse(Card card) {
        String noteField = "";
        if (card.note != null && card.note.flds != null) {
            String[] fields = card.note.flds.split("\u001f");
            for (String f : fields) {
                if (!f.trim().matches("^\\d+$")) {
                    noteField = f;
                    break;
                }
            }
            // Fallback to first field if all are numeric or empty
            if (noteField.isEmpty() && fields.length > 0) {
                noteField = fields[0];
            }

            noteField = ankiService.replaceMediaWithUrls(card.note.id, noteField);
        }
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
                card.data,
                noteField,
                card.note != null ? card.note.tags : "",
                card.note != null && br.com.powercards.model.NoteDraft.count("note.id", card.note.id) > 0);
    }
}

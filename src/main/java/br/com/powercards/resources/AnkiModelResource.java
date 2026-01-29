package br.com.powercards.resources;

import br.com.powercards.model.AnkiModel;
import br.com.powercards.model.AnkiField;
import br.com.powercards.model.AnkiTemplate;
import br.com.powercards.dto.AnkiModelRequest;
import br.com.powercards.dto.AnkiModelResponse;
import br.com.powercards.dto.AnkiFieldDto;
import br.com.powercards.dto.AnkiTemplateDto;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/v1/models")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AnkiModelResource {

    @GET
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "List all Anki models")
    public List<AnkiModelResponse> list() {
        return AnkiModel.<AnkiModel>listAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @GET
    @Path("/{id}")
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Get an Anki model by ID")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Model found")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public AnkiModelResponse get(@PathParam("id") Long id) {
        AnkiModel model = AnkiModel.findById(id);
        if (model == null) {
            throw new NotFoundException();
        }
        return toResponse(model);
    }

    @POST
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Create a new Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "201", description = "Model created")
    public Response create(AnkiModelRequest modelRequest) {
        AnkiModel model = new AnkiModel();
        model.name = modelRequest.name();
        model.css = modelRequest.css();
        // Mapping fields and templates if provided
        if (modelRequest.fields() != null) {
            model.fields = modelRequest.fields().stream()
                    .map(f -> new AnkiField(f.name(), f.ord(), model))
                    .toList();
        }
        if (modelRequest.templates() != null) {
            model.templates = modelRequest.templates().stream()
                    .map(t -> new AnkiTemplate(t.name(), t.qfmt(), t.afmt(), t.ord(), model))
                    .toList();
        }
        model.persist();
        return Response.status(Response.Status.CREATED).entity(toResponse(model)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Update an existing Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "200", description = "Model updated")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public AnkiModelResponse update(@PathParam("id") Long id, AnkiModelRequest modelRequest) {
        AnkiModel entity = AnkiModel.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.name = modelRequest.name();
        entity.css = modelRequest.css();
        // Simple update: recreate fields and templates to avoid complex synchronization
        // for now
        if (modelRequest.fields() != null) {
            entity.fields.clear();
            entity.fields.addAll(modelRequest.fields().stream()
                    .map(f -> new AnkiField(f.name(), f.ord(), entity))
                    .toList());
        }
        if (modelRequest.templates() != null) {
            entity.templates.clear();
            entity.templates.addAll(modelRequest.templates().stream()
                    .map(t -> new AnkiTemplate(t.name(), t.qfmt(), t.afmt(), t.ord(), entity))
                    .toList());
        }
        return toResponse(entity);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @org.eclipse.microprofile.openapi.annotations.Operation(summary = "Delete an Anki model")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "204", description = "Model deleted")
    @org.eclipse.microprofile.openapi.annotations.responses.APIResponse(responseCode = "404", description = "Model not found")
    public void delete(@PathParam("id") Long id) {
        AnkiModel entity = AnkiModel.findById(id);
        if (entity == null) {
            throw new NotFoundException();
        }
        entity.delete();
    }

    private AnkiModelResponse toResponse(AnkiModel model) {
        return new AnkiModelResponse(
                model.id,
                model.name,
                model.css,
                model.fields.stream().map(f -> new AnkiFieldDto(f.name, f.ord)).toList(),
                model.templates.stream().map(t -> new AnkiTemplateDto(t.name, t.qfmt, t.afmt, t.ord)).toList());
    }
}

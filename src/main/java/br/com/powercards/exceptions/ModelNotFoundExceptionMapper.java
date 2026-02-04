package br.com.powercards.exceptions;

import dev.langchain4j.exception.ModelNotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.util.Map;

@Provider
public class ModelNotFoundExceptionMapper implements ExceptionMapper<ModelNotFoundException> {

    @Override
    public Response toResponse(ModelNotFoundException exception) {
        return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                .entity(Map.of("error", "AI Model not available. Please ensure the model is pulled.", "details",
                        exception.getMessage()))
                .build();
    }
}

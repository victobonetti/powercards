package br.com.powercards.resources;

import br.com.powercards.domain.entities.Chat;
import br.com.powercards.domain.entities.ChatHistory;
import br.com.powercards.services.AIService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.UUID;

@Path("/chats")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @Inject
    AIService aiService;

    @Inject
    Logger log;

    @GET
    public List<Chat> listChats(@HeaderParam("X-Workspace-Id") String workspaceId) {
        if (workspaceId == null) {
            throw new WebApplicationException("Workspace ID is required", 400);
        }
        return Chat.list("workspaceId", workspaceId);
    }

    @POST
    @Transactional
    public Chat createChat(@HeaderParam("X-Workspace-Id") String workspaceId, Chat chat) {
        if (workspaceId == null) {
            throw new WebApplicationException("Workspace ID is required", 400);
        }
        chat.workspaceId = workspaceId;
        if (chat.name == null || chat.name.isEmpty()) {
            chat.name = "New Chat";
        }
        chat.persist();

        // Add initial system greeting? Maybe not, frontend handles "fake" first
        // message.
        // But for persistence, maybe we should record it if we want it to be
        // persistent.
        // For now, let's leave it empty.

        return chat;
    }

    @GET
    @Path("/{id}/history")
    public List<ChatHistory> getHistory(@PathParam("id") UUID id) {
        return ChatHistory.list("chat.id", id); // Default order should be by ID or we should sort by createdAt
    }

    @POST
    @Path("/{id}/messages")
    @Transactional
    @Consumes(MediaType.TEXT_PLAIN)
    public Response sendMessage(@PathParam("id") UUID chatId, String userMessageContent) {
        Chat chat = Chat.findById(chatId);
        if (chat == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // 1. Save User Message
        long messageCount = ChatHistory.count("chat.id", chatId);

        ChatHistory userMsg = new ChatHistory();
        userMsg.chat = chat;
        userMsg.role = "user";
        userMsg.content = userMessageContent;
        userMsg.persist();

        // Rename chat if it's the first message
        if (messageCount == 0) {
            String newName = userMessageContent;
            if (newName.length() > 30) {
                newName = newName.substring(0, 30) + "...";
            }
            chat.name = newName;
            chat.persist();
        }

        // 2. Call AI
        // We might want to construct context from previous messages here
        // simple context construction: get last N messages

        // For now, simple chat
        String aiResponseContent;
        try {
            aiResponseContent = aiService.chat(userMessageContent);
        } catch (Exception e) {
            log.error("Error calling AI service", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("AI Service Error").build();
        }

        // 3. Save AI Message
        ChatHistory aiMsg = new ChatHistory();
        aiMsg.chat = chat;
        aiMsg.role = "ai";
        aiMsg.content = aiResponseContent;
        aiMsg.persist();

        return Response.ok(aiMsg).build();
    }

    // Deleting a chat
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteChat(@PathParam("id") UUID id) {
        Chat chat = Chat.findById(id);
        if (chat == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        // Cascade delete history
        ChatHistory.delete("chat.id", id);
        chat.delete();
        return Response.noContent().build();
    }
}

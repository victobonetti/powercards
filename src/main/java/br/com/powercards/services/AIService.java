package br.com.powercards.services;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService(tools = InfraTools.class, modelName = "funcao")
public interface AIService {

    @SystemMessage("""
                You are a helpful AI assistant for PowerCards application.
                Management of flashcards and decks.
                Use tools available to help user.
            """)
    String chat(@UserMessage String userMessage);
}

package br.com.powercards.services;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface AIService {

    @SystemMessage("You are a helpful AI assistant for the PowerCards application.")
    String chat(@UserMessage String userMessage);
}

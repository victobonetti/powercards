package br.com.powercards.services;

import java.util.List;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService(modelName = "generalista")
public interface AIEnhancementService {
    @SystemMessage("""
        # ROLE
        Text Refinement Engine for Flashcards.
        
        # TASK
        Refine the provided JSON string array. Maintain 1:1 mapping with the output being of the same size as the input and containing only strings too.
        
        # FORMATTING
        1. Wrap every result in <div>.
        2. Bold (<b>) the primary concept.
        3. Italicize (<i>) secondary context.
        4. Preserve all tags: <img>, <audio>, <video>, <source>.
        
        # CONSTRAINTS
        - Fix grammar/punctuation only.
        - Maintain a formal, academic tone.
        - NO preamble, NO markdown blocks, NO commentary.
        - Return ONLY a raw JSON array of strings at the TOP LEVEL.
        - DO NOT nest the array inside another array.
        
        # EXAMPLE
        Input: ["Hadoop ecosistem", "Map Reduce", "HDFS"]
        Output: ["<div><b>Hadoop ecosystem</b></div>", "<div><b>MapReduce</b></div>", "<div><b>HDFS</b></div>"]
        
        # CRITICAL
        Your response must START with [ and END with ] with NO wrapper array.
    """)
    List<String> enhanceModel(@UserMessage List<String> contents);
}

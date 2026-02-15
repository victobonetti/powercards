package br.com.powercards.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class UserAIProxyService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserAIProxyService.class);

    private static final String SYSTEM_PROMPT = """
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
            """;

    @Inject
    ProfileService profileService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Enhance model fields using the user's BYOK API key.
     * 
     * @param keycloakId The user's Keycloak ID
     * @param contents   The list of field contents to enhance
     * @return Enhanced fields
     * @throws RuntimeException if provider is not configured or API call fails
     */
    public List<String> enhanceModel(String keycloakId, List<String> contents) {
        var user = br.com.powercards.model.User.findByKeycloakId(keycloakId);
        if (user == null || user.aiProvider == null) {
            throw new RuntimeException("AI provider not configured");
        }

        String apiKey = profileService.getAiApiKey(keycloakId);
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("AI API key not configured");
        }

        String userMessage = contents.toString();

        return switch (user.aiProvider) {
            case "openai" -> callOpenAI(apiKey, userMessage);
            case "gemini" -> callGemini(apiKey, userMessage);
            case "deepseek" -> callDeepSeek(apiKey, userMessage);
            default -> throw new RuntimeException("Unknown AI provider: " + user.aiProvider);
        };
    }

    private List<String> callOpenAI(String apiKey, String userMessage) {
        try {
            var requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", "gpt-4o-mini",
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", userMessage)),
                    "temperature", 0.1));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            LOGGER.info("OpenAI response status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                LOGGER.error("OpenAI API error: {}", response.body());
                throw new RuntimeException("OpenAI API error: " + response.statusCode());
            }

            return extractContentFromOpenAIResponse(response.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.error("OpenAI call failed: {}", e.getMessage(), e);
            throw new RuntimeException("OpenAI call failed", e);
        }
    }

    private List<String> callDeepSeek(String apiKey, String userMessage) {
        try {
            var requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", "deepseek-chat",
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", userMessage)),
                    "temperature", 0.1));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.deepseek.com/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            LOGGER.info("DeepSeek response status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                LOGGER.error("DeepSeek API error: {}", response.body());
                throw new RuntimeException("DeepSeek API error: " + response.statusCode());
            }

            // DeepSeek uses OpenAI-compatible API format
            return extractContentFromOpenAIResponse(response.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.error("DeepSeek call failed: {}", e.getMessage(), e);
            throw new RuntimeException("DeepSeek call failed", e);
        }
    }

    private List<String> callGemini(String apiKey, String userMessage) {
        try {
            var requestBody = objectMapper.writeValueAsString(Map.of(
                    "contents", List.of(
                            Map.of("role", "user", "parts",
                                    List.of(Map.of("text", SYSTEM_PROMPT + "\n\n" + userMessage)))),
                    "generationConfig", Map.of("temperature", 0.1)));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="
                    + apiKey;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            LOGGER.info("Gemini response status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                LOGGER.error("Gemini API error: {}", response.body());
                throw new RuntimeException("Gemini API error: " + response.statusCode());
            }

            return extractContentFromGeminiResponse(response.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.error("Gemini call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Gemini call failed", e);
        }
    }

    /**
     * Extract content from OpenAI/DeepSeek chat completion response.
     * The AI response should contain a JSON array of strings.
     */
    private List<String> extractContentFromOpenAIResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").get(0).path("message").path("content").asText();
            return parseJsonArray(content);
        } catch (Exception e) {
            LOGGER.error("Failed to parse OpenAI response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }

    /**
     * Extract content from Gemini response.
     */
    private List<String> extractContentFromGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("candidates").get(0).path("content").path("parts").get(0).path("text")
                    .asText();
            return parseJsonArray(content);
        } catch (Exception e) {
            LOGGER.error("Failed to parse Gemini response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }

    public boolean testConnection(String provider, String apiKey) {
        try {
            return switch (provider) {
                case "openai" -> testOpenAI(apiKey);
                case "gemini" -> testGemini(apiKey);
                case "deepseek" -> testDeepSeek(apiKey);
                default -> false;
            };
        } catch (Exception e) {
            LOGGER.error("Test connection failed for provider: " + provider, e);
            return false;
        }
    }

    private boolean testOpenAI(String apiKey) throws Exception {
        var requestBody = objectMapper.writeValueAsString(Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(Map.of("role", "user", "content", "Say Hi")),
                "max_tokens", 1));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            LOGGER.warn("OpenAI Test Failed: " + response.body());
        }
        return response.statusCode() == 200;
    }

    private boolean testGemini(String apiKey) throws Exception {
        var requestBody = objectMapper.writeValueAsString(Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", "Say Hi")))),
                "generationConfig", Map.of("maxOutputTokens", 1)));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key="
                                + apiKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            LOGGER.warn("Gemini Test Failed: " + response.body());
        }
        return response.statusCode() == 200;
    }

    private boolean testDeepSeek(String apiKey) throws Exception {
        var requestBody = objectMapper.writeValueAsString(Map.of(
                "model", "deepseek-chat",
                "messages", List.of(Map.of("role", "user", "content", "Say Hi")),
                "max_tokens", 1));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.deepseek.com/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            LOGGER.warn("DeepSeek Test Failed: " + response.body());
        }
        return response.statusCode() == 200;
    }

    /**
     * Parse a JSON array from the AI response text.
     * Handles cases where the AI wraps the array in markdown code blocks.
     */
    private List<String> parseJsonArray(String text) {
        // Strip markdown code blocks if present
        String cleaned = text.strip();
        if (cleaned.startsWith("```")) {
            // Remove ```json or ``` prefix and trailing ```
            int firstNewline = cleaned.indexOf('\n');
            int lastBackticks = cleaned.lastIndexOf("```");
            if (firstNewline > 0 && lastBackticks > firstNewline) {
                cleaned = cleaned.substring(firstNewline + 1, lastBackticks).strip();
            }
        }

        try {
            return objectMapper.readValue(cleaned, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            LOGGER.error("Failed to parse JSON array from AI response: {}", cleaned);
            throw new RuntimeException("AI response is not a valid JSON array: " + e.getMessage(), e);
        }
    }
}

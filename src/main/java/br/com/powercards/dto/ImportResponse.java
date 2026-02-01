package br.com.powercards.dto;

import java.util.List;

public class ImportResponse {
    public List<DeckResponse> decks;
    public int importedNotes;
    public int updatedNotes;
    public int skippedNotes;
    public String status;

    public ImportResponse() {
    }

    public ImportResponse(List<DeckResponse> decks, int importedNotes, int updatedNotes, int skippedNotes,
            String status) {
        this.decks = decks;
        this.importedNotes = importedNotes;
        this.updatedNotes = updatedNotes;
        this.skippedNotes = skippedNotes;
        this.status = status;
    }
}

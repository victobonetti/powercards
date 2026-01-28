package br.com.powercards.services;

import com.anki4j.Anki4j;
import com.anki4j.model.Deck;
import jakarta.enterprise.context.RequestScoped;
import jakarta.ws.rs.InternalServerErrorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.List;
import java.util.Objects;

@RequestScoped
public class AnkiService {

    Logger LOGGER = LoggerFactory.getLogger(AnkiService.class);

    private InputStream apkg;

    public void load(final InputStream apkg){
        Objects.requireNonNull(apkg, "arquivo .apk deve ser fornescido.");
        this.apkg = apkg;
    }

    public List<Deck> getDecks() {
        Objects.requireNonNull(apkg, "Arquivo .apkg não foi carregado.");

        try (Anki4j anki4j = Anki4j.read(apkg)) {
            var decks = anki4j.getDecks();
            return decks;
        } catch (Exception e) {
            throw new InternalServerErrorException(e);
        }
    }

}

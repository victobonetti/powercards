package br.com.powercards.services;

import br.com.powercards.model.AnkiModel;
import br.com.powercards.model.Card;
import br.com.powercards.model.Deck;
import br.com.powercards.model.Note;
import com.anki4j.Anki4j;
import jakarta.enterprise.context.RequestScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.InternalServerErrorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@RequestScoped
public class AnkiService {

    Logger LOGGER = LoggerFactory.getLogger(AnkiService.class);

    private InputStream apkg;

    public void load(final InputStream apkg) {
        Objects.requireNonNull(apkg, "arquivo .apk deve ser fornescido.");
        this.apkg = apkg;
    }

    @Transactional
    public List<com.anki4j.model.Deck> getDecks() {
        Objects.requireNonNull(apkg, "Arquivo .apkg não foi carregado.");

        try (Anki4j anki4j = Anki4j.read(apkg)) {
            persistCollection(anki4j);
            return anki4j.getDecks();
        } catch (Exception e) {
            LOGGER.error("Erro ao processar arquivo Anki", e);
            throw new InternalServerErrorException(e);
        }
    }

    private void persistCollection(Anki4j anki4j) {
        LOGGER.info("Persistindo coleção Anki no banco de dados...");

        // 1. Persistir Models
        Map<Long, AnkiModel> modelMap = anki4j.getModels().stream()
                .map(m -> {
                    AnkiModel model = new AnkiModel(m.getId(), m.getName(), m.getCss());
                    if (m.getFlds() != null) {
                        model.fields = m.getFlds().stream()
                                .map(f -> new br.com.powercards.model.AnkiField(f.getName(), f.getOrd(), model))
                                .collect(Collectors.toList());
                    }
                    if (m.getTmpls() != null) {
                        model.templates = m.getTmpls().stream()
                                .map(t -> new br.com.powercards.model.AnkiTemplate(t.getName(), t.getQfmt(),
                                        t.getAfmt(), t.getOrd(), model))
                                .collect(Collectors.toList());
                    }
                    model.persist();
                    return model;
                })
                .collect(Collectors.toMap(m -> m.id, Function.identity()));

        // 2. Persistir Decks
        Map<Long, Deck> deckMap = anki4j.getDecks().stream()
                .map(d -> new Deck(d.getId(), d.getName()))
                .peek(d -> d.persist())
                .collect(Collectors.toMap(d -> d.id, Function.identity()));

        // 3. Persistir Notes
        Map<Long, Note> noteMap = anki4j.getNotes().stream()
                .map(n -> {
                    Note note = new Note();
                    note.id = n.getId();
                    note.guid = n.getGuid();
                    note.model = modelMap.get(n.getMid());
                    note.mod = n.getMod();
                    note.usn = n.getUsn();
                    note.tags = n.getTags();
                    note.flds = n.getFlds();
                    note.sfld = n.getSfld();
                    note.csum = n.getCsum();
                    note.flags = n.getFlags();
                    note.data = n.getData();
                    note.persist();
                    return note;
                })
                .collect(Collectors.toMap(n -> n.id, Function.identity()));

        // 4. Persistir Cards
        anki4j.getCards().forEach(c -> {
            Card card = new Card();
            card.id = c.getId();
            card.note = noteMap.get(c.getNid());
            card.deck = deckMap.get(c.getDid());
            card.ord = c.getOrd();
            card.mod = c.getMod();
            card.usn = c.getUsn();
            card.type = c.getType();
            card.queue = c.getQueue();
            card.due = c.getDue();
            card.ivl = c.getIvl();
            card.factor = c.getFactor();
            card.reps = c.getReps();
            card.lapses = c.getLapses();
            card.left = c.getLeft();
            card.odue = c.getOdue();
            card.odid = c.getOdid();
            card.flags = c.getFlags();
            card.data = c.getData();
            card.persist();
        });

        LOGGER.info("Persistência concluída.");
    }

}

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
    public List<Deck> getDecks() {
        Objects.requireNonNull(apkg, "Arquivo .apkg não foi carregado.");

        try (Anki4j anki4j = Anki4j.read(apkg)) {
            return persistCollection(anki4j);
        } catch (Exception e) {
            LOGGER.error("Erro ao processar arquivo Anki", e);
            throw new InternalServerErrorException(e);
        }
    }

    private List<Deck> persistCollection(Anki4j anki4j) {
        LOGGER.info("Persistindo coleção Anki no banco de dados...");

        // 1. Persistir Models
        Map<Long, AnkiModel> modelMap = new java.util.HashMap<>();
        for (com.anki4j.model.Model m : anki4j.getModels()) {
            AnkiModel model = new AnkiModel();
            model.name = m.getName();
            model.css = m.getCss();
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
            modelMap.put(m.getId(), model);
        }

        // 2. Persistir Decks
        Map<Long, Deck> deckMap = new java.util.HashMap<>();
        for (com.anki4j.model.Deck d : anki4j.getDecks()) {
            Deck deck = new Deck();
            deck.name = d.getName();
            deck.persist();
            deckMap.put(d.getId(), deck);
        }

        // 3. Persistir Notes
        Map<Long, Note> noteMap = new java.util.HashMap<>();
        for (com.anki4j.model.Note n : anki4j.getNotes()) {
            Note note = new Note();
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
            note.data = n.getData();
            note.persist();
            noteMap.put(n.getId(), note);

            if (note.tags != null && !note.tags.isBlank()) {
                java.util.Arrays.stream(note.tags.trim().split("\\s+"))
                        .filter(tag -> !tag.isBlank())
                        .map(String::trim)
                        .distinct()
                        .forEach(tagName -> {
                            br.com.powercards.model.Tag.find("name", tagName)
                                    .firstResultOptional()
                                    .orElseGet(() -> {
                                        br.com.powercards.model.Tag newTag = new br.com.powercards.model.Tag(tagName);
                                        newTag.persist();
                                        return newTag;
                                    });
                        });
            }
        }

        // 4. Persistir Cards
        for (com.anki4j.model.Card c : anki4j.getCards()) {
            Card card = new Card();
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
        }

        LOGGER.info("Persistência concluída.");
        return anki4j.getDecks().stream()
                .map(d -> deckMap.get(d.getId()))
                .collect(Collectors.toList());
    }

}

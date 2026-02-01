// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NoteCRUD } from "./NoteCRUD";
import { CardList } from "./CardList";
import { noteApi, cardApi } from "@/lib/api";

// Mock APIs
vi.mock("@/lib/api", () => ({
    noteApi: {
        v1NotesGet: vi.fn(),
        v1NotesPost: vi.fn(),
        v1NotesIdDelete: vi.fn(),
        v1NotesBulkTagsPost: vi.fn(),
        v1NotesBulkDeletePost: vi.fn(),
    },
    cardApi: {
        v1CardsGet: vi.fn(),
        v1CardsBulkMovePost: vi.fn(),
        v1CardsBulkDeletePost: vi.fn(),
    },
    modelApi: {
        v1ModelsGet: vi.fn().mockResolvedValue({ data: [] }),
    }
}));

// Mock Toaster
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe("Tag Navigation and Search Params", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("NoteCRUD initializes search from URL params", async () => {
        // Mock response
        (noteApi.v1NotesGet as any).mockResolvedValue({
            data: {
                data: [],
                pagination: { total: 0, page: 1 }
            }
        });

        render(
            <MemoryRouter initialEntries={["/notes?search=tag=testTag"]}>
                <NoteCRUD />
            </MemoryRouter>
        );

        // Verify that v1NotesGet was called with the search param "tag=testTag"
        // The debounced value triggers the effect.
        await waitFor(() => {
            expect(noteApi.v1NotesGet).toHaveBeenCalledWith(
                1, // page
                10, // perPage
                "tag=testTag", // search
                "id" // sort
            );
        });

        // Verify input value
        const input = screen.getByPlaceholderText("Search content or tag=...") as HTMLInputElement;
        expect(input.value).toBe("tag=testTag");
    });

    it("CardList initializes search from URL params", async () => {
        // Mock response
        (cardApi.v1CardsGet as any).mockResolvedValue({
            data: {
                data: [],
                pagination: { total: 0, page: 1 }
            }
        });

        render(
            <MemoryRouter initialEntries={["/decks/1?search=tag=cardTag"]}>
                <CardList deckId={1} deckName="Test Deck" onBack={vi.fn()} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(cardApi.v1CardsGet).toHaveBeenCalledWith(
                1,
                10,
                "tag=cardTag",
                "id"
            );
        });

        const input = screen.getByPlaceholderText("Search note content or tag=...") as HTMLInputElement;
        expect(input.value).toBe("tag=cardTag");
    });
});

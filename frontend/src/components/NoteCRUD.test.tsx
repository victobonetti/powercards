// @vitest-environment happy-dom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoteCRUD } from "./NoteCRUD";
import { noteApi } from "@/lib/api";
import { MemoryRouter } from "react-router-dom";

// Mock APIs
vi.mock("@/lib/api", () => ({
    noteApi: {
        v1NotesGet: vi.fn(),
        v1NotesPost: vi.fn(),
        v1NotesIdDelete: vi.fn(),
        v1NotesBulkTagsPost: vi.fn(),
        v1NotesBulkDeletePost: vi.fn(),
        v1NotesBulkMovePost: vi.fn(),
        v1NotesBulkEnhancePost: vi.fn(),
    },
    deckApi: {
        v1DecksGet: vi.fn().mockResolvedValue({ data: { data: [] } }),
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

// Mock Language Context
vi.mock("@/context/LanguageContext", () => ({
    useLanguage: () => ({
        t: {
            common: {
                actions: "Actions",
                cancel: "Cancel",
                save: "Save",
                delete: "Delete",
                edit: "Edit",
                search: "Search",
                loading: "Loading...",
                confirmDelete: "Are you sure?",
                error: "Error",
                success: "Success",
                back: "Back",
            },
            notes: {
                title: "Notes",
                create: "Create Note",
                edit: "Edit Note",
                delete: "Delete Note",
                bulkDelete: "Bulk Delete",
                bulkAddTags: "Bulk Add Tags",
                bulkSelected: "selected",
                fields: "Fields",
                tags: "Tags",
                model: "Model",
                deck: "Deck",
                cards: "Cards",
                created: "Created",
                modified: "Modified",
                noNotes: "No notes found",
                searchPlaceholder: "Search content or tag=...",
            }
        },
        language: "en",
        setLanguage: vi.fn(),
    }),
}));

// Mock Auth Context
vi.mock("@/auth/AuthProvider", () => ({
    useAuth: () => ({
        profile: { preferences: "{}" },
        updateProfileLocally: vi.fn(),
    }),
}));

// Mock Task Context
vi.mock("@/context/TaskContext", () => ({
    useTask: () => ({
        enhanceNote: vi.fn(),
        enhancingNoteIds: [],
        registerNoteUpdateCallback: vi.fn(() => vi.fn()),
    }),
}));

const mockNotes = [
    { id: 1, modelName: "Basic", fields: "Front 1\u001fBack 1", tags: "tag1", deck: { id: 1, name: "Default" } },
    { id: 2, modelName: "Basic", fields: "Front 2\u001fBack 2", tags: "tag2", deck: { id: 1, name: "Default" } },
];

describe("NoteCRUD Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (noteApi.v1NotesGet as any).mockResolvedValue({
            data: {
                data: mockNotes,
                pagination: { total: 2, page: 1, limit: 10 }
            }
        });
    });

    it("renders notes table", async () => {
        render(
            <MemoryRouter>
                <NoteCRUD />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Front 1")).toBeInTheDocument();
            expect(screen.getByText("Front 2")).toBeInTheDocument();
        });
    });

    it("fetches notes with deckId when provided", async () => {
        render(
            <MemoryRouter>
                <NoteCRUD deckId={123} deckName="Test Deck" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(noteApi.v1NotesGet).toHaveBeenCalledWith(
                123, // deckId
                1,   // page
                25,  // perPage
                "",  // search
                "id" // sort
            );
        });

        expect(screen.getByText("Test Deck")).toBeInTheDocument();
    });

    it("shows bulk actions when notes are selected", async () => {
        render(
            <MemoryRouter>
                <NoteCRUD />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Front 1")).toBeInTheDocument();
        });

        // Click a row to select (assuming row click selects)
        // Or find the checkbox/selection mechanism. 
        // NoteCRUD uses click to select now (highlight).
        const row = screen.getByText("Front 1").closest("tr");
        fireEvent.click(row!);

        await waitFor(() => {
            expect(screen.getByText("1 selected")).toBeInTheDocument();
            expect(screen.getByText("Move to Deck")).toBeInTheDocument();
        });
    });

    it("opens bulk move dialog when Move to Deck is clicked", async () => {
        render(
            <MemoryRouter>
                <NoteCRUD />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Front 1")).toBeInTheDocument();
        });

        // Select a note
        const row = screen.getByText("Front 1").closest("tr");
        fireEvent.click(row!);

        // Click Move to Deck
        const moveBtn = screen.getByText("Move to Deck");
        fireEvent.click(moveBtn);

        // Check if dialog opened (by looking for dialog text/title)
        // Adjust based on actual text in BulkMoveDialog
        await waitFor(() => {
            // Assuming dialog has "Move Notes" title or similar
            // We can check for "Select Target Deck" placeholder or similar
            // But simpler is to check if it calls the API when confirmed, but here we just check UI open
            // Let's assume BulkMoveDialog renders something unique
            // I'll check NoteCRUD implementation to see what BulkMoveDialog renders
            // Actually I didn't verify BulkMoveDialog content, but I can check for role="dialog"
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });
    it("opens bulk delete dialog when Delete key is pressed with selection", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <NoteCRUD />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Front 1")).toBeInTheDocument();
        });

        // Select a note
        const row = screen.getByText("Front 1").closest("tr");
        await user.click(row!);

        // Press Delete key
        await user.keyboard('{Delete}');

        await waitFor(() => {
            expect(screen.getByText(/Delete \d+ Notes/)).toBeInTheDocument();
        });
    });
});

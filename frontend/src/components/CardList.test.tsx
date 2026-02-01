// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardList } from './CardList';
import { cardApi, noteApi } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock the APIs
vi.mock('@/lib/api', () => ({
    cardApi: {
        v1CardsGet: vi.fn(),
        v1CardsBulkMovePost: vi.fn(),
        v1CardsBulkDeletePost: vi.fn(),
    },
    noteApi: {
        v1NotesBulkTagsPost: vi.fn(),
    },
    deckApi: {
        v1DecksGet: vi.fn(),
    }
}));

// Mock child components to simplify testing logic
vi.mock('./NoteDetail', () => ({
    NoteDetail: () => <div data-testid="note-detail">Note Detail View</div>
}));

vi.mock('./BulkMoveDialog', () => ({
    BulkMoveDialog: ({ open, onConfirm }: any) => open ? <div data-testid="bulk-move-dialog"><button onClick={() => onConfirm(2)}>Confirm Move</button></div> : null
}));
vi.mock('./BulkTagDialog', () => ({
    BulkTagDialog: ({ open, onConfirm }: any) => open ? <div data-testid="bulk-tag-dialog"><button onClick={() => onConfirm(["tag1"])}>Confirm Tag</button></div> : null
}));
vi.mock('./ui/confirmation-dialog', () => ({
    ConfirmationDialog: ({ open, onConfirm }: any) => open ? <div data-testid="confirmation-dialog"><button onClick={onConfirm}>Confirm Delete</button></div> : null
}));
vi.mock('lucide-react', () => ({
    ArrowUpDown: () => <span data-testid="arrow-up-down">Icon</span>,
    ArrowLeft: () => <span data-testid="arrow-left">Back</span>,
    MoreVertical: () => <span>More</span>,
    Pencil: () => <span>Edit</span>,
    Trash2: () => <span>Delete</span>,
    ChevronLeft: () => <span>&lt;</span>,
    ChevronRight: () => <span>&gt;</span>,
    ChevronsLeft: () => <span>&lt;&lt;</span>,
    ChevronsRight: () => <span>&gt;&gt;</span>,
    X: () => <span>X</span>
}));


describe('CardList Bulk Actions', () => {
    const mockCards = [
        { id: 1, noteId: 101, noteField: 'Front 1', noteTags: 'tag1' },
        { id: 2, noteId: 102, noteField: 'Front 2', noteTags: 'tag2' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (cardApi.v1CardsGet as any).mockResolvedValue({
            data: {
                data: mockCards,
                pagination: { total: 2 }
            }
        });
        (cardApi.v1CardsBulkMovePost as any).mockResolvedValue({});
        (cardApi.v1CardsBulkDeletePost as any).mockResolvedValue({});
        (noteApi.v1NotesBulkTagsPost as any).mockResolvedValue({});
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <CardList deckId={1} deckName="Test Deck" onBack={vi.fn()} />
            </BrowserRouter>
        );
    };

    it('toggles selection mode and checkboxes', async () => {
        renderComponent();

        await waitFor(() => screen.findByText('Front 1'));

        // Initially no checkboxes
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

        // Click Select Cards
        const selectBtn = screen.getByText('Select Cards');
        fireEvent.click(selectBtn);

        // Checkboxes should appear
        expect(screen.getByText('Cancel Selection')).toBeInTheDocument();
        const checkboxes = await screen.findAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);

        // Toggle off
        fireEvent.click(screen.getByText('Cancel Selection'));
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByText('Select Cards')).toBeInTheDocument();
    });

    it('shows bulk action bar when items selected', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));

        fireEvent.click(screen.getByText('Select Cards'));

        const checkboxes = await screen.findAllByRole('checkbox');
        // Index 0 is header checkbox, 1 is first row
        fireEvent.click(checkboxes[1]);

        expect(screen.getByText('1 selected')).toBeInTheDocument();
        expect(screen.getByText('Move to Deck')).toBeInTheDocument();
        expect(screen.getByText('Add Tags')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls bulk move API', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));
        fireEvent.click(screen.getByText('Select Cards'));
        const checkboxes = await screen.findAllByRole('checkbox');
        fireEvent.click(checkboxes[1]); // Select card 1

        fireEvent.click(screen.getByText('Move to Deck'));

        const confirmBtn = screen.getByText('Confirm Move');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(cardApi.v1CardsBulkMovePost).toHaveBeenCalledWith({
                cardIds: [1],
                targetDeckId: 2
            });
        });
    });

    it('opens detail view on row click', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));

        // Click the row 
        fireEvent.click(screen.getByText('Front 1'));

        expect(await screen.findByTestId('note-detail')).toBeInTheDocument();
    });
});

// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NoteCRUD } from './NoteCRUD';
import { noteApi, modelApi } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock the APIs
vi.mock('@/lib/api', () => ({
    noteApi: {
        v1NotesGet: vi.fn(),
        v1NotesBulkTagsPost: vi.fn(),
        v1NotesBulkDeletePost: vi.fn(),
        v1NotesPost: vi.fn(),
        v1NotesIdDelete: vi.fn(),
    },
    modelApi: {
        v1ModelsGet: vi.fn(),
    }
}));

// Mock child components
vi.mock('./BulkTagDialog', () => ({
    BulkTagDialog: ({ open, onConfirm }: any) => open ? <div data-testid="bulk-tag-dialog"><button onClick={() => onConfirm(["tag1"])}>Confirm Tag</button></div> : null
}));
vi.mock('./ui/confirmation-dialog', () => ({
    ConfirmationDialog: ({ open, onConfirm }: any) => open ? <div data-testid="confirmation-dialog"><button onClick={onConfirm}>Confirm Action</button></div> : null
}));
vi.mock('./ui/tag-input', () => ({
    TagInput: ({ onChange }: any) => <input data-testid="tag-input" onChange={(e) => onChange([e.target.value])} />
}));
vi.mock('./NoteDetail', () => ({
    NoteDetail: () => <div data-testid="note-detail">Note Detail View</div>
}));


vi.mock('lucide-react', () => ({
    ArrowUpDown: () => <span>Icon</span>,
    Plus: () => <span>Plus</span>,
    MoreVertical: () => <span>More</span>,
    Pencil: () => <span>Edit</span>,
    Trash2: () => <span>Delete</span>,
    ChevronLeft: () => <span>&lt;</span>,
    ChevronRight: () => <span>&gt;</span>,
    ChevronsLeft: () => <span>&lt;&lt;</span>,
    ChevronsRight: () => <span>&gt;&gt;</span>,
    X: () => <span>X</span>
}));

describe('NoteCRUD Bulk Actions', () => {
    const mockNotes = [
        { id: 101, fields: 'Front 1', tags: 'tag1' },
        { id: 102, fields: 'Front 2', tags: 'tag2' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (noteApi.v1NotesGet as any).mockResolvedValue({
            data: {
                data: mockNotes,
                pagination: { total: 2 }
            }
        });
        (modelApi.v1ModelsGet as any).mockResolvedValue({ data: [] });
        (noteApi.v1NotesBulkTagsPost as any).mockResolvedValue({});
        (noteApi.v1NotesBulkDeletePost as any).mockResolvedValue({});
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <NoteCRUD />
            </BrowserRouter>
        );
    };

    it('toggles selection mode and checkboxes', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));

        // Initially no checkboxes
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

        // Click Select Notes
        const selectBtn = screen.getByText('Select Notes');
        fireEvent.click(selectBtn);

        // Checkboxes should appear
        expect(screen.getByText('Cancel Selection')).toBeInTheDocument();
        const checkboxes = await screen.findAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);

        // Toggle off
        fireEvent.click(screen.getByText('Cancel Selection'));
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByText('Select Notes')).toBeInTheDocument();
    });

    it('shows bulk action bar when items selected', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));

        fireEvent.click(screen.getByText('Select Notes'));

        const checkboxes = await screen.findAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);

        expect(screen.getByText('1 selected')).toBeInTheDocument();
        expect(screen.getByText('Add Tags')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls bulk tag API', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));
        fireEvent.click(screen.getByText('Select Notes'));
        const checkboxes = await screen.findAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);

        fireEvent.click(screen.getByText('Add Tags'));

        const confirmBtn = screen.getByText('Confirm Tag');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(noteApi.v1NotesBulkTagsPost).toHaveBeenCalledWith({
                noteIds: [101],
                tags: ["tag1"]
            });
        });
    });

    it('opens detail view on row click', async () => {
        renderComponent();
        await waitFor(() => screen.findByText('Front 1'));

        // Click the row (not the checkbox)
        fireEvent.click(screen.getByText('Front 1'));

        expect(await screen.findByTestId('note-detail')).toBeInTheDocument();
    });
});

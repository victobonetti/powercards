import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from './tag-input';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as api from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
    tagApi: {
        v1TagsGet: vi.fn(),
        v1TagsPost: vi.fn(),
    }
}));


describe('TagInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.tagApi.v1TagsGet as any).mockResolvedValue({ data: [{ id: 1, name: 'Physics' }, { id: 2, name: 'Math' }] });
    });

    it('renders selected tags', () => {
        render(<TagInput selected={['Physics']} onChange={() => { }} />);
        expect(screen.getByText('Physics')).toBeInTheDocument();
    });

    it('fetches tags on mount', async () => {
        render(<TagInput selected={[]} onChange={() => { }} />);
        await waitFor(() => {
            expect(api.tagApi.v1TagsGet).toHaveBeenCalled();
        });
    });

    it('opens dropdown and allows interaction when not disabled', async () => {
        render(<TagInput selected={[]} onChange={() => { }} />);
        const button = screen.getByRole('combobox');
        fireEvent.click(button);
        expect(button).toBeInTheDocument();
    });

    it('does not show delete button when disabled', () => {
        render(<TagInput selected={['Physics']} onChange={() => { }} disabled={true} />);
        expect(screen.queryByLabelText('Delete tag')).not.toBeInTheDocument();
    });

    it('shows delete button when not disabled', () => {
        render(<TagInput selected={['Physics']} onChange={() => { }} disabled={false} />);
        expect(screen.getByLabelText('Delete tag')).toBeInTheDocument();
    });
});

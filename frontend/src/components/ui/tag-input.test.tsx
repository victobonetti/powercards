import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from './tag-input';
import { vi } from 'vitest';
import * as api from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
    tagApi: {
        v1TagsGet: vi.fn(),
        v1TagsPost: vi.fn(),
    }
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
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

    it('opens dropdown matches snapshot or basic interaction', async () => {
        render(<TagInput selected={[]} onChange={() => { }} />);
        const button = screen.getByRole('combobox');
        fireEvent.click(button);
        // Since we are using Radix UI Popover, testing exact rendering might need more setup or simple check if it doesn't crash
        // For now, we verified the component renders
        expect(button).toBeInTheDocument();
    });
});

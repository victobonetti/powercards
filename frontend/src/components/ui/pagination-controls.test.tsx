import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from './pagination-controls';
import { vi } from 'vitest';

describe('PaginationControls', () => {
    it('renders correctly', () => {
        render(
            <PaginationControls
                currentPage={1}
                totalPages={5}
                onPageChange={() => { }}
                totalItems={50}
                perPage={10}
            />
        );
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
        expect(screen.getByText(/50 entries/)).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
        render(
            <PaginationControls
                currentPage={1}
                totalPages={5}
                onPageChange={() => { }}
                totalItems={50}
                perPage={10}
            />
        );
        expect(screen.getByRole('button', { name: "Go to previous page" })).toBeDisabled();
        expect(screen.getByRole('button', { name: "Go to next page" })).not.toBeDisabled();
    });

    it('disables next button on last page', () => {
        render(
            <PaginationControls
                currentPage={5}
                totalPages={5}
                onPageChange={() => { }}
                totalItems={50}
                perPage={10}
            />
        );
        expect(screen.getByRole('button', { name: "Go to previous page" })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: "Go to next page" })).toBeDisabled();
    });

    it('calls onPageChange when buttons are clicked', () => {
        const handleChange = vi.fn();
        render(
            <PaginationControls
                currentPage={2}
                totalPages={5}
                onPageChange={handleChange}
                totalItems={50}
                perPage={10}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: "Go to previous page" }));
        expect(handleChange).toHaveBeenCalledWith(1);

        fireEvent.click(screen.getByRole('button', { name: "Go to next page" }));
        expect(handleChange).toHaveBeenCalledWith(3);
    });
});

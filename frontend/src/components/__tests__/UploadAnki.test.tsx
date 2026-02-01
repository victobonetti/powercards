// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadAnki } from '../UploadAnki';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import '@testing-library/jest-dom';

// Mock axios
vi.mock('axios', () => {
    return {
        default: {
            post: vi.fn(),
            get: vi.fn(),
            create: vi.fn().mockReturnThis(),
            interceptors: {
                request: { use: vi.fn(), eject: vi.fn() },
                response: { use: vi.fn(), eject: vi.fn() },
            },
        },
    };
});
const mockedAxios = axios as unknown as { post: ReturnType<typeof vi.fn> };


describe('UploadAnki Component', () => {
    const onUploadSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        onUploadSuccess.mockClear();
    });

    it('renders upload input initially', () => {
        render(<UploadAnki onUploadSuccess={onUploadSuccess} />);
        expect(screen.getByText('Upload Anki Collection')).toBeInTheDocument();
        expect(screen.getByLabelText('Anki Package (.apkg)')).toBeInTheDocument();
        expect(screen.getByText('Upload')).toBeDisabled();
    });

    it('enables upload button when file is selected', () => {
        render(<UploadAnki onUploadSuccess={onUploadSuccess} />);
        const file = new File(['dummy content'], 'test.apkg', { type: 'application/octet-stream' });
        const input = screen.getByLabelText('Anki Package (.apkg)');

        fireEvent.change(input, { target: { files: [file] } });

        expect(screen.getByText('Upload')).toBeEnabled();
    });

    it('handles successful fresh upload', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                status: 'SUCCESS',
                importedNotes: 10,
                updatedNotes: 0,
                skippedNotes: 0
            }
        });

        render(<UploadAnki onUploadSuccess={onUploadSuccess} />);
        const file = new File(['dummy content'], 'test.apkg', { type: 'application/octet-stream' });
        const input = screen.getByLabelText('Anki Package (.apkg)');
        fireEvent.change(input, { target: { files: [file] } });

        const uploadBtn = screen.getByText('Upload');
        fireEvent.click(uploadBtn);

        await waitFor(() => {
            expect(screen.getByText('Import Successful!')).toBeInTheDocument();
        });
        expect(screen.getByText(/Imported: 10/)).toBeInTheDocument();

        // Wait for redirection callback
        await waitFor(() => {
            expect(onUploadSuccess).toHaveBeenCalled();
        }, { timeout: 1500 });
    });

    it('handles duplicate detection (partial import)', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                status: 'SKIPPED',
                importedNotes: 0,
                updatedNotes: 0,
                skippedNotes: 5
            }
        });

        render(<UploadAnki onUploadSuccess={onUploadSuccess} />);
        const file = new File(['dummy content'], 'test.apkg', { type: 'application/octet-stream' });
        const input = screen.getByLabelText('Anki Package (.apkg)');
        fireEvent.change(input, { target: { files: [file] } });

        fireEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            expect(screen.getByText('Duplicates Found')).toBeInTheDocument();
        });
        expect(screen.getByText(/Skipped \(Duplicates\): 5/)).toBeInTheDocument();
        expect(screen.getByText('Overwrite All')).toBeInTheDocument();
    });

    it('triggers force overwrite when "Overwrite All" is clicked', async () => {
        // First call returns duplicates
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'SKIPPED', importedNotes: 0, updatedNotes: 0, skippedNotes: 5 }
        });
        // Second call (force) returns success
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'SUCCESS', importedNotes: 0, updatedNotes: 5, skippedNotes: 0 }
        });

        render(<UploadAnki onUploadSuccess={onUploadSuccess} />);
        const file = new File(['dummy content'], 'test.apkg', { type: 'application/octet-stream' });
        const input = screen.getByLabelText('Anki Package (.apkg)');
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.click(screen.getByText('Upload'));

        // Wait for duplicate warning
        await waitFor(() => {
            expect(screen.getByText('Overwrite All')).toBeInTheDocument();
        });

        // Click overwrite
        fireEvent.click(screen.getByText('Overwrite All'));

        // Verify second call had force=true
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        const secondCallArgs = mockedAxios.post.mock.calls[1];
        const formData = secondCallArgs[1] as FormData;
        expect(formData.get('force')).toBe('true');

        await waitFor(() => {
            expect(screen.getByText('Import Successful!')).toBeInTheDocument();
        });
        expect(screen.getByText(/Updated: 5/)).toBeInTheDocument();
    });
});

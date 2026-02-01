import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TagList } from "./TagList";
import { tagApi } from "@/lib/api";
import { AxiosResponse } from "axios";

// Mock toaster
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() })
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate
}));

// Mock Dialog to avoid Portal issues in tests
vi.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
        open ? <div role="dialog">{children}</div> : null
    ),
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("TagList", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should render tags fetched from API", async () => {
        const mockResponse = {
            data: [
                { id: 1, name: "urgent", noteCount: 5 },
                { id: 2, name: "easy", noteCount: 2 }
            ],
            pagination: {
                total: 2,
                currentPage: 1,
                nextPageUri: null,
                lastPageUri: "..."
            }
        };

        vi.spyOn(tagApi, "v1TagsStatsGet").mockResolvedValue({
            data: mockResponse,
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any
        } as AxiosResponse);

        render(<TagList />);

        await waitFor(() => {
            expect(screen.getByText("urgent")).toBeDefined();
            expect(screen.getByText("easy")).toBeDefined();
            expect(screen.getByText("5")).toBeDefined(); // note count
        });
    });

    it("should delete a tag", async () => {
        const mockResponse = {
            data: [
                { id: 1, name: "urgent", noteCount: 5 }
            ],
            pagination: {
                total: 1,
                currentPage: 1
            }
        };

        vi.spyOn(tagApi, "v1TagsStatsGet").mockResolvedValue({
            data: mockResponse,
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any
        } as AxiosResponse);

        const deleteSpy = vi.spyOn(tagApi, "v1TagsIdDelete").mockResolvedValue({
            data: {},
            status: 204,
            statusText: "No Content",
            headers: {},
            config: {} as any
        } as AxiosResponse);

        render(<TagList />);

        // Wait for load
        await waitFor(() => expect(screen.getByText("urgent")).toBeDefined());

        // Click delete button
        const rows = screen.getAllByRole("row");
        const deleteButton = rows[1].querySelector("button");
        if (!deleteButton) throw new Error("Delete button not found");

        fireEvent.click(deleteButton);

        // Dialog
        await waitFor(() => expect(screen.getAllByText("Delete Tag").length).toBeGreaterThan(0));

        // Confirm
        const confirmButton = screen.getAllByText("Delete Tag").find(el => el.tagName === 'BUTTON');
        if (!confirmButton) throw new Error("Confirm button not found");
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith(1);
        });
    });

    it("should navigate on click", async () => {
        const mockResponse = {
            data: [
                { id: 1, name: "urgent", noteCount: 5 }
            ],
            pagination: { total: 1 }
        };

        vi.spyOn(tagApi, "v1TagsStatsGet").mockResolvedValue({
            data: mockResponse
        } as any);

        render(<TagList />);
        await waitFor(() => expect(screen.getByText("urgent")).toBeDefined());

        const row = screen.getAllByRole("row")[1];
        fireEvent.click(row);

        expect(mockNavigate).toHaveBeenCalledWith("/notes?search=tag=urgent");
    });
});

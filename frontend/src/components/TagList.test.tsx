import { describe, it, expect, mock, spyOn, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TagList } from "./TagList";
import { tagApi } from "@/lib/api";
import { AxiosResponse } from "axios";

// Mock toaster
mock.module("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: mock() })
}));

describe("TagList", () => {
    beforeEach(() => {
        // Reset mocks
        mock.restore();
    });

    it("should render tags fetched from API", async () => {
        const mockTags = [
            { id: 1, name: "urgent", noteCount: 5 },
            { id: 2, name: "easy", noteCount: 2 }
        ];

        spyOn(tagApi, "v1TagsStatsGet").mockResolvedValue({
            data: mockTags,
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
        const mockTags = [
            { id: 1, name: "urgent", noteCount: 5 }
        ];

        spyOn(tagApi, "v1TagsStatsGet").mockResolvedValue({
            data: mockTags,
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any
        } as AxiosResponse);

        const deleteSpy = spyOn(tagApi, "v1TagsIdDelete").mockResolvedValue({
            data: {},
            status: 204,
            statusText: "No Content",
            headers: {},
            config: {} as any
        } as AxiosResponse);

        render(<TagList />);

        // Wait for load
        await waitFor(() => expect(screen.getByText("urgent")).toBeDefined());

        // Click delete button (trash icon)
        // We need to find the button. It has a Trash2 icon.
        // The button has classes: "h-8 w-8 text-destructive..."
        // Or we can query by role button within the row
        const rows = screen.getAllByRole("row");
        // Row 0 is header, Row 1 is data
        const deleteButton = rows[1].querySelector("button");
        if (!deleteButton) throw new Error("Delete button not found");

        fireEvent.click(deleteButton);

        // Dialog should open
        await waitFor(() => expect(screen.getByText("Delete Tag")).toBeDefined());

        // Click confirm delete
        const confirmButton = screen.getByText("Delete Tag", { selector: "button" }); // Select the button in footer
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith(1);
        });
    });
});

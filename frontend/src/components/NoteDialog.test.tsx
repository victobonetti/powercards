import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NoteDialog } from "./NoteDialog";
import { noteApi, modelApi } from "@/lib/api";
import { AxiosResponse } from "axios";
import { ANKI_FIELD_SEPARATOR } from "@/lib/anki";

// Mock toaster
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() })
}));

// Mock TagInput as it might be complex
vi.mock("./ui/tag-input", () => ({
    TagInput: ({ selected, onChange, disabled }: any) => (
        <input
            data-testid="tag-input"
            value={selected.join(",")}
            onChange={(e) => onChange(e.target.value.split(","))}
            disabled={disabled}
        />
    )
}));


describe("NoteDialog", () => {

    const mockNote = {
        id: 200,
        tags: "tag1",
        modelId: 500,
        fields: "Front Value" + ANKI_FIELD_SEPARATOR + "Back Value"
    } as any;

    const mockModel = {
        id: 500,
        fields: [
            { name: "Front", ord: 0 },
            { name: "Back", ord: 1 }
        ]
    } as any;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should fetch details and render fields when opened in edit mode", async () => {
        // Setup Mocks
        const noteSpy = vi.spyOn(noteApi, "v1NotesIdGet").mockResolvedValue({
            data: mockNote
        } as AxiosResponse);

        const modelSpy = vi.spyOn(modelApi, "v1ModelsIdGet").mockResolvedValue({
            data: mockModel
        } as AxiosResponse);

        render(
            <NoteDialog
                noteId={200}
                open={true}
                onOpenChange={vi.fn()}
                onSaved={vi.fn()}
                initialReadOnly={false}
            />
        );

        // Wait for fetch
        await waitFor(() => expect(noteSpy).toHaveBeenCalledWith(200));
        await waitFor(() => expect(modelSpy).toHaveBeenCalledWith(500));

        // Expect fields to be rendered
        expect(screen.getByText("Front")).toBeDefined();
        expect(screen.getByText("Back")).toBeDefined();

        // Check values
        expect(screen.getAllByDisplayValue("Front Value").length).toBeGreaterThan(0);
        expect(screen.getAllByDisplayValue("Back Value").length).toBeGreaterThan(0);
    });

    it("should reconstruct flds and save", async () => {
        // Setup Mocks
        vi.spyOn(noteApi, "v1NotesIdGet").mockResolvedValue({
            data: mockNote
        } as AxiosResponse);

        vi.spyOn(modelApi, "v1ModelsIdGet").mockResolvedValue({
            data: mockModel
        } as AxiosResponse);

        const putSpy = vi.spyOn(noteApi, "v1NotesIdPut").mockResolvedValue({} as AxiosResponse);
        const onSaved = vi.fn();

        render(
            <NoteDialog
                noteId={200}
                open={true}
                onOpenChange={vi.fn()}
                onSaved={onSaved}
                initialReadOnly={false}
            />
        );

        // Wait for fetch
        await waitFor(() => expect(screen.getAllByDisplayValue("Front Value").length).toBeGreaterThan(0));

        // Edit "Front Value" -> "Edited Front"
        const frontInputs = screen.getAllByDisplayValue("Front Value");
        const frontInput = frontInputs[0];
        fireEvent.change(frontInput, { target: { value: "Edited Front" } });

        // Save
        const saveButtons = screen.getAllByText("Save Changes");
        fireEvent.click(saveButtons[0]);

        await waitFor(() => {
            expect(putSpy).toHaveBeenCalled();
        });

        const expectedFlds = "Edited Front" + ANKI_FIELD_SEPARATOR + "Back Value";
        const callArgs = putSpy.mock.calls[0][1] as any; // 2nd arg is body
        expect(callArgs.fields).toBe(expectedFlds);
        expect(onSaved).toHaveBeenCalled();
    });

});

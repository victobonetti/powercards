import { describe, it, expect, mock, spyOn, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardEditDialog } from "./CardEditDialog";
import { noteApi, modelApi } from "@/lib/api";
import { AxiosResponse } from "axios";
import { ANKI_FIELD_SEPARATOR } from "@/lib/anki";

// Mock toaster
mock.module("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: mock() })
}));

// Mock TagInput as it might be complex
mock.module("./ui/tag-input", () => ({
    TagInput: ({ selected, onChange }: any) => (
        <input
            data-testid="tag-input"
            value={selected.join(",")}
            onChange={(e) => onChange(e.target.value.split(","))}
        />
    )
}));


describe("CardEditDialog", () => {

    const mockCard = {
        id: 100,
        noteId: 200,
        noteTags: "tag1",
        noteField: "Front Field"
    } as any;

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
        mock.restore();
    });

    it("should fetch details and render fields when opened", async () => {
        // Setup Mocks
        const noteSpy = spyOn(noteApi, "v1NotesIdGet").mockResolvedValue({
            data: mockNote
        } as AxiosResponse);

        const modelSpy = spyOn(modelApi, "v1ModelsIdGet").mockResolvedValue({
            data: mockModel
        } as AxiosResponse);

        render(
            <CardEditDialog
                card={mockCard}
                open={true}
                onOpenChange={mock()}
                onSaved={mock()}
            />
        );

        // Wait for fetch
        await waitFor(() => expect(noteSpy).toHaveBeenCalledWith(200));
        await waitFor(() => expect(modelSpy).toHaveBeenCalledWith(500));

        // Expect fields to be rendered
        expect(screen.getByText("Front")).toBeDefined();
        expect(screen.getByText("Back")).toBeDefined();

        // Check values
        // Textarea might display value. Textarea usually has role textbox?
        const textareas = screen.getAllByRole("textbox"); // Might pick up label inputs? No, labels aren't textboxes.
        // We have 2 fields, plus maybe TagInput? TagInput is mocked as input.
        // Let's find by content
        // Check values
        expect(screen.getAllByDisplayValue("Front Value").length).toBeGreaterThan(0);
        expect(screen.getAllByDisplayValue("Back Value").length).toBeGreaterThan(0);
    });

    it("should reconstruct flds and save", async () => {
        // Setup Mocks
        spyOn(noteApi, "v1NotesIdGet").mockResolvedValue({
            data: mockNote
        } as AxiosResponse);

        spyOn(modelApi, "v1ModelsIdGet").mockResolvedValue({
            data: mockModel
        } as AxiosResponse);

        const putSpy = spyOn(noteApi, "v1NotesIdPut").mockResolvedValue({} as AxiosResponse);
        const onSaved = mock();

        render(
            <CardEditDialog
                card={mockCard}
                open={true}
                onOpenChange={mock()}
                onSaved={onSaved}
            />
        );

        // Edit "Front Value" -> "Edited Front"
        const frontInputs = screen.getAllByDisplayValue("Front Value");
        const frontInput = frontInputs[0];
        fireEvent.change(frontInput, { target: { value: "Edited Front" } });

        // Save
        // We might have duplicates due to dialog mounting or other reasons, pick the enabled one or first one
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


import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HtmlInput } from "./html-input";

describe("HtmlInput", () => {
    it("renders HTML content in preview mode by default", () => {
        const value = "<b>Bold Text</b>";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        // Should find the text "Bold Text" (rendered)
        expect(screen.getByText("Bold Text")).toBeInTheDocument();
        // Should contain the bold tag in innerHTML logic (implicit in finding by text in a container)
    });

    it("toggles to code view and shows raw HTML", () => {
        const value = "<b>Bold Text</b>";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        const toggleButton = screen.getByRole("button", { name: /Edit HTML Source/i });
        fireEvent.click(toggleButton);

        // Now should find a textarea with raw value
        const textarea = screen.getByRole("textbox");
        expect(textarea).toHaveValue("<b>Bold Text</b>");
    });

    it("updates value when editing in code view", () => {
        const handleChange = vi.fn();
        render(<HtmlInput value="" onChange={handleChange} />);

        // Switch to code view
        const toggleButton = screen.getByRole("button", { name: /Edit HTML Source/i });
        fireEvent.click(toggleButton);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "<i>Italic</i>" } });

        expect(handleChange).toHaveBeenCalledWith("<i>Italic</i>");
    });

    it("updates value when editing in preview mode (contentEditable)", () => {
        const handleChange = vi.fn();
        render(<HtmlInput value="Initial" onChange={handleChange} />);

        // Edit ContentEditable
        // Note: Testing contentEditable interactions in JSDOM/HappyDOM can be tricky.
        // We typically simulate 'input' event.
        const previewDiv = screen.getByText("Initial");

        // Simulate typing
        previewDiv.innerHTML = "Initial Changed";
        fireEvent.input(previewDiv);

        expect(handleChange).toHaveBeenCalledWith("Initial Changed");
    });

    it("handles &nbsp; correctly", () => {
        const value = "foo&nbsp;bar";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        // In preview, &nbsp; is rendered as a non-breaking space (char code 160)
        // getByText might match "foo bar" if it normalizes spaces, but let's check.
        const preview = screen.getByText((content, element) => {
            return element?.innerHTML === "foo&nbsp;bar";
        });
        expect(preview).toBeInTheDocument();
    });
});

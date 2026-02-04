
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HtmlInput } from "./html-input";

describe("HtmlInput", () => {
    it("renders Markdown in editor by default", () => {
        const value = "<b>Bold Text</b>";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        // Should find the markdown text "**Bold**" in the textarea
        // Note: htmlToMarkdown("<b>Bold Text</b>") -> "**Bold Text**" or similar.
        // We use getByRole('textbox') to check the value.
        const textarea = screen.getByRole("textbox");
        expect(textarea).toHaveValue("**Bold Text**");
    });

    it("toggles to code view and shows raw HTML", () => {
        const value = "<b>Bold Text</b>";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        const toggleButton = screen.getByTitle("Switch to HTML (Advanced)");
        fireEvent.click(toggleButton);

        // Now should find a textarea with raw value
        const textarea = screen.getByRole("textbox");
        expect(textarea).toHaveValue("<b>Bold Text</b>");
    });

    it("updates value when editing in code view", () => {
        const handleChange = vi.fn();
        render(<HtmlInput value="" onChange={handleChange} />);

        // Switch to code view
        const toggleButton = screen.getByTitle("Switch to HTML (Advanced)");
        fireEvent.click(toggleButton);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "<i>Italic</i>" } });

        expect(handleChange).toHaveBeenCalledWith("<i>Italic</i>");
    });

    it("toggles split view and renders preview", () => {
        const value = "<b>Bold Text</b>";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        // Initially no preview (only textarea)
        // Note: The previous implementation might have had issues with getByText finding text in textarea, 
        // but now we explicitly check for the preview div which has prose class.

        const togglePreviewBtn = screen.getByTitle("Show Split View");
        fireEvent.click(togglePreviewBtn);

        // Now preview should be visible and contain the rendered text
        // The preview renders markdownToHtml("**Bold Text**") -> "<strong>Bold Text</strong>" (roughly)
        const previewText = screen.getByText("Bold Text");
        expect(previewText).toBeInTheDocument();
        expect(previewText.tagName).match(/STRONG|B/);
    });

    it("handles &nbsp; correctly", () => {
        const value = "foo&nbsp;bar";
        render(<HtmlInput value={value} onChange={vi.fn()} />);

        // In Markdown, &nbsp; might be preserved or converted.
        // Let's just check the raw value in html mode to be safe.
        const toggleButton = screen.getByTitle("Switch to HTML (Advanced)");
        fireEvent.click(toggleButton);

        const textarea = screen.getByRole("textbox");
        expect(textarea).toHaveValue("foo&nbsp;bar");
    });
});

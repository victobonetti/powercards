
// @ts-ignore
import { describe, it, expect } from "bun:test";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Initialize happy-dom for DOMParser support in tests
GlobalRegistrator.register();

describe("Markdown Utility (Advanced)", () => {
    describe("htmlToMarkdown", () => {
        it("should convert simple bold/italic", () => {
            expect(htmlToMarkdown("<b>bold</b>")).toBe("**bold**");
            expect(htmlToMarkdown("<i>italic</i>")).toBe("__italic__");
        });

        it("should strip divs and spans but preserve text", () => {
            const input = '<div>Line 1</div><span>Line 2</span>';
            // div adds newline, span just concat
            // "Line 1\nLine 2"
            expect(htmlToMarkdown(input)).toBe("Line 1\nLine 2");
        });

        it("should handle br tags", () => {
            const input = "Line 1<br>Line 2";
            expect(htmlToMarkdown(input)).toBe("Line 1\nLine 2");
        });

        it("should handle entities", () => {
            const input = "Space&nbsp;Here";
            // \u00A0 is non-breaking space
            expect(htmlToMarkdown(input)).toBe("Space\u00A0Here");
        });

        it("should handle images", () => {
            const input = '<img src="test.jpg" alt="Test Image">';
            expect(htmlToMarkdown(input)).toBe("![Test Image](test.jpg)");
        });

        it("should handle nested formatting", () => {
            const input = "<div><b>Bold</b> <i>Italic</i></div>";
            expect(htmlToMarkdown(input)).toBe("**Bold** __Italic__");
        });

        it("should handle the 'Anki Soup' example", () => {
            // Simplified version of user screenshot
            const input = "<div>Line 1</div><div><br></div><div>Line 2</div>";
            const output = htmlToMarkdown(input);
            // Line 1 \n \n Line 2
            expect(output).toContain("Line 1");
            expect(output).toContain("Line 2");
        });

        it("should strip style attributes", () => {
            const input = '<div style="color: red">Colored</div>';
            expect(htmlToMarkdown(input)).toBe("Colored");
        });
    });

    describe("markdownToHtml", () => {
        it("should wrap lines in divs", () => {
            const input = "Line 1\nLine 2";
            const output = markdownToHtml(input);
            expect(output).toBe("<div>Line 1</div><div>Line 2</div>");
        });

        it("should convert ** and __", () => {
            const input = "**Bold** __Italic__";
            expect(markdownToHtml(input)).toContain("<b>Bold</b>");
            expect(markdownToHtml(input)).toContain("<i>Italic</i>");
        });

        it("should convert images", () => {
            const input = "![Description](image.png)";
            expect(markdownToHtml(input)).toContain('<img src="image.png" alt="Description">');
        });

        it("should escape specific html characters in text", () => {
            const input = "<div>Tag</div>";
            // Should be &lt;div&gt;Tag&lt;/div&gt; wrapped in div
            const output = markdownToHtml(input);
            expect(output).toContain("&lt;div&gt;Tag&lt;/div&gt;");
        });
    });
});


// @ts-ignore
import { describe, it, expect } from "bun:test";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

describe("Markdown Utility (Libraries)", () => {
    describe("htmlToMarkdown (Turndown)", () => {
        it("should convert headers", () => {
            expect(htmlToMarkdown("<h1>Header 1</h1>")).toBe("# Header 1");
            expect(htmlToMarkdown("<h2>Header 2</h2>")).toBe("## Header 2");
        });

        it("should convert bold and italic", () => {
            // Turndown defaults: ** for bold, _ for italic configured
            expect(htmlToMarkdown("<b>bold</b>")).toBe("**bold**");
            expect(htmlToMarkdown("<i>italic</i>")).toBe("_italic_");
        });

        it("should convert unordered lists", () => {
            const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
            const md = htmlToMarkdown(html);
            // Turndown adds 3 spaces padding by default for lists
            expect(md).toMatch(/- +Item 1/);
            expect(md).toMatch(/- +Item 2/);
        });

        it("should convert ordered lists", () => {
            const html = "<ol><li>Item 1</li><li>Item 2</li></ol>";
            const md = htmlToMarkdown(html);
            expect(md).toMatch(/1\. +Item 1/);
            expect(md).toMatch(/2\. +Item 2/);
        });

        it("should convert code blocks", () => {
            const html = "<pre><code>print('hello')</code></pre>";
            const md = htmlToMarkdown(html);
            expect(md).toContain("```");
            expect(md).toContain("print('hello')");
        });

        it("should convert links", () => {
            const html = '<a href="https://example.com">Link</a>';
            expect(htmlToMarkdown(html)).toBe("[Link](https://example.com)");
        });

        it("should convert images", () => {
            const html = '<img src="img.png" alt="Alt">';
            expect(htmlToMarkdown(html)).toBe("![Alt](img.png)");
        });
    });

    describe("markdownToHtml (Marked)", () => {
        it("should convert headers", () => {
            const md = "# Header 1";
            expect(markdownToHtml(md)).toBe("<h1>Header 1</h1>");
        });

        it("should convert lists", () => {
            const md = "- Item 1\n- Item 2";
            expect(markdownToHtml(md)).toContain("<ul>");
            expect(markdownToHtml(md)).toContain("<li>Item 1</li>");
        });

        it("should convert bold/italic", () => {
            const md = "**Bold** _Italic_";
            expect(markdownToHtml(md)).toContain("<strong>Bold</strong>"); // Marked uses strong/em
            expect(markdownToHtml(md)).toContain("<em>Italic</em>");
        });
    });
});

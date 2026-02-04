
import TurndownService from 'turndown';
import { marked } from 'marked';

// Configure Turndown (HTML -> Markdown)
const turndownService = new TurndownService({
    headingStyle: 'atx', // # Header
    codeBlockStyle: 'fenced', // ```code```
    bulletListMarker: '-', // - Item
    emDelimiter: '_', // _italic_ (matching user preference approx)
    strongDelimiter: '**' // **bold**
});

turndownService.keep(['audio', 'video', 'img']);

// custom rule for keeping Anki divs as newlines?
// Anki uses <div>line</div>. Turndown converts div to newline usually.
// Let's test standard behavior first.

/**
 * Converts HTML to Markdown using Turndown.
 */
export function htmlToMarkdown(html: string): string {
    if (!html) return "";
    return turndownService.turndown(html);
}

/**
 * Converts Markdown to HTML using Marked.
 */
export function markdownToHtml(markdown: string): string {
    if (!markdown) return "";

    // Marked returns a string (Promise support is optional/async, avoiding async here if possible)
    // Marked 12+ is sync by default if no async extensions.
    // However, it returns string | Promise<string>. 
    // We force sync usage or handle it.

    // Configure marked to not use pedantic, etc.
    // Actually marked.parse is synchronous by default unless async: true is passed.

    const html = marked.parse(markdown, { async: false }) as string;
    return html.trim();
}


/**
 * Converts HTML to a simplified Markdown suitable for editing.
 * Handles:
 * - Block elements (div, p, br) -> Newlines
 * - Inline formatting (b, strong, i, em) -> **, __
 * - Images -> ![alt](src)
 * - Entities -> Decoded by DOM
 */
export function htmlToMarkdown(html: string): string {
    if (!html) return "";

    // Use DOMParser to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Recursive function to traverse and convert nodes
    function convertNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || "";
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        let content = "";

        // Process children first
        el.childNodes.forEach(child => {
            content += convertNode(child);
        });

        // Handle specific tags
        switch (tagName) {
            case 'b':
            case 'strong':
                return `**${content}**`;
            case 'i':
            case 'em':
                return `__${content}__`;
            case 'br':
                return '\n';
            case 'div':
            case 'p':
                // Block elements usually imply a newline before/after, 
                // but we need to be careful not to double up excessively.
                // Anki uses <div>line</div> for lines.
                // Simple heuristic: If it's a div, add newline after.
                return `${content}\n`;
            case 'img':
                const src = el.getAttribute('src') || "";
                const alt = el.getAttribute('alt') || "";
                return `![${alt}](${src})`;
            case 'ul':
            case 'ol':
                return `\n${content}\n`;
            case 'li':
                return `- ${content}\n`;
            default:
                // For other tags (span, font, etc), just return content (strip tag)
                return content;
        }
    }

    let markdown = convertNode(doc.body);

    // Post-processing cleanup
    markdown = markdown
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();

    return markdown;
}

/**
 * Converts the simplified Markdown back to HTML.
 * Wraps lines in <div> to match Anki's typical behavior.
 */
export function markdownToHtml(markdown: string): string {
    if (!markdown) return "";

    // Split by newlines
    const lines = markdown.split(/\n/);

    let html = lines.map(line => {
        if (!line.trim()) return "<div><br></div>"; // Empty line

        let processed = line;

        // Escape HTML entities in text to prevent XSS/breaking
        processed = processed
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Convert MD to HTML tags
        // Images: ![alt](src) -> <img src="src" alt="alt">
        processed = processed.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

        // Bold: **text** -> <b>text</b>
        // Using non-greedy match
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Italic: __text__ -> <i>text</i>
        processed = processed.replace(/__(.*?)__/g, '<i>$1</i>');

        // List items (simple support)
        if (processed.startsWith("- ")) {
            // For simplicity, just bullet + text, or ideally wrapped in ul... 
            // but user didn't ask for full list support.
            // Let's just keep it as text for now or simple bullet?
            // Actually, the user goal is *cleaning* and editing text.
            // If we just wrap in div, it displays fine.
            // Let's NOT convert lists to HTML <ul> yet unless needed, 
            // to keep "Simple" editor simple.
            // BUT, if we strip <ul> on input, we lose it.
            // Let's just output the text line.
        }

        return `<div>${processed}</div>`;
    }).join("");

    return html;
}

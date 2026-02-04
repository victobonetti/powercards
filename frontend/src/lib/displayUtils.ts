
/**
 * Utility to parse Anki fields and determine the best field to display.
 * It skips fields that are purely numerical (like IDs) to find meaningful content.
 */
export function getDisplayField(fields: string | undefined | null): string {
    if (!fields) return "";

    const separator = "\u001f";
    const parts = fields.split(separator);

    for (const part of parts) {
        // Check if the part is NOT purely numeric
        // \d+ matches integer, but we might want to check strict number
        // trimmed part checks
        const trimmed = part.trim();
        if (trimmed.length > 0 && isNaN(Number(trimmed))) {
            return part; // Return first non-numeric field
        }
    }

    // Fallback: return the first field if all are numeric or empty, or empty string if no parts
    return parts.length > 0 ? parts[0] : "";
}

/**
 * Strips HTML tags from a string.
 */
export function stripHtml(html: string): string {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

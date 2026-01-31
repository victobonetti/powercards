export const ANKI_FIELD_SEPARATOR = "\u001f";

export function splitAnkiFields(flds: string): string[] {
    if (!flds) return [];
    return flds.split(ANKI_FIELD_SEPARATOR);
}

export function joinAnkiFields(fields: string[]): string {
    if (!fields) return "";
    return fields.join(ANKI_FIELD_SEPARATOR);
}

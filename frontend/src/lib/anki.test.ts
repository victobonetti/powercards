import { describe, it, expect } from "bun:test";
import { splitAnkiFields, joinAnkiFields, ANKI_FIELD_SEPARATOR } from "./anki";

describe("Anki Helper", () => {
    it("should split fields correctly", () => {
        const flds = `Front${ANKI_FIELD_SEPARATOR}Back${ANKI_FIELD_SEPARATOR}Extra`;
        const result = splitAnkiFields(flds);
        expect(result).toEqual(["Front", "Back", "Extra"]);
    });

    it("should handle empty string split", () => {
        expect(splitAnkiFields("")).toEqual([]);
    });

    it("should join fields correctly", () => {
        const fields = ["Front", "Back", "Extra"];
        const result = joinAnkiFields(fields);
        expect(result).toBe(`Front${ANKI_FIELD_SEPARATOR}Back${ANKI_FIELD_SEPARATOR}Extra`);
    });

    it("should handle empty array join", () => {
        expect(joinAnkiFields([])).toBe("");
    });

    it("should handle fields with special characters", () => {
        const fields = ["<div>HTML</div>", "Normal"];
        const joined = joinAnkiFields(fields);
        const split = splitAnkiFields(joined);
        expect(split).toEqual(fields);
    });
});

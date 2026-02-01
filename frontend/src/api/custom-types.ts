import { DeckResponse } from "./api";

/**
 * 
 * @export
 * @interface ImportResponse
 */
export interface ImportResponse {
    /**
     * 
     * @type {Array<DeckResponse>}
     * @memberof ImportResponse
     */
    'decks'?: Array<DeckResponse>;
    /**
     * 
     * @type {number}
     * @memberof ImportResponse
     */
    'importedNotes'?: number;
    /**
     * 
     * @type {number}
     * @memberof ImportResponse
     */
    'updatedNotes'?: number;
    /**
     * 
     * @type {number}
     * @memberof ImportResponse
     */
    'skippedNotes'?: number;
    /**
     * 
     * @type {string}
     * @memberof ImportResponse
     */
    'status'?: string;
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cardApi } from "@/lib/api";
import { CardResponse } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { TagInput } from "./ui/tag-input";

interface CardEditDialogProps {
    card: CardResponse | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function CardEditDialog({ card, open, onOpenChange, onSaved }: CardEditDialogProps) {
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (card && open) {
            setContent(card.noteField || "");
            const tagString = card.noteTags || "";
            setTags(tagString.split(" ").filter(Boolean));
        }
    }, [card, open]);

    const handleSave = async () => {
        if (!card?.id) return;

        setLoading(true);
        try {
            await cardApi.v1CardsIdPut(card.id, {
                // We typically need to pass all required fields for PUT, but our backend uses updateEntity which selectively updates
                // However, CardRequest is a record (DTO), so we need to construct it compatible with backend expectations.
                // Since our backend logic does null checks (e.g. if (request.noteId() != null)), we can send partial data if we only want to update specific fields?
                // Actually CardRequest is a record, so all fields are present in JSON. But we can send what we have.
                // The backend implementation:
                /*
                 if (request.noteId() != null) entity.note = Note.findById(request.noteId());
                 entity.ord = request.ordinal(); // These are primitives (Integer), if null in JSON -> null in Java object?
                 Wait, Java primitives vs wrappers. CardRequest uses Integer/Long wrappers. So nulls are fine.
                */

                // We only want to update Note Content and Tags for now.
                // But if we send null for 'ordinal', 'due', etc, will it overwrite existing values with null?
                // Backend: entity.ord = request.ordinal(); -> If request.ordinal() is null, entity.ord becomes null.
                // This suggests we SHOULD send existing values or the backend needs to handle nulls more gracefully (e.g. only update if not null).
                // Let's re-read Backend CardResource.updateEntity.

                // Backend: entity.ord = request.ordinal();
                // If request.ordinal() is null, entity.ord becomes null! 
                // This is risky. I should send existing values back.

                ...card, // Spread existing card props? CardResponse structure != CardRequest structure exactly.

                noteContent: content,
                noteTags: tags.join(" "),

                // Map from CardResponse to CardRequest fields where names differ or are needed
                noteId: card.noteId,
                deckId: card.deckId,
                ordinal: card.ordinal,
                modificationTimestamp: card.modificationTimestamp,
                updateSequenceNumber: card.updateSequenceNumber,
                type: card.type,
                queue: card.queue,
                due: card.due,
                interval: card.interval,
                easeFactor: card.easeFactor,
                repetitions: card.repetitions,
                lapses: card.lapses,
                remainingSteps: card.remainingSteps,
                originalDue: card.originalDue,
                originalDeckId: card.originalDeckId,
                flags: card.flags,
                customData: card.customData,
            });

            toast({ title: "Success", description: "Card updated successfully" });
            onOpenChange(false);
            onSaved();
        } catch (error) {
            console.error("Failed to update card", error);
            toast({ title: "Error", description: "Failed to update card", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Card</DialogTitle>
                    <DialogDescription>
                        Edit the card's note content and tags.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="content">Note Content (Front)</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Tags</Label>
                        <TagInput
                            selected={tags}
                            onChange={setTags}
                            placeholder="Add tags..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Press Space to add a tag.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TagInput } from "./ui/tag-input";

interface BulkTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (tags: string[]) => void;
    itemCount: number;
}

export function BulkTagDialog({ open, onOpenChange, onConfirm, itemCount }: BulkTagDialogProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const handleConfirm = () => {
        onConfirm(selectedTags);
        setSelectedTags([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Tags to {itemCount} items</DialogTitle>
                    <DialogDescription>
                        Enter the tags you want to add to the selected items. Existing tags will be preserved.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Tags</Label>
                    <TagInput selected={selectedTags} onChange={setSelectedTags} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={selectedTags.length === 0}>Add Tags</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

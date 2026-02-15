import { createContext, useContext, useState, ReactNode } from "react";
import { noteApi, enhanceModel } from "@/lib/api";
import { joinAnkiFields } from "@/lib/anki";
import { useToast } from "@/hooks/use-toast";


interface TaskContextType {
    enhancingNoteIds: number[];
    enhanceNote: (noteId: number, fields: string[], tags: string[], modelId: number) => Promise<void>;
    registerNoteUpdateCallback: (callback: (noteId: number) => void) => () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
    const [enhancingNoteIds, setEnhancingNoteIds] = useState<number[]>([]);
    const { toast } = useToast();
    const updateCallbacks = useState<Set<(noteId: number) => void>>(new Set())[0];

    const notifyUpdates = (noteId: number) => {
        updateCallbacks.forEach(cb => cb(noteId));
    };

    const enhanceNote = async (noteId: number, fields: string[], tags: string[], modelId: number) => {
        // Prevent duplicate enhancement
        if (enhancingNoteIds.includes(noteId)) return;

        setEnhancingNoteIds(prev => [...prev, noteId]);

        try {
            // 1. Call AI Service
            const enhancedFields = await enhanceModel(fields);

            // 2. Create Draft with enhanced content
            await noteApi.v1NotesIdDraftPost(noteId, {
                modelId: modelId,
                fields: joinAnkiFields(enhancedFields),
                tags: tags.join(" ")
            });

            toast({ title: "Note Enhanced", description: "Draft created with AI improvements." });

            // 3. Notify listeners (NoteCRUD to update list, NoteDetail to reload if open)
            notifyUpdates(noteId);

        } catch (error) {
            console.error("Enhancement failed", error);
            toast({ title: "Enhancement Failed", description: "Could not enhance note.", variant: "destructive" });
        } finally {
            setEnhancingNoteIds(prev => prev.filter(id => id !== noteId));
        }
    };

    const registerNoteUpdateCallback = (callback: (noteId: number) => void) => {
        updateCallbacks.add(callback);
        return () => {
            updateCallbacks.delete(callback);
        };
    };

    return (
        <TaskContext.Provider value={{ enhancingNoteIds, enhanceNote, registerNoteUpdateCallback }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTask() {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error("useTask must be used within a TaskProvider");
    }
    return context;
}

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface SettingsContextType {
    isOpen: boolean;
    openSettings: (tab?: string) => void;
    closeSettings: () => void;
    activeTab: string;
    onCloseCallback: (() => void) | null;
    openSettingsWithCallback: (tab?: string, callback?: () => void) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // We can store a callback to run when the modal closes
    // This is useful for returning to previous state/modal
    const [onCloseCallback, setOnCloseCallback] = useState<(() => void) | null>(null);

    const openSettings = useCallback((tab: string = "general") => {
        setActiveTab(tab);
        setIsOpen(true);
        // Clear callback if opened normally
        setOnCloseCallback(null);
    }, []);

    const openSettingsWithCallback = useCallback((tab: string = "general", callback?: () => void) => {
        setActiveTab(tab);
        if (callback) {
            setOnCloseCallback(() => callback);
        } else {
            setOnCloseCallback(null);
        }
        setIsOpen(true);
    }, []);

    const closeSettings = useCallback(() => {
        setIsOpen(false);
        // Execute callback if it exists
        if (onCloseCallback) {
            onCloseCallback();
            setOnCloseCallback(null);
        }
    }, [onCloseCallback]);

    return (
        <SettingsContext.Provider value={{
            isOpen,
            openSettings,
            closeSettings,
            activeTab,
            onCloseCallback,
            openSettingsWithCallback
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}

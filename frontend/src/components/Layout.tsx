import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
    children: ReactNode;
    currentView: "upload" | "decks";
    onNavigate: (view: "upload" | "decks") => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
    return (
        <div className="flex min-h-screen font-sans antialiased text-neutral-900 dark:text-neutral-50 bg-background">
            <Sidebar currentView={currentView} onNavigate={onNavigate} />
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

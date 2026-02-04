import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
    children: ReactNode;
    currentView: "upload" | "decks" | "tags" | "factory";
    onNavigate: (view: "upload" | "decks" | "tags" | "factory") => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden font-sans antialiased text-neutral-900 dark:text-neutral-50 bg-background">
            <Sidebar currentView={currentView} onNavigate={onNavigate} />
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";
import { UserHeader } from "./UserHeader";

interface LayoutProps {
    children?: ReactNode;
    currentView: "upload" | "decks" | "tags" | "factory";
    onNavigate: (view: "upload" | "decks" | "tags" | "factory") => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden font-sans antialiased text-neutral-900 dark:text-neutral-50">
            <Sidebar currentView={currentView} onNavigate={onNavigate} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header Bar */}
                <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-end px-6 shrink-0">
                    <UserHeader />
                </header>
                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
}


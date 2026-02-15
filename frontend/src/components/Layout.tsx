import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";
import { UserHeader } from "./UserHeader";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { SettingsModal } from "./SettingsModal";

interface LayoutProps {
    children?: ReactNode;
    currentView: "bridge" | "decks" | "tags" | "factory";
    onNavigate: (view: "bridge" | "decks" | "tags" | "factory") => void;
}

function LayoutContent({ children, currentView, onNavigate }: LayoutProps) {
    const { isOpen, closeSettings, activeTab } = useSettings();

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
            <SettingsModal open={isOpen} onOpenChange={(open) => !open && closeSettings()} defaultTab={activeTab} />
        </div>
    );
}

export function Layout(props: LayoutProps) {
    return (
        <SettingsProvider>
            <LayoutContent {...props} />
        </SettingsProvider>
    );
}


import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { DeckCRUD } from "./components/DeckCRUD";
import { NoteCRUD } from "./components/NoteCRUD";
import { TagList } from "./components/TagList";
import { FlashcardFactory } from "./components/FlashcardFactory";
import { Button } from "./components/ui/button";
import { Layers, FileText } from "lucide-react";
import { Layout } from "./components/Layout";
import { UploadAnki } from "./components/UploadAnki";
import { ThemeProvider } from "./components/theme-provider";
import { PageHeader } from "./components/ui/page-header";

import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext"; // Ensure useWorkspace is exported and imported
import { FlashcardFactoryProvider } from "./context/FlashcardFactoryContext";
import { Toaster } from "./components/ui/toaster";
import { WorkspaceCreateDialog } from "./components/WorkspaceCreateDialog";


import { AppAuthProvider } from "./auth/AuthProvider";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [highlightNewDecks, setHighlightNewDecks] = useState(false);

  // Derive currentView from location
  const [currentView, setCurrentView] = useState<"upload" | "decks" | "tags" | "factory">("upload");

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/upload") {
      setCurrentView("upload");
    } else if (location.pathname === "/tags") {
      setCurrentView("tags");
    } else if (location.pathname === "/factory") {
      setCurrentView("factory");
    } else {
      setCurrentView("decks");
    }
  }, [location.pathname]);

  const handleUploadSuccess = () => {
    setHighlightNewDecks(true);
    navigate("/decks");
    // Reset highlight after some time
    setTimeout(() => setHighlightNewDecks(false), 5000);
  };

  const handleNavigate = (view: "upload" | "decks" | "tags" | "factory") => {
    if (view === "upload") navigate("/");
    else if (view === "decks") navigate("/decks");
    else if (view === "tags") navigate("/tags");
    else if (view === "factory") navigate("/factory");
  };

  return (
    <AppAuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <WorkspaceProvider>
          <FlashcardFactoryProvider>
            <ForceWorkspaceWrapper>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout currentView={currentView} onNavigate={handleNavigate} />}>
                    <Route path="/" element={<UploadAnki onUploadSuccess={handleUploadSuccess} />} />
                    <Route path="/upload" element={<Navigate to="/" replace />} />
                    <Route path="/tags" element={
                      <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
                        <PageHeader
                          title="Tags"
                          description="Manage your collection tags. Click on a tag to view all notes with that tag."
                        />
                        <TagList />
                      </div>
                    } />
                    <Route path="/decks" element={
                      <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
                        <DecksAndNotesView activeTab="decks" highlightNewDecks={highlightNewDecks} />
                      </div>
                    } />
                    <Route path="/factory" element={<FlashcardFactory />} />
                    <Route path="/notes" element={
                      <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
                        <DecksAndNotesView activeTab="notes" highlightNewDecks={false} />
                      </div>
                    } />
                  </Route>
                </Route>
              </Routes>
              <Toaster />
            </ForceWorkspaceWrapper>
          </FlashcardFactoryProvider>
        </WorkspaceProvider>
      </ThemeProvider >
    </AppAuthProvider>
  );
}


import { useAuth } from "@/auth/AuthProvider";

// Wrapper to handle forced workspace creation
function ForceWorkspaceWrapper({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();
  const auth = useAuth();

  // Only force create if authenticated, loaded, and no workspaces
  const shouldForceCreate = auth.isAuthenticated && !isLoading && workspaces.length === 0;

  return (
    <>
      {/* Show main content but overlay will block it if dialog is forced */}
      {children}
      <WorkspaceCreateDialog
        open={shouldForceCreate}
        onOpenChange={() => { }} // No-op, cannot close
        force={true}
      />
    </>
  );
}

function DecksAndNotesView({ activeTab: initialTab, highlightNewDecks }: { activeTab: "decks" | "notes", highlightNewDecks: boolean }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"decks" | "notes">(initialTab);

  const handleTabChange = (tab: "decks" | "notes") => {
    setActiveTab(tab);
    navigate(tab === "decks" ? "/decks" : "/notes");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="My Decks"
        description="Manage your decks and notes here."
      >
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-muted-foreground mr-1">View</span>
          <div className="flex items-center bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === "decks" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("decks")}
              className={activeTab === "decks" ? "bg-background shadow-sm" : ""}
            >
              <Layers className="mr-2 h-4 w-4" /> Decks
            </Button>
            <Button
              variant={activeTab === "notes" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("notes")}
              className={activeTab === "notes" ? "bg-background shadow-sm" : ""}
            >
              <FileText className="mr-2 h-4 w-4" /> Notes
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === "decks" ? <DeckCRUD highlightNew={highlightNewDecks} /> : <NoteCRUD />}
      </div>
    </div>
  );
}

export default App;

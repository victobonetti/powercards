import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { DeckCRUD } from "./components/DeckCRUD";
import { NoteCRUD } from "./components/NoteCRUD";
import { TagList } from "./components/TagList";
import { Button } from "./components/ui/button";
import { Layers, FileText } from "lucide-react";
import { Layout } from "./components/Layout";
import { UploadAnki } from "./components/UploadAnki";
import { ThemeProvider } from "./components/theme-provider";
import { PageHeader } from "./components/ui/page-header";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [highlightNewDecks, setHighlightNewDecks] = useState(false);

  // Derive currentView from location
  const [currentView, setCurrentView] = useState<"upload" | "decks" | "tags">("upload");

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/upload") {
      setCurrentView("upload");
    } else if (location.pathname === "/tags") {
      setCurrentView("tags");
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

  const handleNavigate = (view: "upload" | "decks" | "tags") => {
    if (view === "upload") navigate("/");
    else if (view === "decks") navigate("/decks");
    else if (view === "tags") navigate("/tags");
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Layout currentView={currentView} onNavigate={handleNavigate}>
        <Routes>
          <Route path="/" element={<UploadAnki onUploadSuccess={handleUploadSuccess} />} />
          <Route path="/upload" element={<Navigate to="/" replace />} />
          <Route path="/tags" element={
            <div className="space-y-8 p-4">
              <PageHeader
                title="Tags"
                description="Manage your collection tags."
              />
              <TagList />
            </div>
          } />
          <Route path="/decks" element={
            <div className="h-[calc(100vh-4rem)] w-full">
              <DecksAndNotesView activeTab="decks" highlightNewDecks={highlightNewDecks} />
            </div>
          } />
          <Route path="/notes" element={
            <div className="h-[calc(100vh-4rem)] w-full">
              <DecksAndNotesView activeTab="notes" highlightNewDecks={false} />
            </div>
          } />
        </Routes>
      </Layout>
    </ThemeProvider >
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
    <div className="flex flex-col h-full gap-6 p-6 pb-0">
      <PageHeader
        title="My Decks"
        description="Manage your decks and notes here."
        className="mb-0"
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

      <div className="flex-1 min-h-0">
        {activeTab === "decks" ? <DeckCRUD highlightNew={highlightNewDecks} /> : <NoteCRUD />}
      </div>
    </div>
  );
}

export default App;

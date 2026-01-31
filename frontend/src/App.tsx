import { useState } from "react";
import { DeckCRUD } from "./components/DeckCRUD";
import { NoteCRUD } from "./components/NoteCRUD";
import { TagList } from "./components/TagList";
import { Button } from "./components/ui/button";
import { Layers, FileText } from "lucide-react";
import { Layout } from "./components/Layout";
import { UploadAnki } from "./components/UploadAnki";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  const [currentView, setCurrentView] = useState<"upload" | "decks" | "tags">("upload");
  const [activeTab, setActiveTab] = useState<"decks" | "notes">("decks");
  const [highlightNewDecks, setHighlightNewDecks] = useState(false);

  const handleUploadSuccess = () => {
    setCurrentView("decks");
    setActiveTab("decks");
    setHighlightNewDecks(true);
    // Reset highlight after some time
    setTimeout(() => setHighlightNewDecks(false), 5000);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {currentView === "upload" ? (
          <UploadAnki onUploadSuccess={handleUploadSuccess} />
        ) : currentView === "tags" ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Tags</h2>
            <p className="text-muted-foreground">Manage your collection tags.</p>
            <TagList />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">My Decks</h2>
                <p className="text-muted-foreground">Manage your decks and notes here.</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-medium text-muted-foreground mr-1">View</span>
                <div className="flex items-center bg-muted p-1 rounded-lg">
                  <Button
                    variant={activeTab === "decks" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("decks")}
                    className={activeTab === "decks" ? "bg-background shadow-sm" : ""}
                  >
                    <Layers className="mr-2 h-4 w-4" /> Decks
                  </Button>
                  <Button
                    variant={activeTab === "notes" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("notes")}
                    className={activeTab === "notes" ? "bg-background shadow-sm" : ""}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Notes
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              {activeTab === "decks" ? <DeckCRUD highlightNew={highlightNewDecks} /> : <NoteCRUD />}
            </div>
          </div>
        )}
      </Layout>
    </ThemeProvider >
  );
}

export default App;

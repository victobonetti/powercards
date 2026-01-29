import { useState } from "react";
import { DeckCRUD } from "./components/DeckCRUD";
import { NoteCRUD } from "./components/NoteCRUD";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";
import { Layers, FileText, Settings } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState<"decks" | "notes">("decks");

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans antialiased text-neutral-900 dark:text-neutral-50">
      <header className="border-b bg-white dark:bg-neutral-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Layers className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PowerCards</h1>
          </div>
          <nav className="flex items-center gap-1">
            <Button
              variant={activeTab === "decks" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("decks")}
            >
              <Layers className="mr-2 h-4 w-4" /> Decks
            </Button>
            <Button
              variant={activeTab === "notes" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("notes")}
            >
              <FileText className="mr-2 h-4 w-4" /> Notes
            </Button>
            <div className="w-[1px] h-6 bg-border mx-2" />
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === "decks" ? (
            <DeckCRUD />
          ) : (
            <NoteCRUD />
          )}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

export default App;

import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, useParams } from "react-router-dom";
import { DeckCRUD } from "./components/DeckCRUD";
import { NoteCRUD } from "./components/NoteCRUD";
import { TagList } from "./components/TagList";
import { FlashcardFactory } from "./components/FlashcardFactory";
import { Button } from "./components/ui/button";
import { Layers, FileText } from "lucide-react";
import { Layout } from "./components/Layout";
import { UploadAnki } from "./components/UploadAnki";
import { ThemeProvider, useTheme } from "./components/theme-provider";
import { PageHeader } from "./components/ui/page-header";
import { applyTheme } from "./lib/themes";

import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { FlashcardFactoryProvider } from "./context/FlashcardFactoryContext";
import { Toaster } from "./components/ui/toaster";
import { WorkspaceCreateDialog } from "./components/WorkspaceCreateDialog";


import { AppAuthProvider } from "./auth/AuthProvider";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { PaperBackground } from "./components/PaperBackground";

// Redirect root to default language (en)
function RootRedirect() {
  return <Navigate to="/en" replace />;
}

// Validate language parameter
function LanguageGuard() {
  const { lang } = useParams();
  // const { setLanguage } = useLanguage(); // Unused

  useEffect(() => {
    if (lang === 'en' || lang === 'pt') {
      // Correct lang
    } else {
      // Invalid lang, could redirect or just let it fail/default
    }
  }, [lang]);

  if (lang !== 'en' && lang !== 'pt') {
    return <Navigate to="/en" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AppAuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <WorkspaceProvider>
          <FlashcardFactoryProvider>
            <LanguageProvider>
              <PaperBackground />
              <ForceWorkspaceWrapper>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<Navigate to="/en/login" replace />} />
                  <Route path="/register" element={<Navigate to="/en/register" replace />} />

                  <Route path="/:lang" element={<LanguageGuard />}>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />

                    <Route element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        {/* These paths are relative to /:lang */}
                        <Route index element={<UploadWrapper />} />
                        <Route path="upload" element={<Navigate to="../" replace />} />
                        <Route path="tags" element={<TagsView />} />
                        <Route path="decks" element={<DecksWrapper />} />
                        <Route path="factory" element={<FlashcardFactory />} />
                        <Route path="notes" element={<NotesWrapper />} />
                        <Route path="profile" element={<ProfilePage />} />
                      </Route>
                    </Route>
                  </Route>
                </Routes>
                <Toaster />
              </ForceWorkspaceWrapper>
            </LanguageProvider>
          </FlashcardFactoryProvider>
        </WorkspaceProvider>
      </ThemeProvider >
    </AppAuthProvider>
  );
}

// Wrapper to hold previous logic for AppLayout
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const [currentView, setCurrentView] = useState<"upload" | "decks" | "tags" | "factory">("upload");

  useEffect(() => {
    // pathname includes /en/ or /pt/
    // Remove the language part to check the rest
    let path = location.pathname.substring(3); // Remove /en or /pt
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    if (path === "" || path === "/" || path === "/upload") {
      setCurrentView("upload");
    } else if (path === "/tags") {
      setCurrentView("tags");
    } else if (path === "/factory") {
      setCurrentView("factory");
    } else {
      setCurrentView("decks");
    }
  }, [location.pathname]);

  const handleNavigate = (view: "upload" | "decks" | "tags" | "factory") => {
    const prefix = `/${lang}`;
    if (view === "upload") navigate(`${prefix}/`);
    else if (view === "decks") navigate(`${prefix}/decks`);
    else if (view === "tags") navigate(`${prefix}/tags`);
    else if (view === "factory") navigate(`${prefix}/factory`);
  };

  return <Layout currentView={currentView} onNavigate={handleNavigate} />;
}

function UploadWrapper() {
  const navigate = useNavigate();
  const { lang } = useParams();
  // Note: highlightNewDecks state lifting is tricky with this refactor. 
  // Ideally, use context or simpler prop drill. 
  // For now, I'll pass simple handler.

  const handleUploadSuccess = () => {
    navigate(`/${lang}/decks`, { state: { highlightNew: true } });
  };

  return <UploadAnki onUploadSuccess={handleUploadSuccess} />;
}


function TagsView() {
  const { t } = useLanguage();
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
      <PageHeader
        title={t.tags.title}
        description={t.tags.description}
      />
      <TagList />
    </div>
  );
}

function DecksWrapper() {
  const location = useLocation();
  const highlightNew = location.state?.highlightNew || false;
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
      <DecksAndNotesView activeTab="decks" highlightNewDecks={highlightNew} />
    </div>
  );
}

function NotesWrapper() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col h-full gap-6 p-6 pb-0">
      <DecksAndNotesView activeTab="notes" highlightNewDecks={false} />
    </div>
  );
}


import { useAuth } from "@/auth/AuthProvider";

// Wrapper to handle forced workspace creation
function ForceWorkspaceWrapper({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();
  const auth = useAuth();
  const { theme } = useTheme();

  // Apply User Theme
  useEffect(() => {
    const palette = auth.profile?.colorPalette || localStorage.getItem("user-palette") || "tangerine";
    const userPrefersDark = auth.profile?.darkMode;
    const isDark = userPrefersDark ?? (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

    // Check if we need to sync theme state
    // This is tricky because theme provider thinks it's strictly "dark" or "light" or "system"
    // But we just want to ensure class is applied. applyTheme handles palette.
    // For dark mode, we might need to set it in provider if it differs?

    applyTheme(palette, isDark);

    // Optional: Sync provider state if we have a definitive user preference
    // if (userPrefersDark !== undefined && userPrefersDark !== (theme === 'dark')) {
    // setTheme(userPrefersDark ? 'dark' : 'light'); 
    // }
  }, [auth.profile?.colorPalette, auth.profile?.darkMode, theme]);

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
  const { lang } = useParams();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"decks" | "notes">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: "decks" | "notes") => {
    setActiveTab(tab);
    navigate(`/${lang}/${tab}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title={activeTab === 'decks' ? t.decks.title : t.notes.title}
        description={activeTab === 'decks' ? t.decks.description : t.notes.description}
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
              <Layers className="mr-2 h-4 w-4" /> {t.navigation.decks}
            </Button>
            <Button
              variant={activeTab === "notes" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("notes")}
              className={activeTab === "notes" ? "bg-background shadow-sm" : ""}
            >
              <FileText className="mr-2 h-4 w-4" /> {t.navigation.notes}
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


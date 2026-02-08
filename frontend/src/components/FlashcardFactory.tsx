import { useRef, useEffect } from "react";
import { Send, Sparkles, User, Bot, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PageHeader } from "./ui/page-header";
import { cn } from "@/lib/utils";
import { useFlashcardFactory } from "@/context/FlashcardFactoryContext";
import { ScrollArea } from "./ui/scroll-area";
import { useLanguage } from "@/context/LanguageContext";

export function FlashcardFactory() {
    const { t } = useLanguage();
    const {
        chats,
        currentChatId,
        messages,
        input,
        setInput,
        itemsLoading,
        isProcessing,
        sendMessage,
        createNewChat,
        selectChat,
        deleteChat
    } = useFlashcardFactory();

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex flex-col gap-6 p-6 pb-0">
            <PageHeader
                title={t.factory.title}
                description={t.factory.description}
            >
                <Button onClick={createNewChat} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> {t.factory.newChat}
                </Button>
            </PageHeader>

            <div className="flex-1 flex gap-6 min-h-0 pb-6">
                {/* Chat List Sidebar */}
                <div className="w-64 flex flex-col gap-2 shrink-0 border rounded-lg bg-card overflow-hidden">
                    <div className="p-3 border-b bg-muted/30 font-medium text-sm flex items-center justify-between">
                        <span>{t.factory.history}</span>
                        {itemsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="flex flex-col gap-1 p-2">
                            {chats.length === 0 ? (
                                <div className="text-center text-xs text-muted-foreground py-8">
                                    {t.factory.noHistory}
                                </div>
                            ) : (
                                chats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={cn(
                                            "group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-muted/80 transition-colors",
                                            currentChatId === chat.id ? "bg-muted font-medium text-primary" : "text-muted-foreground"
                                        )}
                                        onClick={() => selectChat(chat.id)}
                                    >
                                        <MessageSquare className="h-4 w-4 shrink-0" />
                                        <div className="flex-1 truncate">
                                            {chat.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteChat(chat.id);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-muted/30 rounded-lg border overflow-hidden relative">
                    {!currentChatId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                            <Bot className="h-12 w-12 opacity-20" />
                            <p>{t.factory.selectChat}</p>
                            <Button onClick={createNewChat}>
                                {t.factory.startNewChat}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollAreaRef}>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3 max-w-[80%]",
                                            msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            msg.role === "ai" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {msg.role === "ai" ? <Bot size={18} /> : <User size={18} />}
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-lg text-sm",
                                            msg.role === "ai" ? "bg-background border shadow-sm" : "bg-primary text-primary-foreground"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex gap-3 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20 text-primary">
                                            <Sparkles size={18} className="animate-pulse" />
                                        </div>
                                        <div className="p-3 rounded-lg text-sm bg-background border shadow-sm text-muted-foreground italic">
                                            {t.factory.thinking}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-background border-t mt-auto">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                                    className="flex gap-2"
                                >
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={t.factory.typeMessage}
                                        className="flex-1"
                                        disabled={isProcessing}
                                    />
                                    <Button type="submit" disabled={isProcessing || !input.trim()}>
                                        <Send size={18} />
                                        <span className="sr-only">{t.factory.send}</span>
                                    </Button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}

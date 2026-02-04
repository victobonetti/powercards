import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PageHeader } from "./ui/page-header";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
}

export function FlashcardFactory() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "ai",
            content: "Hello! I'm your AI assistant. How can I help you create flashcards today?"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8088/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                },
                body: userMessage.content
            });

            if (!response.ok) {
                throw new Error("Failed to get response from AI");
            }

            const data = await response.text();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: data
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: "Sorry, I encountered an error communicating with the server."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex flex-col gap-6 p-6 pb-0">
            <PageHeader
                title="Flashcard Factory"
                description="Chat with AI to generate cards, improve content, or just brainstorm."
            />

            <div className="flex-1 flex flex-col min-h-0 bg-muted/30 rounded-lg border overflow-hidden relative">
                <div
                    ref={scrollAreaRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
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
                    {isLoading && (
                        <div className="flex gap-3 max-w-[80%]">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20 text-primary">
                                <Sparkles size={18} className="animate-pulse" />
                            </div>
                            <div className="p-3 rounded-lg text-sm bg-background border shadow-sm text-muted-foreground italic">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-background border-t mt-auto">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            <Send size={18} />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

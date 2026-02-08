import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "./WorkspaceContext";

export interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    createdAt?: string;
}

export interface Chat {
    id: string;
    name: string;
    workspaceId: string;
    createdAt: string;
    updatedAt: string;
}

interface FlashcardFactoryContextType {
    chats: Chat[];
    currentChatId: string | null;
    messages: Message[];
    input: string;
    itemsLoading: boolean; // Loading chats
    isProcessing: boolean; // AI processing
    notificationChatIds: Set<string>; // Chats with unread messages
    setInput: (input: string) => void;
    createNewChat: () => Promise<void>;
    selectChat: (chatId: string) => void;
    deleteChat: (chatId: string) => Promise<void>;
    sendMessage: () => Promise<void>;
    clearNotification: (chatId: string) => void;
}

const FlashcardFactoryContext = createContext<FlashcardFactoryContextType | undefined>(undefined);

export function FlashcardFactoryProvider({ children }: { children: ReactNode }) {
    const { currentWorkspaceId } = useWorkspace();
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [itemsLoading, setItemsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [notificationChatIds, setNotificationChatIds] = useState<Set<string>>(new Set());

    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Ref to track current location for async callbacks
    const locationRef = useRef(location);
    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    // Fetch chats when workspace changes
    useEffect(() => {
        if (currentWorkspaceId) {
            fetchChats();
        } else {
            setChats([]);
            setMessages([]);
            setCurrentChatId(null);
        }
    }, [currentWorkspaceId]);

    // Fetch messages when currentChatId changes
    useEffect(() => {
        if (currentChatId) {
            fetchMessages(currentChatId);
        } else {
            setMessages([]);
        }
    }, [currentChatId]);

    // Clear notification if we are viewing the chat on factory page
    useEffect(() => {
        if (location.pathname === "/factory" && currentChatId) {
            clearNotification(currentChatId);
        }
    }, [location.pathname, currentChatId]);

    const fetchChats = async () => {
        if (!currentWorkspaceId) return;
        setItemsLoading(true);
        try {
            const response = await axios.get("/api/v1/chats", {
                headers: {
                    "X-Workspace-Id": currentWorkspaceId
                }
            });
            setChats(response.data);
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setItemsLoading(false);
        }
    };

    const createNewChat = async () => {
        if (!currentWorkspaceId) return;
        try {
            const response = await axios.post("/api/v1/chats", { name: "New Chat" }, {
                headers: {
                    "X-Workspace-Id": currentWorkspaceId
                }
            });
            const newChat = response.data;
            setChats(prev => [newChat, ...prev]);
            setCurrentChatId(newChat.id);
        } catch (error) {
            console.error("Error creating chat:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create new chat."
            });
        }
    };

    const deleteChat = async (chatId: string) => {
        if (!currentWorkspaceId) return;
        try {
            await axios.delete(`/api/v1/chats/${chatId}`, {
                headers: {
                    "X-Workspace-Id": currentWorkspaceId
                }
            });
            setChats(prev => prev.filter(c => c.id !== chatId));
            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    }

    const selectChat = (chatId: string) => {
        setCurrentChatId(chatId);
        clearNotification(chatId);
    };

    const fetchMessages = async (chatId: string) => {
        if (!currentWorkspaceId) return;
        try {
            const response = await axios.get(`/api/v1/chats/${chatId}/history`, {
                headers: {
                    "X-Workspace-Id": currentWorkspaceId
                }
            });
            setMessages(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    const clearNotification = (chatId: string) => {
        if (notificationChatIds.has(chatId)) {
            setNotificationChatIds(prev => {
                const next = new Set(prev);
                next.delete(chatId);
                return next;
            });
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isProcessing || !currentChatId || !currentWorkspaceId) return;

        const tempId = Date.now().toString();
        const userMessage: Message = {
            id: tempId,
            role: "user",
            content: input,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            const response = await axios.post(`/api/v1/chats/${currentChatId}/messages`, userMessage.content, {
                headers: {
                    "Content-Type": "text/plain",
                    "X-Workspace-Id": currentWorkspaceId
                }
            });

            const aiMessageData = response.data;

            const aiMessage: Message = {
                id: aiMessageData.id || (Date.now() + 1).toString(),
                role: "ai",
                content: aiMessageData.content,
                createdAt: aiMessageData.createdAt
            };

            setMessages(prev => [...prev, aiMessage]);

            // If this was the first message exchange, refresh chat list to get updated name
            if (messages.length === 0) {
                fetchChats();
            }

            // Notify if not on the factory page
            if (locationRef.current.pathname !== "/factory") {
                setNotificationChatIds(prev => new Set(prev).add(currentChatId));

                toast({
                    title: "Flashcard Factory",
                    description: "New response received!",
                    action: (
                        <div
                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 rounded-md flex items-center justify-center text-xs cursor-pointer"
                            onClick={() => {
                                navigate("/factory");
                            }}
                        >
                            View
                        </div>
                    ),
                });
            }

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: "Sorry, I encountered an error communicating with the server."
            };
            setMessages(prev => [...prev, errorMessage]);

            if (locationRef.current.pathname !== "/factory") {
                toast({
                    variant: "destructive",
                    title: "Flashcard Factory",
                    description: "Failed to get response.",
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <FlashcardFactoryContext.Provider value={{
            chats,
            currentChatId,
            messages,
            input,
            itemsLoading,
            isProcessing,
            notificationChatIds,
            setInput,
            createNewChat,
            selectChat,
            deleteChat,
            sendMessage,
            clearNotification
        }}>
            {children}
        </FlashcardFactoryContext.Provider>
    );
}

export function useFlashcardFactory() {
    const context = useContext(FlashcardFactoryContext);
    if (context === undefined) {
        throw new Error("useFlashcardFactory must be used within a FlashcardFactoryProvider");
    }
    return context;
}

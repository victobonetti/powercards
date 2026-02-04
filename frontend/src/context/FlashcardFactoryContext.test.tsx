
import { renderHook, act, waitFor } from "@testing-library/react";
import { FlashcardFactoryProvider, useFlashcardFactory, Chat } from "@/context/FlashcardFactoryContext";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API calls
global.fetch = vi.fn();

import { MemoryRouter } from "react-router-dom";

// Mock useWorkspace
vi.mock("@/context/WorkspaceContext", async () => {
    return {
        useWorkspace: () => ({
            currentWorkspaceId: "ws-1",
            activeWorkspace: { id: "ws-1", name: "Default" },
        }),
        WorkspaceProvider: ({ children }: any) => <div>{children}</div>
    };
});

// Mock useToast
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe("FlashcardFactoryContext", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>
            <FlashcardFactoryProvider>{children}</FlashcardFactoryProvider>
        </MemoryRouter>
    );

    it("should fetch chats on mount", async () => {
        const mockChats: Chat[] = [{ id: "c1", name: "Chat 1", workspaceId: "ws-1", createdAt: "", updatedAt: "" }];
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockChats,
        });

        const { result } = renderHook(() => useFlashcardFactory(), { wrapper });

        // Wait for chats to be populated
        await waitFor(() => {
            expect(result.current.chats).toHaveLength(1);
        }, { timeout: 2000 });

        expect(result.current.chats).toEqual(mockChats);
        expect(global.fetch).toHaveBeenCalledWith("http://localhost:8088/chats", expect.objectContaining({
            headers: { "X-Workspace-Id": "ws-1" }
        }));
    });

    it("should create a new chat", async () => {
        // Mock initial fetch (empty)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        const { result } = renderHook(() => useFlashcardFactory(), { wrapper });

        await waitFor(() => expect(result.current.itemsLoading).toBe(false));

        const newChat: Chat = { id: "c2", name: "New Chat", workspaceId: "ws-1", createdAt: "", updatedAt: "" };
        (global.fetch as any).mockResolvedValueOnce({ // create chat response
            ok: true,
            json: async () => newChat,
        });

        // When currentChatId is set, it triggers fetchMessages
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [], // empty history
        });

        await act(async () => {
            await result.current.createNewChat();
        });

        await waitFor(() => {
            expect(result.current.chats).toContainEqual(newChat);
            expect(result.current.currentChatId).toBe("c2");
        });
    });

    it("should send message and receive response", async () => {
        const mockChats = [{ id: "c1", name: "Chat 1", workspaceId: "ws-1" }];

        // Mocks for the sequence of calls:
        // 1. Initial fetch chats (useEffect) - ok
        // 2. Select chat -> fetch history (ok)
        // 3. Send message -> post message (ok)

        // 1. Fetch chats
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockChats,
        });

        const { result } = renderHook(() => useFlashcardFactory(), { wrapper });

        // Wait to load
        await waitFor(() => expect(result.current.chats).toHaveLength(1));

        // 2. Fetch history when selecting chat
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [], // empty history
        });

        // 3. IMPORTANT: When selectChat updates currentChatId, the EFFECT runs and triggers fetchMessages.
        // The mock we just added (2) will be consumed by this effect.

        await act(async () => {
            result.current.selectChat("c1");
        });

        await waitFor(() => expect(result.current.currentChatId).toBe("c1"));

        // 4. Send message
        // This is a direct call, so it consumes the next mock.
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: "m2", role: "ai", content: "AI Response", createdAt: "now" }),
        });

        // 5. Fetch chats (called because messages.length was 0 before send) (NEW)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockChats,
        });

        await act(async () => {
            result.current.setInput("Hello AI");
        });

        await waitFor(() => expect(result.current.input).toBe("Hello AI"));

        await act(async () => {
            await result.current.sendMessage();
        });

        await waitFor(() => {
            expect(result.current.messages).toHaveLength(2);
        }, { timeout: 2000 });

        expect(result.current.messages).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Hello AI" }),
            expect.objectContaining({ role: "ai", content: "AI Response" })
        ]));
    });

    it("should show notification when receiving message while not on factory page", async () => {
        // Start at default "/" (which is NOT "/factory") mechanisms
        // Mock 1. Initial fetch chats
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: "c1", name: "Chat 1", workspaceId: "ws-1" }],
        });

        const { result } = renderHook(() => useFlashcardFactory(), { wrapper });
        await waitFor(() => expect(result.current.chats).toHaveLength(1));

        // Mock 2. Select Chat -> Fetch History
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [] });
        await act(async () => result.current.selectChat("c1"));

        // Mock 3. Send Message
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: "m2", role: "ai", content: "AI Resp", createdAt: "now" }),
        });

        // Mock 4. Fetch Chats (refresh)
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [{ id: "c1", name: "Chat 1", workspaceId: "ws-1" }] });

        await act(async () => {
            result.current.setInput("Test");
        });

        await act(async () => {
            await result.current.sendMessage();
        });

        await waitFor(() => {
            expect(result.current.notificationChatIds.has("c1")).toBe(true);
        });
    });
});

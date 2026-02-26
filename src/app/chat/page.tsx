"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Send,
    Paperclip,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    MessageSquare,
    Copy,
    RotateCw,
    Loader2,
    Trash2,
    Bot,
    User,
    Sparkles,
    Home,
    FileText,
    X,
    ImageIcon,
    ArrowLeft,
    Globe,
} from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

type Attachment = { id: string; name: string; type: "image" | "pdf" | "file"; dataUrl?: string; size: string };
type Message = { id: string; role: "user" | "ai"; content: string; timestamp: string; attachments?: Attachment[] };
type ChatSession = { id: string; title: string; messages: Message[]; createdAt: string };

const DEFAULT_MODEL = "openai/gpt-3.5-turbo";

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const INITIAL_MESSAGE: Message = {
    id: "init-1",
    role: "ai",
    content: "Hello! I'm your VaaniX AI assistant. How can I help you today?",
    timestamp: new Date().toISOString(),
};

const SYSTEM_PROMPT = `You are a futuristic, professional AI assistant for the VaaniX platform.
CRITICAL RULES:
1. PLAIN TEXT ONLY: Your output must be 100% plain text. 
2. NO FORMATTING: Do not use HTML tags (like <b>), Markdown (like **), or any other formatting characters.
3. NO STARS: Do not use asterisk (*) characters at all.
4. NO LINKS: Do not include URLs, links, or file paths.
5. NO CITATIONS: Do not use [1], [2], or any form of reference/citation.
6. NO SOURCE ATTRIBUTION: Do not use phrases like "Source:", "According to...", or "Based on...". 
7. DIRECT ANSWER: Provide ONLY the requested answer. No introductions, no fluff, no extra information.`;

const cleanAIResponse = (text: string) => {
    return text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [text](url) -> text
        .replace(/https?:\/\/[^\s/$.?#].[^\s]*/g, '') // strip remaining URLs
        .replace(/\[\d+\]/g, '') // [1], [2]
        .replace(/\(\d+\)/g, '') // (1), (2)
        .replace(/[*#_~`>]/g, '') // strip markdown formatting chars: *, #, _, ~, `, >
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .trim();
};

export default function ChatPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>("");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Get active session
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const messages = activeSession?.messages ?? [];

    const createNewSession = useCallback(() => {
        const id = uuidv4();
        const newSession: ChatSession = {
            id,
            title: "New Chat",
            messages: [{ ...INITIAL_MESSAGE, id: uuidv4(), timestamp: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(id);
        setInput("");
    }, []);

    const fetchAIResponse = async (chatMessages: Message[], sessionId: string) => {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (!apiKey) {
            const errMsg: Message = {
                id: uuidv4(),
                role: "ai",
                content: "⚠️ Please configure `NEXT_PUBLIC_OPENROUTER_API_KEY` in your `.env.local` file to enable AI responses.",
                timestamp: new Date().toISOString(),
            };
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, messages: [...s.messages, errMsg] } : s
                )
            );
            return;
        }

        setIsLoading(true);
        try {
            const apiMessages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...chatMessages
                    .filter((m) => m.role !== "ai" || m.id !== "init-1")
                    .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))
            ];

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey} `, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: webSearchEnabled ? `${model}: online` : model,
                    messages: apiMessages
                }),
            });

            const data = await response.json();
            let content =
                data.choices?.[0]?.message?.content ?? `Error: ${data.error?.message ?? "Unknown error"} `;

            // Precision clean the response
            content = cleanAIResponse(content);

            const aiMsg: Message = { id: uuidv4(), role: "ai", content, timestamp: new Date().toISOString() };

            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== sessionId) return s;
                    const newMessages = [...s.messages, aiMsg];
                    // Update session title from first user message
                    const firstUser = newMessages.find((m) => m.role === "user");
                    const title = firstUser ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "") : s.title;
                    return { ...s, messages: newMessages, title };
                })
            );
        } catch {
            const errMsg: Message = {
                id: uuidv4(),
                role: "ai",
                content: "⚠️ Failed to connect. Please check your network and API key.",
                timestamp: new Date().toISOString(),
            };
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, errMsg] } : s))
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("vaanix_chat_sessions");
        const savedModel = localStorage.getItem("openrouter_model");
        if (savedModel) setModel(savedModel);

        if (saved) {
            const parsed: ChatSession[] = JSON.parse(saved);
            if (parsed.length > 0) {
                setSessions(parsed);
                setActiveSessionId(parsed[0].id);
            }
        }

        const savedWebSearch = localStorage.getItem("vaanix_web_search");
        if (savedWebSearch === "true") setWebSearchEnabled(true);

        if (!saved || JSON.parse(saved).length === 0) {
            // Create a fresh session
            createNewSession();
        }
    }, [createNewSession]);

    // Save to localStorage whenever sessions change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem("vaanix_chat_sessions", JSON.stringify(sessions));
        }
    }, [sessions]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages, isLoading]);


    const deleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions((prev) => {
            const updated = prev.filter((s) => s.id !== sessionId);
            if (sessionId === activeSessionId) {
                if (updated.length > 0) setActiveSessionId(updated[0].id);
                else createNewSession();
            }
            return updated;
        });
    };


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const processed: Attachment[] = await Promise.all(
            files.map(async (file) => {
                const sizeKb = (file.size / 1024).toFixed(1);
                const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                const isImage = file.type.startsWith("image/");
                const isPdf = file.type === "application/pdf";

                if (isImage) {
                    const dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    return { id: uuidv4(), name: file.name, type: "image" as const, dataUrl, size };
                }
                return { id: uuidv4(), name: file.name, type: isPdf ? "pdf" as const : "file" as const, size };
            })
        );

        setPendingAttachments((prev) => [...prev, ...processed]);
        // Reset so same file can be picked again
        if (fileRef.current) fileRef.current.value = "";
    };

    const removeAttachment = (id: string) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id));

    const handleSend = () => {
        if ((!input.trim() && pendingAttachments.length === 0) || isLoading || !activeSessionId) return;

        const userMsg: Message = {
            id: uuidv4(),
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString(),
            attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
        };

        let updatedMessages: Message[] = [];

        setSessions((prev) =>
            prev.map((s) => {
                if (s.id !== activeSessionId) return s;
                updatedMessages = [...s.messages, userMsg];
                return { ...s, messages: updatedMessages };
            })
        );

        setInput("");
        setPendingAttachments([]);
        if (inputRef.current) inputRef.current.style.height = "auto";
        setTimeout(() => fetchAIResponse([...messages, userMsg], activeSessionId), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRegenerate = (msgId: string) => {
        if (!activeSession) return;
        const idx = activeSession.messages.findIndex((m) => m.id === msgId);
        if (idx < 1) return;
        const prev = activeSession.messages.slice(0, idx);
        setSessions((s) => s.map((sess) => sess.id === activeSessionId ? { ...sess, messages: prev } : sess));
        fetchAIResponse(prev, activeSessionId);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    };

    // Group sessions by date
    const groupedSessions = sessions.reduce<Record<string, ChatSession[]>>((acc, s) => {
        const label = formatDate(s.createdAt);
        if (!acc[label]) acc[label] = [];
        acc[label].push(s);
        return acc;
    }, {});

    return (
        <div className="flex h-screen bg-[#070B14] overflow-hidden">
            {/* ───────── SIDEBAR ───────── */}
            {/* ───────── SIDEBAR ───────── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        {/* Backdrop overlay for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
                        />
                        <motion.aside
                            key="sidebar"
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed lg:relative inset-y-0 left-0 w-[280px] lg:w-[280px] z-[50] flex flex-col h-full overflow-hidden border-r border-white/[0.06] bg-[#0D1117]"
                        >
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
                                <Link href="/" className="flex items-center gap-2 group">
                                    <div className="relative w-7 h-7 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg rotate-45 group-hover:scale-110 transition-transform" />
                                        <span className="relative text-white font-black text-xs z-10">V</span>
                                    </div>
                                    <span className="text-base font-black">
                                        <span className="text-white">Vaani</span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">X</span>
                                    </span>
                                </Link>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none"
                                    title="Close sidebar"
                                >
                                    <PanelLeftClose size={18} />
                                </button>
                            </div>

                            {/* Back to Home */}
                            <div className="px-3 pt-3">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/10 transition-all text-sm group"
                                >
                                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center group-hover:from-blue-500/50 group-hover:to-purple-600/50 transition-all">
                                        <ArrowLeft size={12} className="text-blue-400" />
                                    </div>
                                    Back to Home
                                </Link>
                            </div>

                            {/* New Chat Button */}
                            <div className="px-3 pt-2 pb-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { createNewSession(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-white transition-all text-sm font-semibold outline-none"
                                >
                                    <Plus size={16} />
                                    New Chat
                                </motion.button>
                            </div>

                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                                {Object.entries(groupedSessions).map(([label, group]) => (
                                    <div key={label} className="mb-2">
                                        <div className="px-3 py-1.5 text-[11px] text-gray-600 uppercase tracking-widest font-semibold">{label}</div>
                                        {group.map((session) => (
                                            <motion.div
                                                key={session.id}
                                                whileHover={{ x: 2 }}
                                                onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                                className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all mb-2 cursor-pointer outline-none ${activeSessionId === session.id
                                                    ? "bg-blue-600/20 border border-blue-500/30 text-white"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                    }`}
                                            >
                                                <MessageSquare size={14} className="shrink-0 opacity-60" />
                                                <span className="text-sm truncate flex-1">{session.title}</span>
                                                <button
                                                    onClick={(e) => deleteSession(session.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-0.5 rounded transition-all outline-none"
                                                    title="Delete chat"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ───────── MAIN CHAT AREA ───────── */}
            <div className="flex-1 flex flex-col h-full min-w-0">

                {/* Top Bar */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md flex-shrink-0 z-30">
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none"
                            title="Open sidebar"
                        >
                            <PanelLeftOpen size={18} />
                        </button>
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-white font-semibold text-xs sm:text-sm leading-tight truncate">
                                {activeSession?.title ?? "New Chat"}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">VaaniX AI · {model.split("/").pop()}</div>
                        </div>
                    </div>
                    <select
                        value={model}
                        onChange={(e) => { setModel(e.target.value); localStorage.setItem("openrouter_model", e.target.value); }}
                        className="bg-white/[0.05] border border-white/10 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer outline-none"
                    >
                        <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="openai/gpt-4o">GPT-4o</option>
                        <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                        <option value="google/gemini-pro">Gemini Pro</option>
                        <option value="meta-llama/llama-3-8b-instruct">Llama 3 8B</option>
                    </select>
                </div>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10"
                >
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "ai" && (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                        <Bot size={15} className="text-white" />
                                    </div>
                                )}

                                <div className={`group flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    {/* Attachment previews */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                                            {msg.attachments.map((att) => (
                                                att.type === "image" && att.dataUrl ? (
                                                    <div key={att.id} className="relative rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={att.dataUrl}
                                                            alt={att.name}
                                                            className="max-w-[180px] sm:max-w-[240px] max-h-[200px] object-cover block"
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] text-gray-300 truncate">{att.name}</div>
                                                    </div>
                                                ) : (
                                                    <div key={att.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1E2A3D] border border-white/10 text-sm max-w-[180px] sm:max-w-[240px]">
                                                        {att.type === "pdf" ? <FileText size={18} className="text-red-400 shrink-0" /> : <ImageIcon size={18} className="text-blue-400 shrink-0" />}
                                                        <div className="overflow-hidden">
                                                            <div className="text-white text-[11px] sm:text-xs font-medium truncate">{att.name}</div>
                                                            <div className="text-gray-500 text-[9px] sm:text-[10px]">{att.size}</div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                    {msg.content && (
                                        <div
                                            className={`px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                                ? "bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-tr-sm shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                : "bg-[#141B2D] border border-white/[0.07] text-gray-200 rounded-tl-sm"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className={`flex items-center gap-2 mt-1.5 opacity-80 transition-opacity ${msg.role === "user" ? "flex-row-reverse text-right" : "flex-row text-left"} `}>
                                        <span className="text-[9px] sm:text-[10px] text-gray-600 font-medium">{formatTime(msg.timestamp)}</span>
                                        {msg.role === "ai" && (
                                            <>
                                                <div className="w-[1px] h-2.5 bg-white/10 mx-0.5" />
                                                <button
                                                    onClick={() => handleCopy(msg.id, msg.content)}
                                                    className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 hover:text-blue-400 transition-colors px-1 py-0.5 rounded-md hover:bg-white/5 outline-none"
                                                    title="Copy"
                                                >
                                                    <Copy size={10} />
                                                    {copiedId === msg.id ? "Copied!" : "Copy"}
                                                </button>
                                                <button
                                                    onClick={() => handleRegenerate(msg.id)}
                                                    className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 hover:text-purple-400 transition-colors px-1 py-0.5 rounded-md hover:bg-white/5 outline-none"
                                                    title="Regenerate"
                                                >
                                                    <RotateCw size={10} className={isLoading ? "animate-spin" : ""} />
                                                    Retry
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-1 border border-white/10">
                                        <User size={15} className="text-gray-300" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 justify-start"
                        >
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Bot size={15} className="text-white" />
                            </div>
                            <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-[#141B2D] border border-white/[0.07] flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-blue-400" />
                                <span className="text-xs text-gray-500">VaaniX is thinking...</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md z-20">
                    <div className="max-w-4xl mx-auto">

                        {/* Pending Attachment Previews */}
                        {pendingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {pendingAttachments.map((att) => (
                                    <div key={att.id} className="relative group/att flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#1E2A3D] border border-white/10 text-xs">
                                        {att.type === "image" && att.dataUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={att.dataUrl} alt={att.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                                        ) : att.type === "pdf" ? (
                                            <FileText size={16} className="text-red-400" />
                                        ) : (
                                            <ImageIcon size={16} className="text-blue-400" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-white text-[11px] font-medium max-w-[80px] sm:max-w-[120px] truncate">{att.name}</div>
                                            <div className="text-gray-500 text-[9px]">{att.size}</div>
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(att.id)}
                                            className="ml-1 text-gray-600 hover:text-red-400 transition-colors outline-none"
                                            title="Remove"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative flex items-center gap-2 sm:gap-3 bg-[#141B2D] border border-white/[0.08] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-blue-500/40 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all">
                            {/* File upload */}
                            <input
                                ref={fileRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileChange}
                            />
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="text-gray-500 hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-white/5 flex-shrink-0 mb-0.5"
                                title="Attach image or PDF"
                            >
                                <Paperclip size={18} />
                            </button>

                            {/* Web Search Toggle */}
                            <button
                                onClick={() => {
                                    const newValue = !webSearchEnabled;
                                    setWebSearchEnabled(newValue);
                                    localStorage.setItem("vaanix_web_search", String(newValue));
                                }}
                                className={`transition - colors p - 1 rounded - lg flex - shrink - 0 mb - 0.5 ${webSearchEnabled ? "text-blue-400 bg-blue-500/10" : "text-gray-500 hover:text-blue-400 hover:bg-white/5"
                                    } `}
                                title={webSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
                            >
                                <Globe size={18} />
                            </button>

                            {/* Textarea */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleTextareaChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask VaaniX anything..."
                                rows={1}
                                disabled={isLoading}
                                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-40 scrollbar-thin scrollbar-thumb-white/10 disabled:opacity-50"
                                style={{ height: "auto" }}
                            />

                            {/* Send button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSend}
                                disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all mb-0.5"
                                title="Send"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

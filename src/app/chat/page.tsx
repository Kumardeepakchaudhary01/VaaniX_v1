"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Send, Paperclip, PanelLeftClose, PanelLeftOpen,
    Plus, MessageSquare, Copy, RotateCw, Loader2, Trash2,
    Bot, User, X, FileText, ImageIcon, Globe, Check,
    Sparkles, ChevronDown, Zap,
} from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import FloatingNav from "@/components/FloatingNav";
import { getSystemPrompt } from "@/lib/systemPrompt";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Attachment = { id: string; name: string; type: "image" | "pdf" | "file"; dataUrl?: string; size: string };
type Message = { id: string; role: "user" | "ai"; content: string; timestamp: string; attachments?: Attachment[] };
type ChatSession = { id: string; title: string; messages: Message[]; createdAt: string };

const DEFAULT_MODEL = "openrouter/free";
const MODELS = [
    { value: "openrouter/free", label: "Auto Free Model" },
    { value: "openai/gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "openai/gpt-4o", label: "GPT-4o" },
    { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
    { value: "google/gemini-pro", label: "Gemini Pro" },
    { value: "meta-llama/llama-3-8b-instruct", label: "Llama 3 8B" },
];

const STARTER_PROMPTS = [
    { icon: "✍️", title: "Draft an email", sub: "Write a professional message" },
    { icon: "🧠", title: "Explain a topic", sub: "Make complex ideas simple" },
    { icon: "💡", title: "Brainstorm ideas", sub: "Generate creative solutions" },
    { icon: "📋", title: "Summarize text", sub: "Get the key points fast" },
];

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
    const d = new Date(iso), today = new Date(), yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const INITIAL_MESSAGE: Message = {
    id: "init-1", role: "ai",
    content: "Hello! I'm your VaaniX AI assistant. How can I help you today?",
    timestamp: new Date().toISOString(),
};



function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 h-5">
            {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-2 h-2 rounded-full bg-purple-400/70"
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
        </div>
    );
}

function ModelSelector({ model, setModel }: { model: string; setModel: (m: string) => void }) {
    const [open, setOpen] = useState(false);
    const current = MODELS.find((m) => m.value === model) ?? MODELS[0];
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-all outline-none backdrop-blur-sm">
                <Zap size={12} className="text-yellow-400" />
                <span>{current.label}</span>
                <ChevronDown size={12} className={`transition-transform text-gray-500 ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.13 }}
                        className="absolute bottom-full mb-2 right-0 w-52 bg-[#0C1228]/95 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden z-50">
                        {MODELS.map((m) => (
                            <button key={m.value}
                                onClick={() => { setModel(m.value); localStorage.setItem("openrouter_model", m.value); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${model === m.value
                                    ? "bg-blue-600/20 text-white"
                                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"}`}>
                                <span>{m.label}</span>
                                {model === m.value && <Check size={13} className="text-blue-400" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const messages = activeSession?.messages ?? [];
    const isNewChat = messages.length <= 1 && messages[0]?.id === "init-1";

    const createNewSession = useCallback(() => {
        const id = uuidv4();
        setSessions((prev) => [{ id, title: "New Chat", messages: [{ ...INITIAL_MESSAGE, id: uuidv4(), timestamp: new Date().toISOString() }], createdAt: new Date().toISOString() }, ...prev]);
        setActiveSessionId(id); setInput("");
    }, []);

    const fetchAIResponse = useCallback(async (chatMessages: Message[], sessionId: string) => {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (!apiKey) {
            const e: Message = { id: uuidv4(), role: "ai", content: "⚠️ Configure NEXT_PUBLIC_OPENROUTER_API_KEY in .env.local.", timestamp: new Date().toISOString() };
            setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, messages: [...s.messages, e] } : s));
            return;
        }
        setIsLoading(true);
        try {
            const MAX_CHARS = 1000;
            const systemPrompt = getSystemPrompt(false);
            const apiMessages: any[] = [{ role: "system", content: systemPrompt }];
            
            let currentChars = 0;
            const history = chatMessages.filter((m) => !(m.role === "ai" && m.id === "init-1")).reverse();
            const selectedHistory = [];
            for (const m of history) {
                if (currentChars + m.content.length > MAX_CHARS) {
                    if (selectedHistory.length === 0) {
                        selectedHistory.push({ role: m.role === "ai" ? "assistant" : "user", content: m.content.substring(0, MAX_CHARS - currentChars) + "..." });
                    }
                    break;
                }
                selectedHistory.push({ role: m.role === "ai" ? "assistant" : "user", content: m.content });
                currentChars += m.content.length;
            }
            apiMessages.push(...selectedHistory.reverse());

            const requestBody: any = {
                model: model,
                messages: apiMessages,
                max_tokens: 1000
            };

            if (webSearchEnabled && !model.includes("free")) {
                requestBody.plugins = [
                    {
                        id: "web",
                        max_results: 2
                    }
                ];
            }

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location?.origin || "http://localhost:3000",
                    "X-Title": "VaaniX Chat"
                },
                body: JSON.stringify(requestBody),
            });
            const data = await res.json();
            
            let content = "";
            
            if (!res.ok) {
                if (data.error?.message?.includes("credits") || data.error?.message?.includes("Payment") || data.error?.code === 402) {
                    content = `⚠️ Insufficient OpenRouter credits. (Model: ${model}, Web Search: ${webSearchEnabled ? "ON" : "OFF"}). Please ensure you select 'Auto Free Model' and turn OFF Web Search if you don't have paid credits.`;
                } else {
                    const errDetail = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
                    content = `⚠️ API Error (Status ${res.status}): ${errDetail || "Unknown Error"}`;
                }
            } else {
                if (data.error?.message?.includes("Prompt tokens limit exceeded")) {
                    content = "⚠️ Your message or chat history is too long. Please send a shorter message or start a New Chat.";
                } else if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
                    content = "⚠️ The AI returned an empty response. Please try again or switch to a different model.";
                } else {
                    content = data.choices[0].message.content;
                }
            }

            const aiMsg: Message = { id: uuidv4(), role: "ai", content, timestamp: new Date().toISOString() };
            setSessions((prev) => prev.map((s) => {
                if (s.id !== sessionId) return s;
                const msgs = [...s.messages, aiMsg];
                const fu = msgs.find((m) => m.role === "user");
                return { ...s, messages: msgs, title: fu ? fu.content.slice(0, 45) + (fu.content.length > 45 ? "…" : "") : s.title };
            }));
        } catch (err: any) {
            console.warn("API Error:", err.message || err);
            const e: Message = { id: uuidv4(), role: "ai", content: "⚠️ Connection failed. Check your network and API key.", timestamp: new Date().toISOString() };
            setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, messages: [...s.messages, e] } : s));
        } finally { setIsLoading(false); }
    }, [model, webSearchEnabled]);

    useEffect(() => {
        const saved = localStorage.getItem("vaanix_chat_sessions");
        const sm = localStorage.getItem("openrouter_model");
        const sw = localStorage.getItem("vaanix_web_search");
        if (sm) setModel(sm);
        if (sw === "true") setWebSearchEnabled(true);
        if (saved) { const p: ChatSession[] = JSON.parse(saved); if (p.length > 0) { setSessions(p); setActiveSessionId(p[0].id); return; } }
        createNewSession();
    }, [createNewSession]);

    useEffect(() => { if (sessions.length > 0) localStorage.setItem("vaanix_chat_sessions", JSON.stringify(sessions)); }, [sessions]);
    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, isLoading]);

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions((prev) => {
            const u = prev.filter((s) => s.id !== id);
            if (id === activeSessionId) { if (u.length > 0) setActiveSessionId(u[0].id); else createNewSession(); }
            return u;
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        const processed: Attachment[] = await Promise.all(files.map(async (file) => {
            const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;
            if (file.type.startsWith("image/")) {
                const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(file); });
                return { id: uuidv4(), name: file.name, type: "image" as const, dataUrl, size };
            }
            return { id: uuidv4(), name: file.name, type: file.type === "application/pdf" ? "pdf" as const : "file" as const, size };
        }));
        setPendingAttachments((prev) => [...prev, ...processed]);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSend = (text?: string) => {
        const content = (text ?? input).trim();
        if ((!content && pendingAttachments.length === 0) || isLoading || !activeSessionId) return;
        const userMsg: Message = { id: uuidv4(), role: "user", content, timestamp: new Date().toISOString(), attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined };
        setSessions((prev) => prev.map((s) => s.id !== activeSessionId ? s : { ...s, messages: [...s.messages, userMsg] }));
        setInput(""); setPendingAttachments([]);
        if (inputRef.current) inputRef.current.style.height = "auto";
        setTimeout(() => fetchAIResponse([...messages, userMsg], activeSessionId), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
    const handleCopy = (id: string, text: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
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
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
    };

    const groupedSessions = sessions.reduce<Record<string, ChatSession[]>>((acc, s) => {
        const label = formatDate(s.createdAt);
        if (!acc[label]) acc[label] = [];
        acc[label].push(s);
        return acc;
    }, {});

    return (
        <div className="flex h-screen overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #050A1A 0%, #080D20 50%, #060918 100%)" }}>
            <FloatingNav
                rightSlot={
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const newValue = !webSearchEnabled;
                                setWebSearchEnabled(newValue);
                                localStorage.setItem("vaanix_web_search", String(newValue));
                            }}
                            className={`p-1.5 sm:p-2 rounded-xl border transition-all relative group outline-none ${webSearchEnabled
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-white"
                                }`}
                            title={webSearchEnabled ? "Web Search: Enabled" : "Enable Web Search"}
                        >
                            <Globe size={16} className={webSearchEnabled ? "animate-pulse" : ""} />
                            {webSearchEnabled && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-[#0D1117] shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                        </motion.button>
                        <button onClick={() => setSidebarOpen((p) => !p)}
                            className="p-1.5 sm:p-2 rounded-xl border transition-all relative group outline-none bg-white/[0.03] border-white/10 text-gray-500 hover:text-white"
                            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
                            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>
                    </div>
                }
            />

            {/* ─── SIDEBAR ─── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.7)" }} />

                        <motion.aside key="sidebar"
                            initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="fixed lg:relative inset-y-0 left-0 z-50 flex flex-col w-64 h-full border-r border-white/[0.06]"
                            style={{ background: "linear-gradient(180deg, #04091A 0%, #05091A 100%)" }}>

                            {/* Sidebar top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

                            {/* Sidebar header */}
                            <div className="flex items-center justify-between px-4 pt-20 pb-4">
                                <Link href="/" className="flex items-center gap-2.5 group outline-none">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                                        <Sparkles size={12} className="text-white" />
                                    </div>
                                    <span className="font-heading font-black text-base tracking-tight">
                                        Vaani<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">X</span>
                                    </span>
                                </Link>
                                <button onClick={() => { createNewSession(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all outline-none" title="New Chat">
                                    <Plus size={15} />
                                </button>
                            </div>

                            {/* Sessions */}
                            <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                                {Object.entries(groupedSessions).map(([label, group]) => (
                                    <div key={label} className="mb-4">
                                        <div className="px-3 py-1 text-[10px] text-gray-600 uppercase tracking-widest font-bold">{label}</div>
                                        <div className="space-y-0.5 mt-1">
                                            {group.map((session) => (
                                                <div key={session.id}
                                                    onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all overflow-hidden ${activeSessionId === session.id
                                                        ? "text-white"
                                                        : "text-gray-500 hover:text-gray-200"}`}>

                                                    {/* Active indicator */}
                                                    {activeSessionId === session.id && (
                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/15 rounded-xl border border-white/[0.10]" />
                                                    )}
                                                    {activeSessionId !== session.id && (
                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/[0.04] rounded-xl transition-opacity" />
                                                    )}

                                                    <MessageSquare size={13} className="shrink-0 relative z-10 opacity-70" />
                                                    <span className="text-sm truncate flex-1 relative z-10">{session.title}</span>
                                                    <button onClick={(e) => deleteSession(session.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-0.5 rounded transition-all outline-none shrink-0 relative z-10">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sidebar footer */}
                            <div className="p-3 border-t border-white/[0.05]">
                                <button onClick={() => { createNewSession(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-all outline-none"
                                    style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(126,34,206,0.15) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <Plus size={15} className="text-blue-400" />
                                    New Chat
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ─── MAIN CHAT AREA ─── */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">

                {/* Ambient glow orbs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)", filter: "blur(80px)" }} />
                    <div className="absolute top-2/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, #9333EA 0%, transparent 70%)", filter: "blur(80px)" }} />
                    <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] -translate-x-1/2 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)", filter: "blur(60px)" }} />
                </div>

                {/* Messages scroll area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative z-10">

                    {/* Welcome state */}
                    <AnimatePresence>
                        {isNewChat && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center justify-center min-h-full px-6 pt-28 pb-10">

                                {/* Hero icon with glow */}
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 rounded-full blur-2xl scale-150" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6), transparent)" }} />
                                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: "linear-gradient(135deg, #3B82F6, #9333EA)" }}>
                                        <Sparkles size={28} className="text-white" />
                                    </div>
                                </div>

                                <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight mb-3 text-center whitespace-nowrap">
                                    <span className="text-white">How can I </span>
                                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #60A5FA, #C084FC)" }}>help you?</span>
                                </h1>
                                <p className="text-sm text-gray-500 mb-10 text-center max-w-sm">
                                    Ask me anything. Powered by the best AI models.
                                </p>

                                {/* Starter prompt grid */}
                                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                                    {STARTER_PROMPTS.map((p) => (
                                        <motion.button key={p.title}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => { setInput(p.title); setTimeout(() => inputRef.current?.focus(), 0); }}
                                            className="relative flex flex-col gap-2 px-4 py-4 rounded-2xl text-left outline-none cursor-pointer overflow-hidden group"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            {/* Hover fill */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(147,51,234,0.08))" }} />
                                            <span className="text-xl relative z-10">{p.icon}</span>
                                            <span className="text-sm font-semibold text-white relative z-10">{p.title}</span>
                                            <span className="text-xs text-gray-500 relative z-10">{p.sub}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Message thread */}
                    {!isNewChat && (
                        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-8 space-y-6">
                            <AnimatePresence initial={false}>
                                {messages.map((msg) => (
                                    <motion.div key={msg.id}
                                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                                        {/* AI avatar */}
                                        {msg.role === "ai" && (
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg"
                                                style={{ background: "linear-gradient(135deg, #3B82F6, #9333EA)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                                                <Bot size={14} className="text-white" />
                                            </div>
                                        )}

                                        <div className={`group flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>

                                            {/* Attachments */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {msg.attachments.map((att) => (
                                                        att.type === "image" && att.dataUrl ? (
                                                            <div key={att.id} className="rounded-xl overflow-hidden border border-white/10">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={att.dataUrl} alt={att.name} className="max-w-[200px] max-h-[160px] object-cover block" />
                                                            </div>
                                                        ) : (
                                                            <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs backdrop-blur-sm"
                                                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                                                {att.type === "pdf" ? <FileText size={14} className="text-red-400" /> : <ImageIcon size={14} className="text-blue-400" />}
                                                                <div>
                                                                    <div className="text-white text-xs font-medium truncate max-w-[100px]">{att.name}</div>
                                                                    <div className="text-gray-500 text-[10px]">{att.size}</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            )}

                                            {/* Message bubble */}
                                            {msg.content && (
                                                <div className={`px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                    ? "text-white rounded-tr-sm whitespace-pre-wrap"
                                                    : "text-gray-200"}`}
                                                    style={msg.role === "user" ? {
                                                        background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                                                        boxShadow: "0 4px 24px rgba(124,58,237,0.35)",
                                                    } : {}}>
                                                    {msg.role === "user" ? msg.content : (
                                                        <div className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white prose-li:marker:text-gray-500">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Hover actions */}
                                            <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                <span className="text-[10px] text-gray-700">{formatTime(msg.timestamp)}</span>
                                                {msg.role === "ai" && msg.content && (<>
                                                    <button onClick={() => handleCopy(msg.id, msg.content)}
                                                        className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded outline-none">
                                                        {copiedId === msg.id ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                                                    </button>
                                                    <button onClick={() => handleRegenerate(msg.id)}
                                                        className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded outline-none">
                                                        <RotateCw size={11} className={isLoading ? "animate-spin" : ""} /> Retry
                                                    </button>
                                                </>)}
                                            </div>
                                        </div>

                                        {/* User avatar */}
                                        {msg.role === "user" && (
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/[0.08]"
                                                style={{ background: "rgba(255,255,255,0.06)" }}>
                                                <User size={14} className="text-gray-400" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* AI Typing */}
                            {isLoading && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                                        style={{ background: "linear-gradient(135deg, #3B82F6, #9333EA)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                                        <Bot size={14} className="text-white" />
                                    </div>
                                    <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm backdrop-blur-sm"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                        <TypingDots />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── INPUT AREA ─── */}
                <div className="flex-shrink-0 px-4 sm:px-6 pb-5 pt-3 relative z-10">
                    <div className="max-w-3xl mx-auto">

                        {/* Pending attachments */}
                        {pendingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {pendingAttachments.map((att) => (
                                    <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-sm"
                                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                        {att.type === "image" && att.dataUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={att.dataUrl} alt={att.name} className="w-7 h-7 rounded-lg object-cover" />
                                        ) : att.type === "pdf" ? <FileText size={13} className="text-red-400" /> : <ImageIcon size={13} className="text-blue-400" />}
                                        <div className="min-w-0">
                                            <div className="text-gray-300 text-xs font-medium max-w-[100px] truncate">{att.name}</div>
                                            <div className="text-gray-600 text-[10px]">{att.size}</div>
                                        </div>
                                        <button onClick={() => setPendingAttachments((p) => p.filter((a) => a.id !== att.id))} className="text-gray-600 hover:text-red-400 transition-colors outline-none ml-1"><X size={11} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input box */}
                        <div className="rounded-2xl transition-all duration-300 relative"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                            <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                                placeholder="Message VaaniX..."
                                rows={1} disabled={isLoading}
                                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed px-5 pt-4 pb-2 max-h-52 scrollbar-thin scrollbar-thumb-white/10 disabled:opacity-50"
                                style={{ height: "auto" }}
                            />
                            {/* Bottom toolbar */}
                            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-2">
                                <div className="flex items-center gap-1.5">
                                    <input ref={fileRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileChange} />
                                    <button onClick={() => fileRef.current?.click()}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-all outline-none" title="Attach">
                                        <Paperclip size={15} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ModelSelector model={model} setModel={setModel} />
                                    <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                                        onClick={() => handleSend()}
                                        disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed transition-all flex-shrink-0 outline-none"
                                        style={{ background: "linear-gradient(135deg, #3B82F6, #9333EA)", boxShadow: "0 0 20px rgba(139,92,246,0.45)" }}
                                        title="Send">
                                        {isLoading ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white ml-0.5" />}
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-[10px] text-gray-700 mt-2.5">
                            VaaniX may produce inaccurate information. Verify important facts.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

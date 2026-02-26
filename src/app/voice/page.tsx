"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Mic, MicOff, Plus, Trash2, MessageSquare, PanelLeftClose,
    PanelLeftOpen, PanelRightClose, PanelRightOpen, ArrowLeft,
    Bot, User, RotateCw, Volume2, VolumeX, Sparkles, Globe, Copy,
} from "lucide-react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import VoiceSphere from "@/components/VoiceSphere";
import { v4 as uuidv4 } from "uuid";

// ── Types ──────────────────────────────────────────
declare global {
    interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}
type TranscriptEntry = { id: string; role: "user" | "ai"; text: string; timestamp: string };
type VoiceSession = { id: string; title: string; entries: TranscriptEntry[]; createdAt: string };

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const GREET: TranscriptEntry = {
    id: "init",
    role: "ai",
    text: "Hello! I'm your VaaniX voice assistant. Press the mic and speak — I'm listening.",
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

// ── Animated Frequency Bars ──────────────────────────
function FrequencyBars({ active }: { active: boolean }) {
    const bars = Array.from({ length: 28 });
    return (
        <div className="flex items-end justify-center gap-[3px] h-16 px-4">
            {bars.map((_, i) => (
                <motion.div
                    key={i}
                    className={`w-1 rounded-full ${active ? "bg-gradient-to-t from-blue-600 to-purple-500" : "bg-white/10"}`}
                    animate={active ? {
                        height: [8, Math.random() * 48 + 8, 8],
                    } : { height: 8 }}
                    transition={{
                        duration: 0.4 + (i % 5) * 0.08,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.03,
                    }}
                />
            ))}
        </div>
    );
}

// ── Pulsing Orb ─────────────────────────────────────
function PulsingOrb({ isRecording, isSpeaking }: { isRecording: boolean; isSpeaking: boolean }) {
    const color = isRecording ? "#ef4444" : isSpeaking ? "#a855f7" : "#3b82f6";
    const label = isRecording ? "Listening..." : isSpeaking ? "Speaking..." : "Tap to speak";

    return (
        <div className="relative flex items-center justify-center w-60 h-60">
            {/* Outermost ring */}
            <motion.div
                className="absolute w-60 h-60 rounded-full border"
                style={{ borderColor: color + "20" }}
                animate={(isRecording || isSpeaking) ? { scale: [1, 1.14, 1], opacity: [0.3, 0.6, 0.3] } : { scale: 1, opacity: 0.2 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Middle ring */}
            <motion.div
                className="absolute w-44 h-44 rounded-full border"
                style={{ borderColor: color + "40" }}
                animate={(isRecording || isSpeaking) ? { scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] } : { scale: 1, opacity: 0.3 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
            {/* Core orb */}
            <motion.div
                className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl cursor-pointer"
                style={{
                    background: `radial - gradient(circle at 35 % 35 %, ${color}cc, ${color}66)`,
                    boxShadow: `0 0 40px ${color} 60, 0 0 80px ${color} 20`,
                }}
                animate={(isRecording || isSpeaking) ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
                {isRecording ? (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                    >
                        <MicOff size={38} className="text-white drop-shadow" />
                    </motion.div>
                ) : isSpeaking ? (
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                        <Volume2 size={38} className="text-white drop-shadow" />
                    </motion.div>
                ) : (
                    <Mic size={38} className="text-white drop-shadow" />
                )}
            </motion.div>

            {/* Label below orb */}
            <motion.p
                className="absolute -bottom-10 text-sm font-medium tracking-wide"
                style={{ color }}
                animate={isRecording ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
                transition={{ duration: 0.8, repeat: isRecording ? Infinity : 0 }}
            >
                {label}
            </motion.p>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────
export default function VoicePage() {
    const [sessions, setSessions] = useState<VoiceSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [model] = useState("openai/gpt-3.5-turbo");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [transcriptOpen, setTranscriptOpen] = useState(true);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const transcriptScrollRef = useRef<HTMLDivElement>(null);

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const entries = activeSession?.entries ?? [];

    const createNewSession = useCallback(() => {
        const id = uuidv4();
        setSessions((prev) => [{
            id, title: "New Voice Chat",
            entries: [{ ...GREET, id: uuidv4(), timestamp: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
        }, ...prev]);
        setActiveSessionId(id);
    }, []);

    const speakText = (text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        // Remove <b> tags before speaking
        const plainText = text.replace(/<[^>]*>?/gm, '');
        const utt = new SpeechSynthesisUtterance(plainText);
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        utt.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
    };

    const addEntry = (role: "user" | "ai", text: string) => {
        const entry: TranscriptEntry = { id: uuidv4(), role, text, timestamp: new Date().toISOString() };
        setSessions((prev) => prev.map((s) => {
            if (s.id !== activeSessionId) return s;
            const entries = [...s.entries, entry];
            const firstUser = entries.find((e) => e.role === "user");
            const title = firstUser ? firstUser.text.slice(0, 40) + (firstUser.text.length > 40 ? "…" : "") : s.title;
            return { ...s, entries, title };
        }));
    };

    const fetchAIResponse = async (userText: string) => {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (!apiKey) {
            const msg = "Please configure NEXT_PUBLIC_OPENROUTER_API_KEY in .env.local.";
            addEntry("ai", msg); speakText(msg); return;
        }
        try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey} `, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: webSearchEnabled ? `${model}: online` : model,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: userText }
                    ]
                }),
            });
            const data = await res.json();
            let content = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";

            // Precision clean the response
            content = cleanAIResponse(content);

            addEntry("ai", content);
            speakText(content);
        } catch {
            const msg = "Connection error. Please try again.";
            addEntry("ai", msg); speakText(msg);
        }
    };

    const deleteSession = (sid: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions((prev) => {
            const updated = prev.filter((s) => s.id !== sid);
            if (sid === activeSessionId) {
                if (updated.length > 0) setActiveSessionId(updated[0].id);
                else createNewSession();
            }
            return updated;
        });
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRegenerate = async (id: string) => {
        if (!activeSession) return;
        const entryIndex = activeSession.entries.findIndex(e => e.id === id);
        if (entryIndex === -1) return;

        const lastUserEntry = activeSession.entries.slice(0, entryIndex).reverse().find(e => e.role === "user");
        if (!lastUserEntry) return;

        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return { ...s, entries: s.entries.filter(e => e.id !== id) };
            }
            return s;
        }));
        await fetchAIResponse(lastUserEntry.text);
    };

    // ── Scroll transcript on new entry ──
    useEffect(() => {
        if (transcriptScrollRef.current) {
            transcriptScrollRef.current.scrollTo({ top: transcriptScrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [entries, interimText]);

    // ── Load sessions from localStorage ──
    useEffect(() => {
        const saved = localStorage.getItem("vaanix_voice_sessions");
        if (saved) {
            const parsed: VoiceSession[] = JSON.parse(saved);
            if (parsed.length > 0) { setSessions(parsed); setActiveSessionId(parsed[0].id); return; }
        }
        const savedWebSearch = localStorage.getItem("vaanix_voice_web_search");
        if (savedWebSearch === "true") setWebSearchEnabled(true);

        createNewSession();
    }, []);

    useEffect(() => {
        if (sessions.length > 0) localStorage.setItem("vaanix_voice_sessions", JSON.stringify(sessions));
    }, [sessions]);

    // ── Init SpeechRecognition ──
    useEffect(() => {
        if (typeof window === "undefined" || recognitionRef.current) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;
    }, []);

    // ── Update callbacks on every render to avoid stale closures ──
    useEffect(() => {
        const rec = recognitionRef.current;
        if (!rec) return;

        rec.onresult = (event: any) => {
            let interim = ""; let final = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            setInterimText(interim);
            if (final) {
                addEntry("user", final);
                setInterimText("");
                try { rec.stop(); } catch { }
                isRecordingRef.current = false;
                setIsRecording(false);
                fetchAIResponse(final);
            }
        };

        rec.onerror = () => { isRecordingRef.current = false; setIsRecording(false); };
        rec.onend = () => {
            if (isRecordingRef.current) try { rec.start(); } catch { }
        };
    });


    const toggleRecording = () => {
        const rec = recognitionRef.current;
        if (!rec) return;
        if (!isRecordingRef.current) {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
            isRecordingRef.current = true;
            setIsRecording(true);
            try { rec.start(); } catch { }
        } else {
            isRecordingRef.current = false;
            setIsRecording(false);
            try { rec.stop(); } catch { }
        }
    };

    const groupedSessions = sessions.reduce<Record<string, VoiceSession[]>>((acc, s) => {
        const label = formatDate(s.createdAt);
        if (!acc[label]) acc[label] = [];
        acc[label].push(s);
        return acc;
    }, {});

    return (
        <div className="flex h-screen bg-[#070B14] overflow-hidden">

            {/* ── LEFT SIDEBAR ── */}
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
                            {/* Header */}
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
                                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none">
                                    <PanelLeftOpen size={18} />
                                </button>
                            </div>

                            {/* Back to Home */}
                            <div className="px-3 pt-3">
                                <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/10 transition-all text-sm group">
                                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center group-hover:from-blue-500/50 group-hover:to-purple-600/50 transition-all">
                                        <ArrowLeft size={12} className="text-blue-400" />
                                    </div>
                                    Back to Home
                                </Link>
                            </div>

                            {/* New Chat */}
                            <div className="px-3 pt-2 pb-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => { createNewSession(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-white transition-all text-sm font-semibold outline-none"
                                >
                                    <Plus size={16} /> New Session
                                </motion.button>
                            </div>

                            {/* Session History */}
                            <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                                {Object.entries(groupedSessions).map(([label, group]) => (
                                    <div key={label} className="mb-2">
                                        <div className="px-3 py-1.5 text-[11px] text-gray-600 uppercase tracking-widest font-semibold">{label}</div>
                                        {group.map((session) => (
                                            <motion.div
                                                key={session.id}
                                                whileHover={{ x: 2 }}
                                                onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                                className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all mb-2 cursor-pointer outline-none ${activeSessionId === session.id
                                                    ? "bg-purple-600/20 border border-purple-500/30 text-white"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                    }`}
                                            >
                                                <MessageSquare size={14} className="shrink-0 opacity-60" />
                                                <span className="text-sm truncate flex-1">{session.title}</span>
                                                <button
                                                    onClick={(e) => deleteSession(session.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-0.5 rounded transition-all outline-none"
                                                    title="Delete"
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

            {/* ── CENTER ── */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">

                {/* Top bar */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 border-b border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md flex-shrink-0 z-30">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none">
                                <PanelLeftOpen size={18} />
                            </button>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-white font-semibold text-xs sm:text-sm truncate">Voice Assistant</div>
                                <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">VaaniX AI · Real-time speech</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Web Search Toggle */}
                        <button
                            onClick={() => {
                                const newValue = !webSearchEnabled;
                                setWebSearchEnabled(newValue);
                                localStorage.setItem("vaanix_voice_web_search", String(newValue));
                            }}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border transition-all text-[10px] sm:text-xs font-medium outline-none ${webSearchEnabled
                                ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                                : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"
                                }`}
                            title={webSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
                        >
                            <Globe size={14} className="sm:w-[15px] sm:h-[15px]" />
                            <span className="hidden xs:inline">{webSearchEnabled ? "Search: ON" : "Web Search"}</span>
                            <span className="xs:hidden">{webSearchEnabled ? "ON" : "OFF"}</span>
                        </button>

                        {/* Transcript toggle */}
                        <button
                            onClick={() => setTranscriptOpen((p) => !p)}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border transition-all text-[10px] sm:text-xs font-medium outline-none ${transcriptOpen
                                ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                                : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"
                                }`}
                            title={transcriptOpen ? "Hide transcript" : "Show transcript"}
                        >
                            {transcriptOpen ? <PanelRightClose size={14} className="sm:w-[15px] sm:h-[15px]" /> : <PanelRightOpen size={14} className="sm:w-[15px] sm:h-[15px]" />}
                            <span className="hidden xs:inline">{transcriptOpen ? "Hide" : "Transcript"}</span>
                        </button>
                        {!sidebarOpen && (
                            <Link href="/" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 hover:text-white text-xs transition-all outline-none">
                                <ArrowLeft size={13} /> Home
                            </Link>
                        )}
                    </div>
                </div>

                {/* Main voice area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 px-4 sm:px-8 relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full"
                            style={{ background: isRecording ? "radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)" : isSpeaking ? "radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%)" : "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)" }}
                            animate={{ scale: (isRecording || isSpeaking) ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>

                    {/* 3D Sphere */}
                    <div className="w-48 h-48 sm:w-64 sm:h-64">
                        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 10]} intensity={1} />
                            <VoiceSphere isRecording={isRecording} isSpeaking={isSpeaking} />
                        </Canvas>
                    </div>

                    {/* Frequency bars */}
                    <div className="scale-75 sm:scale-100">
                        <FrequencyBars active={isRecording || isSpeaking} />
                    </div>

                    {/* Pulsing orb + mic button */}
                    <div onClick={toggleRecording} className="cursor-pointer select-none transform scale-[0.85] sm:scale-100">
                        <PulsingOrb isRecording={isRecording} isSpeaking={isSpeaking} />
                    </div>

                    {/* Interim text */}
                    <AnimatePresence>
                        {interimText && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-w-lg text-center text-gray-400 text-sm italic px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
                            >
                                "{interimText}"
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── RIGHT TRANSCRIPT PANEL ── */}
            <AnimatePresence>
                {transcriptOpen && (
                    <>
                        {/* Backdrop overlay for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setTranscriptOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
                        />
                        <motion.aside
                            key="transcript"
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed lg:relative inset-y-0 right-0 w-[300px] sm:w-[320px] z-[50] flex flex-col h-full overflow-hidden border-l border-white/[0.06] bg-[#0D1117]"
                        >
                            {/* Panel header */}
                            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <Volume2 size={16} />
                                    <span className="font-semibold text-sm tracking-wide uppercase">Live Transcript</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, entries: [{ ...GREET, id: uuidv4(), timestamp: new Date().toISOString() }] } : s))}
                                        className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-all outline-none"
                                        title="Clear transcript"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                    <button onClick={() => setTranscriptOpen(false)} className="text-gray-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all outline-none" title="Close">
                                        <PanelRightClose size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Entries */}
                            <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                                <AnimatePresence initial={false}>
                                    {entries.map((entry) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex gap-2.5 ${entry.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {entry.role === "ai" && (
                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Bot size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] sm:max-w-[80%] ${entry.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                                <div
                                                    className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${entry.role === "user"
                                                        ? "bg-gradient-to-br from-blue-600/80 to-purple-700/80 text-white rounded-tr-sm"
                                                        : "bg-[#141B2D] border border-white/[0.07] text-gray-300 rounded-tl-sm"
                                                        }`}
                                                >
                                                    {entry.text}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 opacity-80 group">
                                                    <span className="text-[10px] text-gray-600 font-medium">{formatTime(entry.timestamp)}</span>
                                                    {entry.role === "ai" && (
                                                        <>
                                                            <div className="w-[1px] h-2 bg-white/10 mx-0.5" />
                                                            <button
                                                                onClick={() => handleCopy(entry.id, entry.text)}
                                                                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition-colors outline-none"
                                                                title="Copy transcript"
                                                            >
                                                                <Copy size={10} />
                                                                {copiedId === entry.id ? "Copied" : "Copy"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRegenerate(entry.id)}
                                                                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-purple-400 transition-colors outline-none"
                                                                title="Retry voice response"
                                                            >
                                                                <RotateCw size={10} />
                                                                Retry
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {entry.role === "user" && (
                                                <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                                                    <User size={12} className="text-gray-300" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Interim text in panel */}
                                {interimText && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-end gap-2.5"
                                    >
                                        <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs text-white/50 italic bg-blue-600/20 border border-blue-500/20 rounded-tr-sm">
                                            {interimText}…
                                        </div>
                                        <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                                            <User size={12} className="text-gray-300" />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Status footer */}
                            <div className="px-4 py-3 border-t border-white/[0.06] bg-black/40 backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500" : isSpeaking ? "bg-purple-500" : "bg-gray-600"}`}
                                        animate={(isRecording || isSpeaking) ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                    />
                                    <span className="text-[11px] text-gray-500">
                                        {isRecording ? "Listening..." : isSpeaking ? "Agent speaking..." : "Ready"}
                                    </span>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

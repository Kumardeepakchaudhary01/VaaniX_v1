"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Mic, MicOff, Plus, Trash2, MessageSquare, PanelLeftClose,
    PanelLeftOpen, PanelRightClose, PanelRightOpen, ArrowLeft,
    Bot, User, RotateCw, Volume2, VolumeX, Sparkles,
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
                    background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`,
                    boxShadow: `0 0 40px ${color}60, 0 0 80px ${color}20`,
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

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const transcriptScrollRef = useRef<HTMLDivElement>(null);

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const entries = activeSession?.entries ?? [];

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

    const createNewSession = useCallback(() => {
        const id = uuidv4();
        setSessions((prev) => [{
            id, title: "New Voice Chat",
            entries: [{ ...GREET, id: uuidv4(), timestamp: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
        }, ...prev]);
        setActiveSessionId(id);
    }, []);

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

    const speakText = (text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        utt.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
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
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model, messages: [{ role: "user", content: userText }] }),
            });
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";
            addEntry("ai", content);
            speakText(content);
        } catch {
            const msg = "Connection error. Please try again.";
            addEntry("ai", msg); speakText(msg);
        }
    };

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
            <AnimatePresence initial={false}>
                {sidebarOpen && (
                    <motion.aside
                        key="sidebar"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 260, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="flex-shrink-0 flex flex-col h-full overflow-hidden border-r border-white/[0.06] bg-[#0D1117]"
                        style={{ minWidth: 0 }}
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
                            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                                <PanelLeftClose size={18} />
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
                                onClick={createNewSession}
                                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-white transition-all text-sm font-semibold"
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
                                            onClick={() => setActiveSessionId(session.id)}
                                            className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all mb-0.5 cursor-pointer ${activeSessionId === session.id
                                                ? "bg-purple-600/20 border border-purple-500/30 text-white"
                                                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                                        >
                                            <MessageSquare size={14} className="shrink-0 opacity-60" />
                                            <span className="text-sm truncate flex-1">{session.title}</span>
                                            <button
                                                onClick={(e) => deleteSession(session.id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-0.5 rounded transition-all"
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
                )}
            </AnimatePresence>

            {/* ── CENTER ── */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                                <PanelLeftOpen size={18} />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <div>
                                <div className="text-white font-semibold text-sm">Voice Assistant</div>
                                <div className="text-[11px] text-gray-500">VaaniX AI · Real-time speech</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Transcript toggle */}
                        <button
                            onClick={() => setTranscriptOpen((p) => !p)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${transcriptOpen
                                ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                                : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"}`}
                            title={transcriptOpen ? "Hide transcript" : "Show transcript"}
                        >
                            {transcriptOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                            {transcriptOpen ? "Hide Transcript" : "Transcript"}
                        </button>
                        {!sidebarOpen && (
                            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 hover:text-white text-xs transition-all">
                                <ArrowLeft size={13} /> Home
                            </Link>
                        )}
                    </div>
                </div>

                {/* Main voice area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8 relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
                            style={{ background: isRecording ? "radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)" : isSpeaking ? "radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%)" : "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)" }}
                            animate={{ scale: (isRecording || isSpeaking) ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>

                    {/* 3D Sphere */}
                    <div className="w-64 h-64">
                        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 10]} intensity={1} />
                            <VoiceSphere isRecording={isRecording} isSpeaking={isSpeaking} />
                        </Canvas>
                    </div>

                    {/* Frequency bars */}
                    <FrequencyBars active={isRecording || isSpeaking} />

                    {/* Pulsing orb + mic button */}
                    <div onClick={toggleRecording} className="cursor-pointer select-none">
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
            <AnimatePresence initial={false}>
                {transcriptOpen && (
                    <motion.aside
                        key="transcript"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="flex-shrink-0 flex flex-col h-full overflow-hidden border-l border-white/[0.06] bg-[#0D1117]"
                        style={{ minWidth: 0 }}
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
                                    className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-all"
                                    title="Clear transcript"
                                >
                                    <RotateCw size={14} />
                                </button>
                                <button onClick={() => setTranscriptOpen(false)} className="text-gray-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all" title="Close">
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
                                        <div className={`max-w-[80%] ${entry.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                            <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${entry.role === "user"
                                                ? "bg-gradient-to-br from-blue-600/80 to-purple-700/80 text-white rounded-tr-sm"
                                                : "bg-[#141B2D] border border-white/[0.07] text-gray-300 rounded-tl-sm"}`}>
                                                {entry.text}
                                            </div>
                                            <span className="text-[10px] text-gray-600 px-1">{formatTime(entry.timestamp)}</span>
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
                        <div className="px-4 py-3 border-t border-white/[0.06] bg-black/20">
                            <div className="flex items-center gap-2">
                                <motion.div
                                    className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500" : isSpeaking ? "bg-purple-500" : "bg-gray-600"}`}
                                    animate={(isRecording || isSpeaking) ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                />
                                <span className="text-[11px] text-gray-500">
                                    {isRecording ? "Recording..." : isSpeaking ? "AI is speaking..." : "Ready"}
                                </span>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}

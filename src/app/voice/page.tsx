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
import LanguageSelector from "@/components/LanguageSelector";
import { v4 as uuidv4 } from "uuid";
import FloatingNav from "@/components/FloatingNav";
import { getSystemPrompt } from "@/lib/systemPrompt";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const stripMarkdownForTTS = (text: string) => {
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
    const [language, setLanguage] = useState("hi");
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [interimText, setInterimText] = useState("");
    const interimTextRef = useRef("");
    const [model] = useState("openrouter/free");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const transcriptScrollRef = useRef<HTMLDivElement>(null);
    const accumulatedTranscriptRef = useRef("");
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    const speakText = async (text: string) => {
        const plainText = text.replace(/<[^>]*>?/gm, '');
        const sarvamKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;

        if (!sarvamKey || sarvamKey === "your_sarvam_api_key_here") {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(plainText);
            utt.onstart = () => setIsSpeaking(true);
            utt.onend = () => setIsSpeaking(false);
            utt.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utt);
            return;
        }

        try {
            const langMap: Record<string, string> = {
                hi: "hi-IN",
                gu: "gu-IN",
                en: "en-IN"
            };
            const target_language_code = langMap[language] || "hi-IN";

            const res = await fetch("https://api.sarvam.ai/text-to-speech", {
                method: "POST",
                headers: {
                    "api-subscription-key": sarvamKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: plainText,
                    target_language_code,
                    speaker_id: "anushka",
                    model: "bulbul:v2"
                })
            });

            if (!res.ok) throw new Error("Sarvam TTS request failed");

            const data = await res.json();
            const audioBase64 = data.audios?.[0];

            if (!audioBase64) throw new Error("No audio content in Sarvam response");

            const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);

            await audio.play();
        } catch (err) {
            console.error("Sarvam TTS Error:", err);
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(plainText);
            utt.onstart = () => setIsSpeaking(true);
            utt.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utt);
        }
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
            const langDisplay: Record<string, string> = {
                hi: "Hindi",
                gu: "Gujarati",
                en: "English"
            };
            const langName = langDisplay[language] || "Hindi";

            const requestBody: any = {
                model: model,
                messages: [
                    { role: "system", content: getSystemPrompt(false, langName) },
                    { role: "user", content: userText.length > 1000 ? userText.substring(0, 1000) + "..." : userText }
                ],
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
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
            const data = await res.json();
            
            let content = "";
            if (!res.ok) {
                if (data.error?.message?.includes("credits") || data.error?.message?.includes("Payment") || data.error?.code === 402) {
                    content = `Insufficient OpenRouter credits. (Model: ${model}, Web Search: ${webSearchEnabled ? "ON" : "OFF"}). Please select 'Auto Free Model' and turn OFF Web Search if you don't have paid credits.`;
                } else {
                    const errDetail = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
                    content = `API Error (Status ${res.status}): ${errDetail || "Unknown Error"}`;
                }
            } else {
                if (data.error?.message?.includes("Prompt tokens limit exceeded")) {
                    content = "Your message is too long for the AI to process. Please try a shorter sentence.";
                } else if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
                    content = "The AI returned an empty response. Please try again.";
                } else {
                    content = data.choices[0].message.content;
                }
            }

            // Use raw markdown for UI, stripped for TTS
            const uiContent = content;
            const ttsContent = stripMarkdownForTTS(content);

            addEntry("ai", uiContent);
            speakText(ttsContent);
        } catch (err: any) {
            console.warn("API Error:", err.message || err);
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

    // ── langCode helper ──
    const getLangCode = (lang: string) => {
        const map: Record<string, string> = { hi: "hi-IN", gu: "gu-IN", en: "en-US" };
        return map[lang] || "hi-IN";
    };

    const latestCallbacksRef = useRef<any>({});

    // ── Init SpeechRecognition ──
    useEffect(() => {
        if (typeof window === "undefined") return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = getLangCode(language);

        const handleFinalSubmission = () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            const finalQuestion = (accumulatedTranscriptRef.current + " " + interimTextRef.current).trim();
            if (finalQuestion) {
                latestCallbacksRef.current.addEntry("user", finalQuestion);
                latestCallbacksRef.current.fetchAIResponse(finalQuestion);
            }

            accumulatedTranscriptRef.current = "";
            interimTextRef.current = "";
            latestCallbacksRef.current.setInterimText("");

            isRecordingRef.current = false;
            setIsRecording(false);
            try { rec.stop(); } catch { }
        };

        rec.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    accumulatedTranscriptRef.current += event.results[i][0].transcript + " ";
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            interimTextRef.current = interim; // Use a ref to track current interim for submission
            latestCallbacksRef.current.setInterimText(interim);

            // Reset silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (isRecordingRef.current) {
                    handleFinalSubmission();
                }
            }, 2000); // 2 seconds of silence triggers submission
        };

        rec.onerror = (e: any) => {
            if (e.error === 'no-speech') return;
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            isRecordingRef.current = false;
            setIsRecording(false);
            if (latestCallbacksRef.current?.addEntry) {
                latestCallbacksRef.current.addEntry("ai", `[Microphone Error] The browser reported: ${e.error}. Please check your mic permissions.`);
            }
        };

        rec.onend = () => {
            if (isRecordingRef.current) {
                try { rec.start(); } catch { }
            }
        };

        (rec as any).manualStop = handleFinalSubmission;
        recognitionRef.current = rec;

        return () => {
            try { rec.stop(); } catch {}
            rec.onresult = null;
            rec.onerror = null;
            rec.onend = null;
        };
    }, [language]);


    const toggleRecording = async () => {
        const rec = recognitionRef.current;
        if (!rec) {
            alert("Your browser lacks Web Speech API support. Please use Google Chrome Desktop to use the voice assistant.");
            return;
        }
        if (!isRecordingRef.current) {
            try {
                // Force microphone permission prompt and hardware warmup (crucial for localhost)
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err: any) {
                alert("Microphone permission denied or no audio input found! " + err.message);
                return;
            }

            window.speechSynthesis?.cancel();
            setIsSpeaking(false);

            accumulatedTranscriptRef.current = "";
            interimTextRef.current = "";
            setInterimText("");

            isRecordingRef.current = true;
            setIsRecording(true);
            try { 
                rec.start(); 
            } catch (e) {
                console.warn(e);
            }
        } else {
            // Manual stop: trigger immediate submission
            if ((rec as any).manualStop) {
                (rec as any).manualStop();
            } else {
                isRecordingRef.current = false;
                setIsRecording(false);
                try { rec.stop(); } catch { }
            }
        }
    };

    const groupedSessions = sessions.reduce<Record<string, VoiceSession[]>>((acc, s) => {
        const label = formatDate(s.createdAt);
        if (!acc[label]) acc[label] = [];
        acc[label].push(s);
        return acc;
    }, {});

    latestCallbacksRef.current = {
        addEntry,
        fetchAIResponse,
        setInterimText
    };

    return (
        <div className="flex flex-col h-screen bg-[#070B14] overflow-hidden">
            <FloatingNav
                state={isRecording ? "listening" : isSpeaking ? "speaking" : "idle"}
                rightSlot={
                    <div className="flex items-center gap-2">
                        {/* Stylish Web Search Toggle */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const newValue = !webSearchEnabled;
                                setWebSearchEnabled(newValue);
                                localStorage.setItem("vaanix_voice_web_search", String(newValue));
                            }}
                            className={`p-1.5 sm:p-2 rounded-xl border transition-all relative group outline-none ${webSearchEnabled
                                ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.15)]"
                                : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-white"
                                }`}
                            title={webSearchEnabled ? "Web Search: Enabled" : "Enable Web Search"}
                        >
                            <Globe size={16} className={webSearchEnabled ? "animate-pulse" : ""} />
                            {webSearchEnabled && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-blue rounded-full border border-[#0D1117] shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
                            )}
                        </motion.button>

                        <div className="hidden sm:block">
                            <LanguageSelector
                                currentLanguage={language}
                                onLanguageChange={setLanguage}
                            />
                        </div>

                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen((p) => !p)}
                                className="p-1.5 sm:p-2 rounded-xl border transition-all relative group outline-none bg-white/[0.03] border-white/10 text-purple-400 hover:text-white"
                                title="Open sidebar">
                                <PanelLeftOpen size={16} />
                            </button>
                        )}
                        {!transcriptOpen && (
                            <button onClick={() => setTranscriptOpen((p) => !p)}
                                className="p-1.5 sm:p-2 rounded-xl border transition-all relative group outline-none bg-white/[0.03] border-white/10 text-neon-blue hover:text-white"
                                title="Open transcript">
                                <PanelRightOpen size={16} />
                            </button>
                        )}
                    </div>
                }
            />

            {/* ── MAIN CONTENT AREA ── */}
            <div className="flex-1 flex overflow-hidden relative">

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
                                className="fixed lg:relative inset-y-0 left-0 w-[280px] lg:w-[280px] z-[40] flex flex-col h-full overflow-hidden border-r border-white/[0.06] bg-[#0D1117]"
                            >
                                {/* Premium Home Button */}
                                <div className="px-3 pt-4 pb-2">
                                    <Link href="/" className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 via-blue-700/10 to-purple-600/10 border border-blue-500/30 hover:border-blue-400/50 transition-all shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <ArrowLeft size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white tracking-tight">Return Home</div>
                                                <div className="text-[10px] text-gray-400 font-medium">Back to main dashboard</div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-y border-white/[0.06] bg-white/[0.02]">
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <MessageSquare size={16} />
                                        <span className="font-semibold text-sm tracking-wide uppercase">History</span>
                                    </div>
                                    <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none">
                                        <PanelLeftClose size={18} />
                                    </button>
                                </div>

                                <div className="px-3 pt-2 pb-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        onClick={() => { createNewSession(); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/20 text-blue-300 hover:from-neon-blue/30 hover:to-neon-purple/30 hover:text-white transition-all text-sm font-semibold outline-none"
                                    >
                                        <Plus size={16} /> New Session
                                    </motion.button>
                                </div>

                                {/* Session History */}
                                <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                                    {Object.entries(groupedSessions).map(([label, group]) => (
                                        <div key={label} className="mb-4">
                                            <div className="px-3 py-1.5 text-[11px] text-gray-600 uppercase tracking-widest font-bold mb-1">{label}</div>
                                            {group.map((session) => (
                                                <motion.div
                                                    key={session.id}
                                                    whileHover={{ x: 2 }}
                                                    onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                                    className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all mb-2 cursor-pointer outline-none ${activeSessionId === session.id
                                                        ? "bg-neon-purple/20 border border-neon-purple/30 text-white"
                                                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                        } `}
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


                    {/* Floating Toggles Below Nav Bar (Removed) */}

                    {/* Main voice area */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 px-4 sm:px-8 relative overflow-hidden pt-20 sm:pt-24">
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
                                className="fixed lg:relative inset-y-0 right-0 w-[300px] sm:w-[320px] z-[40] flex flex-col h-full overflow-hidden border-l border-white/[0.06] bg-[#0D1117]"
                            >
                                {/* Panel header */}
                                <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
                                    <button onClick={() => setTranscriptOpen(false)} className="text-gray-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all outline-none" title="Close">
                                        <PanelRightClose size={16} />
                                    </button>
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <Volume2 size={16} />
                                        <span className="font-semibold text-sm tracking-wide uppercase">Live Transcript</span>
                                    </div>
                                    <button
                                        onClick={() => setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, entries: [{ ...GREET, id: uuidv4(), timestamp: new Date().toISOString() }] } : s))}
                                        className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-all outline-none"
                                        title="Clear transcript"
                                    >
                                        <RotateCw size={14} />
                                    </button>
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
                                                className={`flex gap - 2.5 ${entry.role === "user" ? "justify-end" : "justify-start"} `}
                                            >
                                                {entry.role === "ai" && (
                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(181,55,242,0.3)]">
                                                        <Bot size={12} className="text-white" />
                                                    </div>
                                                )}
                                                <div className={`max-w-[85%] sm:max-w-[80%] ${entry.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                                    <div
                                                        className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${entry.role === "user"
                                                            ? "bg-gradient-to-br from-neon-blue/80 to-neon-purple/80 text-white rounded-tr-sm shadow-md whitespace-pre-wrap"
                                                            : "bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-gray-200 rounded-tl-sm shadow-md"
                                                            }`}
                                                    >
                                                        {entry.role === "user" ? entry.text : (
                                                            <div className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-white prose-a:text-neon-blue prose-strong:text-white prose-li:marker:text-gray-500">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {entry.text}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-2 mt-1 opacity-80 ${entry.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
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
                                            className={`w - 2 h - 2 rounded - full ${isRecording ? "bg-red-500" : isSpeaking ? "bg-purple-500" : "bg-gray-600"} `}
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
        </div>
    );
}

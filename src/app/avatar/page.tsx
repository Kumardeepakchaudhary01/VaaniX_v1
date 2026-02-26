"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
    Mic, MicOff, Send, ArrowLeft, PanelRightClose, PanelRightOpen,
    Bot, User, Loader2, FileText, Sparkles, Volume2,
} from "lucide-react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import AvatarModel from "@/components/AvatarModel";
import { v4 as uuidv4 } from "uuid";

declare global {
    interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

type TranscriptEntry = { id: string; role: "user" | "ai"; text: string; timestamp: string };

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AvatarPage() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState("");
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([
        { id: "init", role: "ai", text: "Hello! I'm your VaaniX 3D AI agent. Ask me anything — type or speak!", timestamp: new Date().toISOString() },
    ]);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [model] = useState(() => {
        if (typeof window !== "undefined") return localStorage.getItem("openrouter_model") ?? "openai/gpt-3.5-turbo";
        return "openai/gpt-3.5-turbo";
    });
    const [hoveringTranscript, setHoveringTranscript] = useState(false);

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const transcriptScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptScrollRef.current) {
            transcriptScrollRef.current.scrollTo({ top: transcriptScrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [transcript]);

    // Init speech recognition
    useEffect(() => {
        if (typeof window === "undefined" || recognitionRef.current) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        recognitionRef.current = rec;
    }, []);

    useEffect(() => {
        const rec = recognitionRef.current;
        if (!rec) return;
        rec.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setInput(text);
            isRecordingRef.current = false;
            setIsRecording(false);
            try { rec.stop(); } catch { }
            handleSendText(text);
        };
        rec.onerror = () => { isRecordingRef.current = false; setIsRecording(false); };
        rec.onend = () => {
            if (isRecordingRef.current) try { rec.start(); } catch { }
            else { isRecordingRef.current = false; setIsRecording(false); }
        };
    });

    const addEntry = (role: "user" | "ai", text: string) => {
        setTranscript((prev) => [...prev, { id: uuidv4(), role, text, timestamp: new Date().toISOString() }]);
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
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendText = (text: string) => {
        if (!text.trim()) return;
        addEntry("user", text);
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
        fetchAIResponse(text);
    };

    const handleSend = () => handleSendText(input);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
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

    return (
        <div className="flex h-screen bg-[#070B14] overflow-hidden">

            {/* ── MAIN AREA ── */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">

                {/* Top bar */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 border-b border-white/[0.06] bg-[#0D1117]/90 backdrop-blur-md flex-shrink-0 z-30">
                    {/* Back to Home */}
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/10 transition-all text-[11px] sm:text-sm group outline-none"
                    >
                        <ArrowLeft size={14} className="text-blue-400 sm:w-3 sm:h-3" />
                        <span className="hidden xs:inline">Back to Home</span>
                        <span className="xs:hidden">Back</span>
                    </Link>

                    {/* Title */}
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={12} className="text-white sm:w-[14px] sm:h-[14px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-white font-semibold text-xs sm:text-sm truncate">Agent Mode</div>
                            <div className="text-[9px] sm:text-[11px] text-gray-500 truncate">3D AI Avatar · VaaniX</div>
                        </div>
                    </div>

                    {/* Transcript toggle with tooltip */}
                    <div className="relative">
                        <button
                            onMouseEnter={() => setHoveringTranscript(true)}
                            onMouseLeave={() => setHoveringTranscript(false)}
                            onClick={() => setTranscriptOpen((p) => !p)}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all text-[10px] sm:text-xs font-medium outline-none ${transcriptOpen
                                ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                                : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"}`}
                            title="Toggle transcript"
                        >
                            {transcriptOpen ? <PanelRightClose size={14} className="sm:w-[15px] sm:h-[15px]" /> : <PanelRightOpen size={14} className="sm:w-[15px] sm:h-[15px]" />}
                            <span className="hidden xs:inline">{transcriptOpen ? "Hide Transcript" : "Transcript"}</span>
                        </button>

                        {/* Hover tooltip preview (Desktop only) */}
                        <AnimatePresence>
                            {hoveringTranscript && !transcriptOpen && transcript.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-[#141B2D] border border-white/10 rounded-2xl shadow-2xl p-3 z-50 hidden lg:block"
                                >
                                    <div className="text-[11px] text-purple-400 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <Volume2 size={11} /> Live Transcript Preview
                                    </div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                        {transcript.slice(-4).map((e) => (
                                            <div key={e.id} className={`text-xs px-2.5 py-1.5 rounded-lg ${e.role === "user" ? "bg-blue-600/20 text-blue-200 text-right" : "bg-white/[0.04] text-gray-300"}`}>
                                                {e.text.slice(0, 80)}{e.text.length > 80 ? "…" : ""}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-center text-[10px] text-gray-600">Click to open full panel</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 3D Avatar + Input */}
                <div className="flex-1 flex flex-col min-h-0 bg-[radial-gradient(circle_at_center,_#0a1a3a_0%,_#070B14_100%)]">

                    {/* 3D Canvas — takes most of the vertical space */}
                    <div className="flex-1 relative min-h-0">
                        {/* Ambient bg glow */}
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[150px] sm:h-[300px] rounded-full"
                                style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.08), transparent 70%)" }}
                                animate={isSpeaking ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>

                        <Canvas
                            camera={{ position: [0, 0.5, 3.5], fov: 45 }}
                            className="w-full h-full"
                            onCreated={({ camera }) => {
                                // Responsive camera adjustment
                                const pc = camera as THREE.PerspectiveCamera;
                                if (window.innerWidth < 768) {
                                    pc.position.set(0, 0.4, 4.5);
                                    pc.fov = 40;
                                } else {
                                    pc.position.set(0, 0.5, 3.5);
                                    pc.fov = 45;
                                }
                                pc.updateProjectionMatrix();
                            }}
                        >
                            <Environment preset="city" />
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[2, 5, 2]} intensity={1.5} color="#7c3aed" />
                            <directionalLight position={[-2, 5, 2]} intensity={1.2} color="#2563eb" />
                            <AvatarModel isSpeaking={isSpeaking} />
                            <ContactShadows position={[0, -2.8, 0]} opacity={0.4} scale={8} blur={2} far={4} />
                            <OrbitControls
                                enableZoom={false}
                                enablePan={false}
                                minPolarAngle={Math.PI / 2.5}
                                maxPolarAngle={Math.PI / 2}
                                minAzimuthAngle={-Math.PI / 5}
                                maxAzimuthAngle={Math.PI / 5}
                            />
                        </Canvas>

                        {/* Speaking / listening status badge — floating above input */}
                        <AnimatePresence>
                            {(isSpeaking || isRecording || isLoading) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] sm:text-sm text-white z-10"
                                >
                                    <motion.div
                                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isRecording ? "bg-red-500" : isSpeaking ? "bg-purple-500" : "bg-blue-500"}`}
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 0.7, repeat: Infinity }}
                                    />
                                    {isRecording ? "Listening..." : isLoading ? "Thinking..." : "Speaking..."}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Input box */}
                    <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md z-20">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center gap-2 sm:gap-3 bg-[#141B2D] border border-white/[0.08] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-purple-500/40 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all">

                                {/* Mic button */}
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={toggleRecording}
                                    className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all outline-none ${isRecording
                                        ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                        : "bg-white/[0.06] text-gray-400 hover:bg-purple-600/20 hover:text-purple-300 border border-white/10"}`}
                                    title={isRecording ? "Stop recording" : "Start voice input"}
                                >
                                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                                </motion.button>

                                {/* Textarea */}
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleTextareaChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything..."
                                    rows={1}
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-28 scrollbar-thin scrollbar-thumb-white/10 disabled:opacity-50 outline-none"
                                    style={{ height: "auto" }}
                                />

                                {/* Send button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all outline-none"
                                    title="Send message"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </motion.button>
                            </div>
                        </div>
                    </div>
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
                                    <FileText size={16} />
                                    <span className="font-semibold text-sm tracking-wide uppercase">Live Transcript</span>
                                </div>
                                <button
                                    onClick={() => setTranscriptOpen(false)}
                                    className="text-gray-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all outline-none"
                                    title="Close"
                                >
                                    <PanelRightClose size={16} />
                                </button>
                            </div>

                            {/* Entries */}
                            <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                                <AnimatePresence initial={false}>
                                    {transcript.map((entry) => (
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
                                            <div className={`max-w-[85%] sm:max-w-[80%] flex flex-col gap-1 ${entry.role === "user" ? "items-end" : "items-start"}`}>
                                                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${entry.role === "user"
                                                    ? "bg-gradient-to-br from-blue-600/80 to-purple-700/80 text-white rounded-tr-sm shadow-sm"
                                                    : "bg-[#141B2D] border border-white/[0.07] text-gray-300 rounded-tl-sm shadow-sm"}`}>
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

                                {/* Loading */}
                                {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-start">
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <Bot size={12} className="text-white" />
                                        </div>
                                        <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-[#141B2D] border border-white/[0.07] flex items-center gap-1.5 shadow-sm">
                                            <Loader2 size={12} className="animate-spin text-blue-400" />
                                            <span className="text-xs text-gray-500">Thinking...</span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Status footer */}
                            <div className="px-4 py-3 border-t border-white/[0.06] bg-black/40 backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500" : isSpeaking ? "bg-purple-500" : isLoading ? "bg-blue-500" : "bg-gray-600"}`}
                                        animate={(isRecording || isSpeaking || isLoading) ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                    />
                                    <span className="text-[11px] text-gray-500">
                                        {isRecording ? "Listening..." : isLoading ? "AI thinking..." : isSpeaking ? "Agent speaking..." : "Ready"}
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

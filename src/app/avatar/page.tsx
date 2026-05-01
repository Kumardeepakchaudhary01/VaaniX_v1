"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, Suspense } from "react";
import {
    Mic, MicOff, Send, ArrowLeft, PanelRightClose, PanelRightOpen,
    Bot, User, Loader2, FileText, Sparkles, Volume2, Globe, VolumeX
} from "lucide-react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import AvatarModel from "@/components/AvatarModel";
import LanguageSelector from "@/components/LanguageSelector";
import { v4 as uuidv4 } from "uuid";
import FloatingNav from "@/components/FloatingNav";
import { getSystemPrompt } from "@/lib/systemPrompt";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const stripMarkdownForTTS = (text: string) => {
    return text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/https?:\/\/[^\s/$.?#].[^\s]*/g, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\(\d+\)/g, '')
        .replace(/[*#_~`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

declare global {
    interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

type TranscriptEntry = { id: string; role: "user" | "ai"; text: string; timestamp: string };

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AvatarPage() {
    const [language, setLanguage] = useState("hi");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState("");
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([
        { id: "init", role: "ai", text: "Hello! I'm your VaaniX 3D AI agent. Ask me anything — type or speak!", timestamp: new Date().toISOString() },
    ]);
    const [transcriptOpen, setTranscriptOpen] = useState(true);
    const [model] = useState("openrouter/free");
    const [hoveringTranscript, setHoveringTranscript] = useState(false);
    const [emotion, setEmotion] = useState("neutral");
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    useEffect(() => {
        const savedWebSearch = localStorage.getItem("vaanix_avatar_web_search");
        if (savedWebSearch === "true") setWebSearchEnabled(true);
    }, []);

    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const transcriptScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const accumulatedTranscriptRef = useRef("");
    const interimTextRef = useRef("");
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const getLangCode = (lang: string) => {
        const map: Record<string, string> = { hi: "hi-IN", gu: "gu-IN", en: "en-US" };
        return map[lang] || "hi-IN";
    };

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptScrollRef.current) {
            transcriptScrollRef.current.scrollTo({ top: transcriptScrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [transcript]);

    const latestCallbacksRef = useRef<any>({});

    // Init speech recognition
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
                latestCallbacksRef.current.handleSendText(finalQuestion);
            }
            accumulatedTranscriptRef.current = "";
            interimTextRef.current = "";
            latestCallbacksRef.current.setInput("");
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
            const currentText = accumulatedTranscriptRef.current + interim;
            interimTextRef.current = interim;
            latestCallbacksRef.current.setInput(currentText);

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (isRecordingRef.current) {
                    handleFinalSubmission();
                }
            }, 2000);
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
            if (isRecordingRef.current) try { rec.start(); } catch { }
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

    const addEntry = (role: "user" | "ai", text: string) => {
        setTranscript((prev) => [...prev, { id: uuidv4(), role, text, timestamp: new Date().toISOString() }]);
    };
    
    const stopSpeaking = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    const speakText = async (text: string) => {
        const sarvamKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;

        // Stop any currently playing audio/speech
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        if (!sarvamKey || sarvamKey === "your_sarvam_api_key_here") {
            // Fallback to browser TTS if no key
            if (!window.speechSynthesis) return;
            const utt = new SpeechSynthesisUtterance(text);
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

            const res = await fetch("/api/tts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text,
                    target_language_code,
                    speaker_id: "shubh", // Default Indian male voice (v3)
                    model: "bulbul:v3"
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Sarvam TTS request failed: ${errorText}`);
            }

            const data = await res.json();
            const audioBase64 = data.audios?.[0];

            if (!audioBase64) throw new Error("No audio content in Sarvam response");

            const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
            audioRef.current = audio;

            // 'onplaying' fires when the audio actually begins playing after potential buffering
            audio.onplaying = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                audioRef.current = null;
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                audioRef.current = null;
            };
            audio.onpause = () => setIsSpeaking(false);

            await audio.play();
        } catch (err) {
            console.error("Agent TTS Error:", err);
            // Final fallback to browser synthesis
            if (!window.speechSynthesis) return;
            const utt = new SpeechSynthesisUtterance(text);
            utt.onstart = () => setIsSpeaking(true);
            utt.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utt);
        }
    };


    const fetchAIResponse = async (userText: string) => {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (!apiKey) {
            const msg = "Please configure NEXT_PUBLIC_OPENROUTER_API_KEY in .env.local.";
            addEntry("ai", msg); speakText(msg); return;
        }
        setIsLoading(true);
        try {
            const langDisplay: Record<string, string> = {
                hi: "Hindi",
                gu: "Gujarati",
                en: "English"
            };
            const langName = langDisplay[language] || "Hindi";

            const requestBody: any = {
                model,
                max_tokens: 1000,
                messages: [
                    { role: "system", content: getSystemPrompt(true, langName) },
                    { role: "user", content: userText.length > 1000 ? userText.substring(0, 1000) + "..." : userText }
                ]
            };

            if (webSearchEnabled && !model.includes("free")) {
                requestBody.plugins = [{ id: "web", max_results: 2 }];
            }

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Voxera Agent"
                },
                body: JSON.stringify(requestBody),
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (errData.error?.message?.includes("credits") || errData.error?.message?.includes("Payment") || errData.error?.code === 402) {
                    throw new Error(`Insufficient OpenRouter credits. (Model: ${model}, Web Search: ${webSearchEnabled ? "ON" : "OFF"}). Please select 'Auto Free Model' and turn OFF Web Search if you don't have paid credits.`);
                }
                throw new Error(errData.error?.message || `API Error ${res.status}`);
            }
            
            const data = await res.json();
            
            let content = data.choices?.[0]?.message?.content;
            if (data.error?.message?.includes("Prompt tokens limit exceeded")) {
                content = "⚠️ Your message is too long for the AI to process. Please try a shorter sentence.";
                setEmotion("concerned");
            } else if (!content) {
                // Return a graceful error message instead of throwing
                content = "⚠️ The AI returned an empty response. Please try again or switch to a different model.";
                setEmotion("neutral");
            } else {
                try {
                    const cleanStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(cleanStr);
                    if (parsed.text) content = parsed.text;
                    if (parsed.emotion) setEmotion(parsed.emotion);
                } catch (e) {
                    console.log("Failed to parse JSON response:", content);
                    setEmotion("neutral");
                }
            }
            
            const uiContent = content;
            const ttsContent = stripMarkdownForTTS(content);
            
            addEntry("ai", uiContent);
            speakText(ttsContent);
        } catch (err: any) {
            console.warn("OpenRouter API Error:", err.message || err);
            const msg = `System Error: ${err.message || "Failed to reach AI."}`;
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

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);

            accumulatedTranscriptRef.current = "";
            interimTextRef.current = "";
            latestCallbacksRef.current.setInput("");

            isRecordingRef.current = true;
            setIsRecording(true);
            try { 
                rec.start(); 
            } catch (e) {
                console.warn(e);
            }
        } else {
            if ((rec as any).manualStop) {
                (rec as any).manualStop();
            } else {
                isRecordingRef.current = false;
                setIsRecording(false);
                try { rec.stop(); } catch { }
            }
        }
    };

    latestCallbacksRef.current = {
        handleSendText,
        setInput,
        addEntry
    };

    return (
        <div className="flex h-screen bg-[#070B14] overflow-hidden">
            <FloatingNav
                state={isRecording ? "listening" : isSpeaking ? "speaking" : isLoading ? "thinking" : "idle"}
                rightSlot={
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const newValue = !webSearchEnabled;
                                setWebSearchEnabled(newValue);
                                localStorage.setItem("vaanix_avatar_web_search", String(newValue));
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
                        <button
                            onMouseEnter={() => setHoveringTranscript(true)}
                            onMouseLeave={() => setHoveringTranscript(false)}
                            onClick={() => setTranscriptOpen((p) => !p)}
                            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all text-[10px] sm:text-xs font-medium outline-none ${transcriptOpen
                                ? "bg-neon-purple/20 border-neon-purple/30 text-purple-300"
                                : "bg-white/[0.05] border-white/10 text-gray-400 hover:text-white"}`}
                            title="Toggle transcript"
                        >
                            {transcriptOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                            <span className="hidden xs:inline">{transcriptOpen ? "Hide" : "Transcript"}</span>
                        </button>

                        {/* Hover tooltip preview (Desktop only) */}
                        <AnimatePresence>
                            {hoveringTranscript && !transcriptOpen && transcript.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-[#141B2D] border border-white/10 rounded-2xl shadow-2xl p-3 z-[60] hidden lg:block"
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
                }
            />

            {/* ── MAIN AREA ── */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">

                {/* 3D Avatar + Input */}
                <div className="flex-1 flex flex-col min-h-0 bg-[radial-gradient(circle_at_center,_#0a1a3a_0%,_#070B14_100%)] pt-20 sm:pt-24">

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
                            <Suspense fallback={null}>
                                <AvatarModel isSpeaking={isSpeaking} emotion={emotion} />
                            </Suspense>
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

                        {/* Textual Captions (Subtitles) overlaying the bottom of the canvas */}
                        <AnimatePresence>
                            {isSpeaking && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 15 }}
                                    className="absolute bottom-14 sm:bottom-16 left-0 right-0 px-4 sm:px-12 pointer-events-none flex justify-center z-10"
                                >
                                    <div className="max-w-2xl bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                        <p className="text-white text-sm sm:text-base font-medium leading-relaxed drop-shadow-md">
                                            {stripMarkdownForTTS(transcript.slice().reverse().find(t => t.role === "ai")?.text || "")}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Input box */}
                    <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-md z-20">
                        <div className="max-w-3xl mx-auto items-center">
                            <div className="flex items-center gap-2 sm:gap-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl px-3 sm:px-5 py-2.5 sm:py-3.5 focus-within:border-neon-purple/40 focus-within:shadow-[0_0_30px_rgba(181,55,242,0.15)] transition-all">

                                {/* Mic button */}
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={toggleRecording}
                                    className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all outline-none ${isRecording
                                        ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                        : "bg-white/[0.06] text-gray-400 hover:bg-neon-purple/20 hover:text-purple-300 border border-white/10"}`}
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

                                {/* Stop button */}
                                <AnimatePresence>
                                    {isSpeaking && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={stopSpeaking}
                                            className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-all outline-none"
                                            title="Stop speaking"
                                        >
                                            <VolumeX size={18} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                {/* Send button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(181,55,242,0.5)] transition-all outline-none"
                                    title="Send message"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
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
                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(181,55,242,0.3)]">
                                                    <Bot size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] sm:max-w-[80%] flex flex-col gap-1 ${entry.role === "user" ? "items-end" : "items-start"}`}>
                                                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${entry.role === "user"
                                                    ? "bg-gradient-to-br from-neon-blue/80 to-neon-purple/80 text-white rounded-tr-sm shadow-md whitespace-pre-wrap"
                                                    : "bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-gray-200 rounded-tl-sm shadow-md"}`}>
                                                    {entry.role === "user" ? entry.text : (
                                                        <div className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-white prose-a:text-neon-blue prose-strong:text-white prose-li:marker:text-gray-500">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {entry.text}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
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
                                {input && isRecording && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-end gap-2.5"
                                    >
                                        <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs text-white/50 italic bg-blue-600/20 border border-blue-500/20 rounded-tr-sm">
                                            {input}…
                                        </div>
                                        <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                                            <User size={12} className="text-gray-300" />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Loading */}
                                {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-start">
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(181,55,242,0.3)]">
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

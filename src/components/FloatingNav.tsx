"use client";

import { motion } from "framer-motion";
import { MessageSquare, Mic, User, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────
type FloatingNavProps = {
    state?: "idle" | "listening" | "thinking" | "speaking";
    rightSlot?: React.ReactNode;
};

const MODES = [
    { id: "/chat", label: "Chat", icon: MessageSquare },
    { id: "/voice", label: "Voice", icon: Mic },
    { id: "/avatar", label: "Agent", icon: User },
];

export default function FloatingNav({ state = "idle", rightSlot }: FloatingNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Colors mapping based on the unified theme states
    const stateColors = {
        idle: "border-white/10 shadow-none",
        listening: "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
        thinking: "border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]",
        speaking: "border-neon-purple/40 shadow-[0_0_20px_rgba(181,55,242,0.2)]",
    };

    const handleModeSwitch = (href: string) => {
        if (pathname !== href) {
            router.push(href);
        }
    };

    if (!mounted) return null; // Avoid hydration mismatch on initial render

    return (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`pointer-events-auto flex items-center justify-between w-full max-w-4xl bg-[#0D1117]/70 backdrop-blur-3xl border rounded-full px-2 py-2 transition-all duration-500 ${stateColors[state]}`}
            >
                {/* ── LEFT: Logo & Back to Home ── */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <Link
                        href="/"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-colors group outline-none"
                        title="Back to Home"
                    >
                        <ArrowLeft size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                    </Link>

                    <div className="hidden sm:flex items-center gap-2 pl-2">
                        <div className="relative w-7 h-7 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg rotate-45 opacity-80" />
                            <Sparkles size={12} className="relative text-white z-10" />
                        </div>
                        <span className="text-sm font-heading font-black tracking-tight leading-none text-white">
                            Vaani<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">X</span>
                        </span>
                    </div>
                </div>

                {/* ── CENTER: Seamless Mode Switcher (Dynamic Island Core) ── */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center p-1 bg-black/40 border border-white/[0.05] rounded-full">
                    {MODES.map((mode) => {
                        const isActive = pathname === mode.id;
                        const Icon = mode.icon;

                        return (
                            <button
                                key={mode.id}
                                onClick={() => handleModeSwitch(mode.id)}
                                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors outline-none ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-active-pill"
                                        className="absolute inset-0 bg-white/10 border border-white/10 rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <Icon size={14} className={isActive ? "text-neon-blue" : ""} />
                                    <span className={!isActive ? "hidden sm:inline" : ""}>{mode.label}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── RIGHT: Contextual Slot (e.g. Transcripts, Settings, Search) ── */}
                <div className="flex items-center justify-end gap-2 ml-auto min-w-[72px] sm:min-w-[120px]">
                    {rightSlot}
                </div>
            </motion.div>
        </div>
    );
}

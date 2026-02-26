"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { MessageSquare, Mic, User, Zap, Shield, Globe, ChevronRight, Star, ArrowRight, Cpu, Brain, Volume2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Chatbot", href: "/chat" },
    { label: "Voice Chat", href: "/voice" },
    { label: "Agent Mode", href: "/avatar" },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-black/70 backdrop-blur-xl border-b border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]" : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group outline-none">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl rotate-45 group-hover:scale-110 transition-transform duration-300" />
            <span className="relative text-white font-black text-sm sm:text-lg z-10">V</span>
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight">
            <span className="text-white">Vaani</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">X</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/chat">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-shadow duration-300"
            >
              Get Started →
            </motion.button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white p-2 outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <div className={`w-4 h-0.5 bg-white ml-auto transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2 w-6" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-0 left-0 w-full h-screen bg-[#070B14]/98 backdrop-blur-2xl z-50 md:hidden flex flex-col p-8"
          >
            <div className="flex items-center justify-between mb-12">
              <Link href="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl rotate-45" />
                  <span className="relative text-white font-black text-lg z-10">V</span>
                </div>
                <span className="text-2xl font-black text-white">VaaniX</span>
              </Link>
              <button
                className="text-white p-2"
                onClick={() => setMenuOpen(false)}
              >
                <div className="w-6 h-0.5 bg-white rotate-45 translate-y-[1px]" />
                <div className="w-6 h-0.5 bg-white -rotate-45 -translate-y-[1px]" />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-3xl font-bold text-white hover:text-blue-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pb-12">
              <Link href="/chat" onClick={() => setMenuOpen(false)}>
                <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  Get Started Now
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Radial glow behind hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium backdrop-blur-sm"
      >
        <Star size={14} className="text-yellow-400 fill-yellow-400" />
        Developed at University · AI Communication Platform
      </motion.div>

      {/* Main Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-4xl xs:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] sm:leading-[1.05] mb-6"
      >
        <span className="text-white">The Future of </span>
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500">
          AI Communication
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-bold leading-relaxed px-4"
      >
        VaaniX is a universal AI platform that delivers intelligent text, voice, and 3D avatar interactions for ANY application — all in one seamless experience.
      </motion.p>

      {/* Hero CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-16 px-6 w-full max-w-md sm:max-w-none"
      >
        <Link href="/chat" className="w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow flex items-center justify-center gap-2"
          >
            Start Chatting <ArrowRight size={18} />
          </motion.button>
        </Link>
        <Link href="/voice" className="w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-8 py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-base hover:bg-white/10 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
          >
            Try Voice Mode <Mic size={18} />
          </motion.button>
        </Link>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.55 }}
        className="flex flex-wrap gap-8 md:gap-16 justify-center"
      >
        {[
          { value: "3", label: "AI Modes" },
          { value: "100%", label: "Client-Side" },
          { value: "∞", label: "Conversations" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Feature Section — Cards
// ─────────────────────────────────────────────
const features = [
  {
    icon: <MessageSquare size={36} />,
    tag: "Chatbot",
    tagColor: "from-blue-500 to-cyan-500",
    glowColor: "rgba(59,130,246,0.25)",
    borderColor: "border-blue-500/20",
    href: "/chat",
    title: "Intelligent AI Chatbot",
    description:
      "Engage in dynamic, multi-turn conversations powered by state-of-the-art language models via OpenRouter. Chat history persists locally, so your conversations are always available.",
    capabilities: [
      "Multi-turn conversations with memory",
      "Switchable AI models (GPT, Claude, Llama)",
      "Copy & regenerate responses",
      "Local chat history storage",
    ],
    accent: "text-blue-400",
    bg: "from-blue-900/20 to-cyan-900/10",
  },
  {
    icon: <Volume2 size={36} />,
    tag: "Voice Chat",
    tagColor: "from-purple-500 to-violet-500",
    glowColor: "rgba(139,92,246,0.25)",
    borderColor: "border-purple-500/20",
    href: "/voice",
    title: "Real-Time Voice Assistant",
    description:
      "Speak naturally with your AI. VaaniX uses the Web Speech API to transcribe your voice in real-time and synthesize AI responses back to you — no extra plugins needed.",
    capabilities: [
      "Live speech transcription",
      "Brain-to-text: no typing needed",
      "Adjustable voice speed & pitch",
      "3D animated reactive sphere",
    ],
    accent: "text-purple-400",
    bg: "from-purple-900/20 to-violet-900/10",
  },
  {
    icon: <User size={36} />,
    tag: "Agent Mode",
    tagColor: "from-pink-500 to-rose-500",
    glowColor: "rgba(236,72,153,0.25)",
    borderColor: "border-pink-500/20",
    href: "/avatar",
    title: "3D Human Avatar Agent",
    description:
      "Talk directly to a hyper-realistic 3D human avatar, powered by Ready Player Me. The avatar lip-syncs to AI responses in real-time, creating a deeply human interaction.",
    capabilities: [
      "Realistic 3D avatar rendering",
      "Procedural lip-sync to speech",
      "Type or speak your questions",
      "Immersive sci-fi environment",
    ],
    accent: "text-pink-400",
    bg: "from-pink-900/20 to-rose-900/10",
  },
];

function FeatureCard({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: index * 0.15 }}
      whileHover={{ y: -8 }}
      className={`relative rounded-2xl border ${feature.borderColor} bg-gradient-to-br ${feature.bg} p-8 flex flex-col gap-6 overflow-hidden group`}
      style={{ boxShadow: `0 0 60px ${feature.glowColor}` }}
    >
      {/* Glow layer on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${feature.glowColor}, transparent 70%)` }}
      />

      {/* Tag */}
      <div className={`inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-gradient-to-r ${feature.tagColor} text-white font-bold text-xs uppercase tracking-widest`}>
        {feature.tag}
      </div>

      {/* Icon */}
      <div className={`${feature.accent}`}>{feature.icon}</div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-white">{feature.title}</h3>

      {/* Description */}
      <p className="text-gray-400 leading-relaxed">{feature.description}</p>

      {/* Capabilities */}
      <ul className="flex flex-col gap-2">
        {feature.capabilities.map((cap) => (
          <li key={cap} className="flex items-center gap-2 text-sm text-gray-300">
            <ChevronRight size={14} className={`${feature.accent} shrink-0`} />
            {cap}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link href={feature.href} className="mt-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={`group flex items-center gap-2 px-6 py-3 rounded-xl border ${feature.borderColor} ${feature.accent} font-semibold text-sm hover:bg-white/5 transition-all`}
        >
          Launch {feature.tag}
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </Link>
    </motion.div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 sm:mb-16"
      >
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold mb-3 inline-block">Platform Features</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 px-2">
          Three Powerful Ways to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Communicate with AI
          </span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto px-4 text-sm sm:text-base">
          VaaniX integrates multiple AI interaction modalities into a single, cohesive experience.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, i) => (
          <FeatureCard key={feature.tag} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Why VaaniX Section
// ─────────────────────────────────────────────
const whyItems = [
  {
    icon: <Brain size={28} />,
    title: "Cutting-Edge AI Models",
    description: "Powered by top-tier LLMs including GPT-4, Claude 3, and Llama 3 via OpenRouter — always up-to-date.",
    color: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: <Shield size={28} />,
    title: "100% Private & Secure",
    description: "All AI interactions are processed client-side. Your API key and conversations never leave your device.",
    color: "text-green-400",
    border: "border-green-500/20",
  },
  {
    icon: <Globe size={28} />,
    title: "Built for University",
    description: "Designed with academic research and human-computer interaction studies at its core mission.",
    color: "text-purple-400",
    border: "border-purple-500/20",
  },
  {
    icon: <Zap size={28} />,
    title: "Instant Response",
    description: "Streamed, low-latency AI responses on both text and voice channels with live transcript monitoring.",
    color: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  {
    icon: <Cpu size={28} />,
    title: "3D Immersive UI",
    description: "Built with Three.js and React Three Fiber for truly immersive 3D visuals that make AI feel alive.",
    color: "text-pink-400",
    border: "border-pink-500/20",
  },
  {
    icon: <Zap size={28} />,
    title: "Real-Time Intelligence",
    description: "Live web search powered by OpenRouter gives you current answers with automatic source filtering for clean, natural responses.",
    color: "text-blue-400",
    border: "border-blue-500/20",
  },
];

function WhySection() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 sm:mb-16"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold mb-3 inline-block">Why VaaniX</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
          Built Different.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Built Smarter.
          </span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {whyItems.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className={`p-5 sm:p-6 rounded-2xl border ${item.border} bg-white/[0.03] backdrop-blur-sm flex flex-col gap-3 sm:gap-4`}
          >
            <div className={`${item.color} p-2.5 w-fit rounded-xl bg-white/5`}>{item.icon}</div>
            <h4 className="text-white font-bold text-base sm:text-lg">{item.title}</h4>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Final CTA Banner
// ─────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-3xl p-8 sm:p-12 text-center overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(236,72,153,0.1) 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
          Ready to talk to the future?
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm sm:text-base px-4">
          Join VaaniX and experience AI communication that goes beyond text — speak, listen, and interact in three dimensions.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none">
          <Link href="/chat" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-shadow flex items-center justify-center gap-2"
            >
              Open Chatbot <MessageSquare size={18} />
            </motion.button>
          </Link>
          <Link href="/avatar" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-8 py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Meet the Avatar <User size={18} />
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-4 sm:px-6 py-10 sm:py-12 bg-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
        <div className="flex items-center gap-3">
          <span className="text-xl sm:text-2xl font-black group cursor-default">
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Vaani</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">X</span>
          </span>
          <div className="w-[1px] h-4 bg-white/20 hidden md:block" />
          <span className="text-gray-300 font-semibold tracking-wide text-[11px] sm:text-sm">Universal AI Platform</span>
        </div>

        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium">
          <Link href="/chat" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">Chatbot</Link>
          <Link href="/voice" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Voice Chat</Link>
          <Link href="/avatar" className="text-gray-400 hover:text-pink-400 transition-colors duration-300">Agent Mode</Link>
        </div>

        <p className="text-gray-400 text-[11px] sm:text-sm font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-pulse" />
          VaaniX · Future of AI
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <WhySection />
      <CTABanner />
      <Footer />
    </div>
  );
}

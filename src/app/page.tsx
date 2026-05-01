"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { MessageSquare, Mic, User, Zap, Shield, Globe, ChevronRight, Star, ArrowRight, Cpu, Brain, Volume2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

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
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg sm:rounded-xl rotate-45 group-hover:scale-110 transition-transform duration-300 opacity-80" />
            <span className="relative text-white font-heading font-black text-sm sm:text-lg z-10">V</span>
          </div>
          <span className="text-xl sm:text-2xl font-heading font-black tracking-tight drop-shadow-md">
            <span className="text-white">Vaani</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">X</span>
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
                <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold text-lg shadow-[0_0_30px_rgba(181,55,242,0.3)]">
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
        className="text-5xl xs:text-6xl md:text-8xl lg:text-9xl font-heading font-black tracking-tighter leading-[1.05] sm:leading-[1] mb-6 drop-shadow-2xl"
      >
        <span className="text-white">The Future of </span>
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-violet-400 to-neon-purple">
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
        <Link href="/avatar" className="w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-8 py-4 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-300 font-bold text-base hover:bg-pink-500/20 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
          >
            Launch Agent <User size={18} />
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
// Interactive Spotlight Card & Bento Grid
// ─────────────────────────────────────────────
function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden group ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,.08), transparent 40%)`,
        }}
      />
      {children}
    </div>
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
  // Let's make the bento grid arrangement based on index
  const isWide = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`h-full ${isWide ? "md:col-span-2 md:row-span-1" : "md:col-span-1 md:col-start-3 md:row-start-1"}`}
    >
      <SpotlightCard className={`h-full rounded-[2.5rem] border ${feature.borderColor} bg-white/[0.02] backdrop-blur-xl p-8 sm:p-10 flex flex-col gap-8`}>
        <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
          <div className="flex flex-col gap-4">
            <div className={`inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border border-white/5 bg-white/5 text-white font-bold text-xs uppercase tracking-widest`}>
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${feature.tagColor}`} />
              {feature.tag}
            </div>
            {/* Icon */}
            <div className={`${feature.accent} bg-white/5 p-4 rounded-2xl w-fit border border-white/5`}>
              {feature.icon}
            </div>
            {/* Title */}
            <h3 className="text-3xl font-heading font-bold text-white tracking-tight">{feature.title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-lg leading-relaxed">{feature.description}</p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-auto">
          {/* Capabilities */}
          <ul className="flex flex-col gap-3">
            {feature.capabilities.slice(0, 3).map((cap) => (
              <li key={cap} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <ChevronRight size={16} className={`${feature.accent} shrink-0`} />
                {cap}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link href={feature.href} className="w-full sm:w-auto mt-4 sm:mt-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full group flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border ${feature.borderColor} bg-white/5 font-semibold text-white hover:bg-white/10 transition-all shadow-xl`}
            >
              Launch App
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 sm:mb-24"
      >
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-neon-blue mb-4 inline-block px-4 py-1.5 rounded-full border border-neon-blue/20 bg-neon-blue/10">Platform Features</span>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black text-white mb-6 px-2 tracking-tight">
          Three Powerful Ways to{" "}
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
            Communicate with AI
          </span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto px-4 text-base sm:text-xl">
          VaaniX leverages advanced web technologies to integrate multiple AI interaction modalities into a single, cohesive experience.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 md:gap-8">
        {/* We have 3 features. Map to bento layout. */}
        {features.map((feature, i) => {
          // Manually design bento classes for 3 items
          let containerClass = "";
          if (i === 0) containerClass = "md:col-span-2 md:row-span-1";
          if (i === 1) containerClass = "md:col-span-1 md:row-span-2";
          if (i === 2) containerClass = "md:col-span-2 md:row-span-1";

          return (
            <motion.div
              key={feature.tag}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className={`h-full ${containerClass}`}
            >
              <FeatureCard feature={feature} index={i} />
            </motion.div>
          );
        })}
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
        className="text-center mb-16 sm:mb-20"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-neon-purple font-bold mb-4 inline-block px-4 py-1.5 rounded-full border border-neon-purple/20 bg-neon-purple/10">Why VaaniX</span>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black text-white mb-6 tracking-tight">
          Built Different.{" "}
          <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">
            Built Smarter.
          </span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {whyItems.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className={`p-8 rounded-3xl border ${item.border} bg-white/[0.02] backdrop-blur-xl flex flex-col gap-5 group hover:bg-white/[0.04] transition-colors`}
          >
            <div className={`${item.color} p-4 w-fit rounded-2xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>{item.icon}</div>
            <h4 className="text-white font-heading font-bold text-xl sm:text-2xl">{item.title}</h4>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{item.description}</p>
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
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-[3rem] p-10 sm:p-16 text-center overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, rgba(0,243,255,0.1) 0%, rgba(181,55,242,0.15) 50%, rgba(0,243,255,0.05) 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px]" />
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black text-white mb-6 drop-shadow-lg tracking-tight">
          Ready to talk to the future?
        </h2>
        <p className="text-gray-300 mb-10 max-w-2xl mx-auto text-base sm:text-lg px-4 leading-relaxed">
          Join VaaniX today. Experience the next generation of AI communication through dynamic text, immersive voice, and responsive 3D avatars.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none relative z-10">
          <Link href="/chat" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold text-lg shadow-[0_0_40px_rgba(181,55,242,0.4)] transition-shadow flex items-center justify-center gap-3"
            >
              Open Chatbot <MessageSquare size={20} />
            </motion.button>
          </Link>
          <Link href="/voice" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-8 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-md"
            >
              Try Voice Mode <Mic size={20} />
            </motion.button>
          </Link>
          <Link href="/avatar" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-8 py-4 rounded-2xl border border-pink-500/30 bg-pink-500/10 text-pink-300 font-bold text-lg hover:bg-pink-500/20 transition-all flex items-center justify-center gap-3 backdrop-blur-md"
            >
              Meet the Avatar <User size={20} />
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
    <footer className="relative z-10 border-t border-white/10 px-4 sm:px-6 py-12 bg-[#020208]/80 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
        <div className="flex items-center gap-4">
          <span className="text-2xl sm:text-3xl font-heading font-black group cursor-default tracking-tighter">
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Vaani</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple drop-shadow-[0_0_15px_rgba(181,55,242,0.5)]">X</span>
          </span>
          <div className="w-[1px] h-6 bg-white/20 hidden md:block" />
          <span className="text-gray-400 font-medium tracking-wide text-[11px] sm:text-sm uppercase">Universal AI Platform</span>
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

import { Link } from 'react-router-dom'
import { SignSenseLogo } from '@/components/sign-sense-logo'
import { ScrollReveal } from '@/components/scroll-reveal'
import { AnimatedCounter } from '@/components/animated-counter'
import { ParticleField } from '@/components/particle-field'
import { FloatingIcons } from '@/components/floating-icons'
import {
  ArrowRight,
  Zap,
  Brain,
  Hand,
  MessageSquare,
  Eye,
  Shield,
  Cpu,
  Globe,
  ChevronDown,
  Github,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// Typewriter hook
function useTypewriter(phrases: string[], typingSpeed = 80, deletingSpeed = 40, pauseTime = 2000) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && text === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime)
    } else if (isDeleting && text === '') {
      setIsDeleting(false)
      setPhraseIndex((prev) => (prev + 1) % phrases.length)
    } else {
      timeout = setTimeout(
        () => {
          setText((prev) =>
            isDeleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1)
          )
        },
        isDeleting ? deletingSpeed : typingSpeed
      )
    }

    return () => clearTimeout(timeout)
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseTime])

  return text
}

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Technology', href: '#tech' },
  { label: 'Team', href: '#team' },
]

export function IndexPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const typedText = useTypewriter([
    'Sign Language',
    'ASL Gestures',
    'Hand Movements',
    'Visual Communication',
  ])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-3 shadow-lg shadow-black/20 bg-background/90 backdrop-blur-xl border-b border-border/50' : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <SignSenseLogo size="md" className="text-accent group-hover:scale-110 transition-transform duration-300" animated />
              <span className="font-syne font-bold text-lg text-foreground">
                Sign<span className="text-primary">Sense</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Marophobia/signsense"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                aria-label="View on GitHub"
              >
                <Github size={16} />
                <span className="hidden lg:inline">GitHub</span>
              </a>
              <Link
                to="/app"
                className="touch-target px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-syne font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
              >
                Launch App
              </Link>
              {/* Mobile menu button */}
              <button
                className="md:hidden touch-target p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <div className="w-5 flex flex-col gap-1">
                  <span className={`h-0.5 w-full bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`h-0.5 w-full bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`h-0.5 w-full bg-foreground transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-60 mt-4' : 'max-h-0'}`}>
            <div className="flex flex-col gap-2 pb-4 bg-background/95 backdrop-blur-xl rounded-xl p-3 border border-border/50">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 mesh-gradient">
        <ParticleField particleCount={40} />
        <FloatingIcons />

        {/* Orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[128px] animate-glow-pulse pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/8 blur-[128px] animate-glow-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <ScrollReveal delay={100} direction="none">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-status-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-medium text-primary/90 tracking-wide uppercase">Real-Time ASL Interpretation</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="font-syne font-bold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-balance leading-[1.05] tracking-tight mb-8">
              Translating{' '}
              <span className="relative">
                <span className="text-primary text-glow">{typedText}</span>
                <span className="animate-agent-pulse text-primary">|</span>
              </span>
              <br />
              <span className="text-foreground">in Real Time</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-lg sm:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed mb-12">
              SignSense AI uses advanced computer vision and deep learning to interpret American Sign Language
              instantly, making communication accessible and barrier-free for everyone.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={600}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/app"
                className="touch-target group relative px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-syne font-semibold text-base transition-all duration-300 flex items-center gap-2.5 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] overflow-hidden"
              >
                <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Sparkles size={18} aria-hidden="true" />
                Launch App
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="touch-target px-8 py-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground font-syne font-medium text-base transition-all duration-300 flex items-center gap-2.5"
              >
                <Eye size={18} className="text-muted-foreground" aria-hidden="true" />
                See How It Works
              </a>
            </div>
          </ScrollReveal>

          {/* Scroll indicator */}
          <ScrollReveal delay={800}>
            <a href="#stats" className="inline-flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors" aria-label="Scroll down">
              <span className="text-xs tracking-widest uppercase">Scroll</span>
              <ChevronDown size={16} className="animate-scroll-bounce" />
            </a>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="stats" className="relative border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { value: 99, suffix: '%', label: 'Detection Accuracy', prefix: '' },
              { value: 50, suffix: 'ms', label: 'Response Latency', prefix: '<' },
              { value: 200, suffix: '+', label: 'ASL Signs Supported', prefix: '' },
              { value: 24, suffix: '/7', label: 'Always Available', prefix: '' },
            ].map((stat, idx) => (
              <ScrollReveal key={idx} delay={idx * 150} direction="up">
                <div className="text-center group">
                  <div className="font-syne font-bold text-4xl lg:text-5xl text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <span className="inline-block text-xs font-medium text-primary/80 tracking-widest uppercase mb-4">Features</span>
            <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
              Powerful AI, <span className="text-primary">Seamless</span> Experience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              Built with cutting-edge technology to deliver the most accurate and responsive ASL interpretation available.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Large feature card - spans 2 cols */}
          <ScrollReveal delay={100} className="md:col-span-2 lg:col-span-2">
            <div className="gesture-card h-full p-8 lg:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-primary/10 transition-colors duration-700" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Brain size={24} className="text-primary" aria-hidden="true" />
                  </div>
                  <span className="pipeline-badge status-active">Core</span>
                </div>
                <h3 className="font-syne font-bold text-2xl lg:text-3xl mb-4">Real-Time Gesture Intelligence</h3>
                <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
                  Our advanced neural network processes video frames at 60fps, detecting and classifying hand gestures,
                  finger positions, and movement patterns with sub-millisecond latency. Context-aware processing
                  understands gesture sequences to form complete sentences.
                </p>
                {/* Mini demo visualization */}
                <div className="mt-8 flex items-center gap-3 flex-wrap">
                  {['Hello', 'Thank You', 'Please', 'Yes', 'Help'].map((word, i) => (
                    <span
                      key={word}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 animate-badge-fade-in"
                      style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'both' }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Tall feature card */}
          <ScrollReveal delay={200}>
            <div className="gesture-card h-full p-8 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 group-hover:bg-accent/10 transition-colors duration-700" />
              <div className="relative">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-6">
                  <Zap size={24} className="text-accent" aria-hidden="true" />
                </div>
                <h3 className="font-syne font-bold text-xl mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Sub-50ms response time ensures natural conversation flow. No awkward pauses or delays between signing and text output.
                </p>
                {/* Speed visualization */}
                <div className="space-y-3">
                  {[
                    { label: 'Detection', width: '95%', ms: '12ms' },
                    { label: 'Processing', width: '88%', ms: '23ms' },
                    { label: 'Output', width: '97%', ms: '8ms' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-primary font-mono">{item.ms}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary to-accent shimmer"
                          style={{ width: item.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Regular feature cards */}
          {[
            {
              icon: Hand,
              title: 'Gesture Recognition',
              desc: 'Advanced hand tracking with 21-point skeletal mapping for precise finger and palm position detection.',
              badge: 'AI Model',
            },
            {
              icon: MessageSquare,
              title: 'Live Transcription',
              desc: 'Continuous text output with auto-punctuation, sentence building, and paragraph formatting.',
              badge: 'NLP',
            },
            {
              icon: Shield,
              title: 'Privacy First',
              desc: 'All processing happens locally. No video is stored or transmitted to external servers.',
              badge: 'Security',
            },
          ].map(({ icon: Icon, title, desc, badge }, idx) => (
            <ScrollReveal key={title} delay={100 + idx * 150}>
              <div className="gesture-card h-full p-8 group">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
                    <Icon size={22} className="text-primary" aria-hidden="true" />
                  </div>
                  <span className="pipeline-badge status-inactive text-[11px]">{badge}</span>
                </div>
                <h3 className="font-syne font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16 lg:mb-20">
              <span className="inline-block text-xs font-medium text-primary/80 tracking-widest uppercase mb-4">Process</span>
              <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
                Four Steps to <span className="text-primary">Understanding</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
                From camera input to readable text in milliseconds. Here is how SignSense translates sign language.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: Eye,
                title: 'Camera Capture',
                desc: 'High-fidelity video input captures hand positions, facial expressions, and body movements at 60 frames per second.',
                color: 'from-blue-500/20 to-cyan-500/20',
              },
              {
                step: '02',
                icon: Hand,
                title: 'Gesture Detection',
                desc: 'AI-powered hand tracking identifies 21 skeletal key points per hand, mapping precise finger positions and palm orientation.',
                color: 'from-cyan-500/20 to-teal-500/20',
              },
              {
                step: '03',
                icon: Cpu,
                title: 'Context Engine',
                desc: 'Sequential gesture analysis understands sign language grammar, applying linguistic rules to form coherent sentences.',
                color: 'from-teal-500/20 to-emerald-500/20',
              },
              {
                step: '04',
                icon: MessageSquare,
                title: 'Live Output',
                desc: 'Translated text appears instantly on screen with auto-punctuation, confidence scores, and alternative interpretations.',
                color: 'from-emerald-500/20 to-green-500/20',
              },
            ].map(({ step, icon: Icon, title, desc, color }, idx) => (
              <ScrollReveal key={step} delay={idx * 200}>
                <div className="gesture-card h-full p-8 relative group">
                  <div className="absolute top-4 right-4 font-syne font-bold text-6xl text-primary/5 group-hover:text-primary/10 transition-colors duration-500 select-none">
                    {step}
                  </div>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${color} rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon size={24} className="text-primary" aria-hidden="true" />
                    </div>
                    {idx < 3 && (
                      <div className="hidden lg:block absolute top-10 -right-6 w-6 border-t border-dashed border-primary/20" aria-hidden="true" />
                    )}
                    <h3 className="font-syne font-bold text-lg mb-3">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Preview */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <ScrollReveal direction="left">
            <div>
              <span className="inline-block text-xs font-medium text-primary/80 tracking-widest uppercase mb-4">Live Preview</span>
              <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
                See It <span className="text-primary">In Action</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                SignSense processes your camera feed locally, detecting hand gestures and translating them
                to text in real-time. No cloud processing, no privacy concerns.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Activity, label: 'Real-time pipeline status monitoring' },
                  { icon: Layers, label: 'Multi-layer gesture confidence scoring' },
                  { icon: Globe, label: 'Context-aware sentence construction' },
                  { icon: Shield, label: 'On-device processing for maximum privacy' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 group">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <Icon size={16} className="text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-foreground/80 text-sm">{label}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/app"
                className="inline-flex touch-target mt-10 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-syne font-semibold text-sm transition-all duration-200 items-center gap-2 group hover:shadow-lg hover:shadow-primary/25"
              >
                Try It Yourself
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Mock App UI */}
          <ScrollReveal direction="right">
            <div className="glass-strong p-1.5 rounded-2xl glow-blue relative">
              <div className="rounded-xl overflow-hidden bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-[11px] text-muted-foreground ml-2 font-mono">signsense.ai/app</span>
                  </div>
                  <div className="pipeline-badge status-active">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-status-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                    Live
                  </div>
                </div>
                <div className="aspect-video bg-linear-to-br from-secondary to-card relative flex items-center justify-center">
                  <div className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-lg" />
                  <div className="text-center">
                    <Hand size={48} className="text-primary/30 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Camera Feed Active</p>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                    <div className="glass px-3 py-2 rounded-lg flex-1">
                      <div className="text-[10px] text-muted-foreground mb-1">Detected</div>
                      <div className="text-sm font-syne font-semibold text-primary">{'Hello'}</div>
                    </div>
                    <div className="glass px-3 py-2 rounded-lg">
                      <div className="text-[10px] text-muted-foreground mb-1">Confidence</div>
                      <div className="text-sm font-mono font-semibold text-green-400">97.3%</div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-border/50">
                  <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Transcript</div>
                  <p className="text-sm text-foreground/80">
                    {'Hello, thank you for using SignSense AI. How can I help you today?'}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Technology Section */}
      <section id="tech" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative border-t border-border/30">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16 lg:mb-20">
              <span className="inline-block text-xs font-medium text-primary/80 tracking-widest uppercase mb-4">Technology</span>
              <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
                Built on <span className="text-primary">Modern</span> Infrastructure
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
                Powered by state-of-the-art AI models and robust infrastructure for reliable, scalable performance.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Python', desc: 'Backend' },
              { name: 'FastAPI', desc: 'API Layer' },
              { name: 'MediaPipe', desc: 'Hand Tracking' },
              { name: 'TensorFlow', desc: 'ML Models' },
              { name: 'React', desc: 'Frontend' },
              { name: 'Stream.io', desc: 'Video' },
            ].map((tech, idx) => (
              <ScrollReveal key={tech.name} delay={idx * 100}>
                <div className="gesture-card text-center p-6 group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Cpu size={20} className="text-primary" aria-hidden="true" />
                  </div>
                  <h4 className="font-syne font-semibold text-sm mb-0.5">{tech.name}</h4>
                  <p className="text-xs text-muted-foreground">{tech.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <span className="inline-block text-xs font-medium text-primary/80 tracking-widest uppercase mb-4">Team</span>
            <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
              Meet the <span className="text-primary">Minds</span> Behind It
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              A passionate team committed to making communication more accessible through technology.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: 'Team Lead', role: 'Full-Stack Developer', initials: 'TL' },
            { name: 'ML Engineer', role: 'AI / Computer Vision', initials: 'ML' },
            { name: 'Frontend Dev', role: 'UI/UX Designer', initials: 'FD' },
            { name: 'Backend Dev', role: 'API / Infrastructure', initials: 'BD' },
          ].map((member, idx) => (
            <ScrollReveal key={idx} delay={idx * 150}>
              <div className="gesture-card text-center p-8 group">
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary/20 to-accent/20 border border-primary/20 mx-auto mb-5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                  <span className="font-syne font-bold text-lg text-primary">{member.initials}</span>
                </div>
                <h4 className="font-syne font-bold text-base mb-1">{member.name}</h4>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="border-gradient rounded-2xl">
              <div className="gesture-card text-center p-12 lg:p-16 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-8 flex items-center justify-center">
                    <Sparkles size={28} className="text-primary" aria-hidden="true" />
                  </div>
                  <h2 className="font-syne font-bold text-4xl lg:text-5xl text-balance mb-6">
                    Ready to Break <span className="text-primary">Barriers</span>?
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
                    Start using SignSense AI today. No setup required, no account needed.
                    Just allow camera access and begin communicating.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to="/app"
                      className="touch-target group relative px-10 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-syne font-bold text-base transition-all duration-300 flex items-center gap-2.5 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      Launch App Now
                      <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" aria-hidden="true" />
                    </Link>
                    <a
                      href="https://github.com/Marophobia/signsense"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="touch-target px-8 py-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground font-syne font-medium text-base transition-all duration-300 flex items-center gap-2.5"
                    >
                      <Github size={18} aria-hidden="true" />
                      View Source
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-4 sm:px-6 lg:px-8 bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <SignSenseLogo size="sm" className="text-accent" />
              <span className="font-syne font-semibold text-sm text-foreground/70">
                Sign<span className="text-primary/70">Sense</span> AI
              </span>
            </div>
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60">
              Built with purpose for accessibility
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

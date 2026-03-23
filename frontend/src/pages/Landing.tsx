import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Brain,
  Zap,
  Users,
  BookOpen,
  BarChart3,
  Play,
  ArrowRight,
  Star,
  ChevronRight,
  Globe,
  Target,
  Rocket,
  GraduationCap,
  Award,
  TrendingUp,
  CheckCircle2,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 8, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Data Science Student",
    text: "Dei adapted to my learning speed. I finished my ML course 40% faster than expected.",
    initials: "PS",
    gradient: "from-dei-peach to-dei-rose",
  },
  {
    name: "Marcus Chen",
    role: "Full-Stack Developer",
    text: "The AI buddy is like having a personal tutor available 24/7. Game changer.",
    initials: "MC",
    gradient: "from-dei-sky to-dei-lavender",
  },
  {
    name: "Fatima Al-Rashid",
    role: "UX Design Instructor",
    text: "My students' completion rates jumped from 34% to 89% after switching to Dei.",
    initials: "FA",
    gradient: "from-dei-sage to-dei-sky",
  },
];

const features = [
  {
    icon: Brain,
    title: "Adaptive Intelligence",
    desc: "AI analyzes your learning patterns and adjusts difficulty, pacing, and content in real-time.",
    color: "text-dei-lavender",
    bg: "dei-gradient-lavender",
  },
  {
    icon: Target,
    title: "Precision Roadmaps",
    desc: "Auto-generated learning paths that evolve based on your progress and career goals.",
    color: "text-dei-peach",
    bg: "dei-gradient-peach",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    desc: "Smart quizzes with real-time analysis. Know exactly where you stand, always.",
    color: "text-dei-amber",
    bg: "dei-gradient-amber",
  },
  {
    icon: Users,
    title: "Collaborative Cohorts",
    desc: "Learn alongside peers matched by skill level, timezone, and learning style.",
    color: "text-dei-sky",
    bg: "dei-gradient-sky",
  },
];

const stats = [
  { value: "12,847", label: "Active Learners" },
  { value: "94%", label: "Completion Rate" },
  { value: "2.3x", label: "Faster Learning" },
  { value: "4.9", label: "Avg Rating", icon: Star },
];

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 bg-background/80 backdrop-blur-xl border-b border-border/30"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          <span className="font-bold text-xl tracking-tight">ei</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Stories</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/student">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/student">
            <Button size="sm" className="rounded-xl">
              Start free <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-[100vh] flex items-center justify-center pt-16 overflow-hidden">
        <FloatingOrb className="w-96 h-96 bg-dei-peach -top-20 -right-20" delay={0} />
        <FloatingOrb className="w-72 h-72 bg-dei-sky -bottom-10 -left-10" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-dei-lavender top-1/3 left-1/4" delay={4} />

        <motion.div style={{ y: heroY }} className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered learning, reimagined
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.9] text-balance mb-6"
          >
            Learn at the
            <br />
            speed of{" "}
            <span className="relative inline-block">
              <span className="relative z-10">you</span>
              <motion.span
                className="absolute bottom-1 left-0 right-0 h-3 bg-primary/25 rounded-full -z-0"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ originX: 0 }}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty"
          >
            Dei uses artificial intelligence to build personalized learning paths,
            adapt to your pace, and keep you engaged — so you actually finish what you start.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/student">
              <Button size="lg" className="rounded-2xl px-8 h-13 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                Start learning free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="rounded-2xl px-8 h-13 text-base group">
              <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Watch demo
            </Button>
          </motion.div>

          {/* Floating dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 relative"
            style={{
              transform: `perspective(1200px) rotateY(${(mousePos.x - 0.5) * 4}deg) rotateX(${(mousePos.y - 0.5) * -4}deg)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <div className="dei-card p-1 shadow-2xl shadow-primary/10">
              <div className="bg-muted/30 rounded-xl p-4 md:p-6">
                <div className="flex gap-4 mb-4">
                  <div className="w-3 h-3 rounded-full bg-dei-rose/60" />
                  <div className="w-3 h-3 rounded-full bg-dei-amber/60" />
                  <div className="w-3 h-3 rounded-full bg-dei-sage/60" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-8 rounded-lg ${i === 1 ? "bg-primary/15" : "bg-muted/60"}`} />
                    ))}
                  </div>
                  <div className="col-span-2 space-y-3">
                    <div className="h-24 rounded-xl bg-primary/10" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-lg dei-gradient-sky" />
                      <div className="h-16 rounded-lg dei-gradient-sage" />
                      <div className="h-16 rounded-lg dei-gradient-amber" />
                    </div>
                    <div className="h-32 rounded-xl bg-muted/60" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-6">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums flex items-center justify-center gap-1">
                    {stat.value}
                    {stat.icon && <Star className="w-5 h-5 text-dei-amber fill-dei-amber" />}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance mb-4">
              Intelligence baked into every lesson
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              Not just another course library. Dei thinks, adapts, and grows with each learner.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.25 } }}
                  className="dei-card p-6 md:p-8 group cursor-default h-full"
                >
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-pretty leading-relaxed">{f.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">How it works</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
              Three minutes to your first lesson
            </h2>
          </AnimatedSection>

          <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {[
              { step: "01", icon: MousePointerClick, title: "Tell us your goals", desc: "Pick your subject, skill level, and how much time you have. That's it." },
              { step: "02", icon: Brain, title: "AI builds your path", desc: "Our engine crafts a personalized curriculum with adaptive difficulty and pacing." },
              { step: "03", icon: Rocket, title: "Learn & evolve", desc: "As you progress, Dei reshapes your path. Struggling? It slows down. Flying? It challenges you." },
            ].map((s, i) => (
              <AnimatedSection key={s.step} delay={i * 0.12}>
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-bold text-primary/60 tracking-widest uppercase mb-2">Step {s.step}</p>
                  <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-pretty">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive feature showcase */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <p className="text-sm font-medium text-primary mb-3">AI Study Buddy</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance mb-5">
                Your always-on learning companion
              </h2>
              <p className="text-muted-foreground text-pretty mb-8 leading-relaxed">
                Ask questions mid-lesson, get explanations in your language, or have it quiz you before an exam.
                The AI buddy understands context and remembers your weak spots.
              </p>
              <ul className="space-y-4">
                {[
                  "Voice & text conversation",
                  "Context-aware doubt resolution",
                  "Personalized revision schedules",
                  "Explains concepts at your level",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4.5 h-4.5 text-dei-sage flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
            <AnimatedSection delay={0.15}>
              <div className="dei-card p-5 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Dei AI Buddy</span>
                  <span className="ml-auto text-xs text-dei-sage font-medium px-2 py-0.5 rounded-full bg-dei-sage/10">Online</span>
                </div>
                {[
                  { from: "user", text: "Can you explain backpropagation simply?" },
                  { from: "ai", text: "Think of it like grading a test backwards. The network checks its final answer, sees how wrong it was, then traces back through each layer to figure out which 'neurons' caused the mistake — and adjusts them a tiny bit. Repeat thousands of times, and it learns!" },
                  { from: "user", text: "That makes sense! What about vanishing gradients?" },
                ].map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.from === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/80 text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 h-10 rounded-xl bg-muted/60 px-4 flex items-center text-sm text-muted-foreground">
                    Ask anything...
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 md:py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">Stories</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
              Learners who leveled up
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.25 } }}
                  className="dei-card p-6 h-full flex flex-col"
                >
                  <p className="text-sm text-foreground/90 leading-relaxed flex-1 mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                      <span className="text-xs font-bold text-primary-foreground">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance mb-4">
              Start free. Scale when ready.
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "Starter",
                price: "Free",
                desc: "For curious learners",
                features: ["5 courses", "Basic AI buddy", "Progress tracking", "Community access"],
                cta: "Get started",
                variant: "outline" as const,
              },
              {
                name: "Pro",
                price: "₹499/mo",
                desc: "For serious students",
                features: ["Unlimited courses", "Advanced AI buddy", "Smart quizzes", "Priority support", "Certificates"],
                cta: "Start Pro trial",
                variant: "default" as const,
                popular: true,
              },
              {
                name: "Institution",
                price: "Custom",
                desc: "For schools & orgs",
                features: ["Everything in Pro", "Admin dashboard", "Bulk enrollment", "Analytics API", "White-label"],
                cta: "Contact sales",
                variant: "outline" as const,
              },
            ].map((plan, i) => (
              <AnimatedSection key={plan.name} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.25 } }}
                  className={`dei-card p-6 h-full flex flex-col relative ${plan.popular ? "ring-2 ring-primary/30" : ""}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <p className="text-3xl font-extrabold mb-6">{plan.price}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-dei-sage flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.variant} className="w-full rounded-xl">
                    {plan.cta}
                  </Button>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center dei-card p-10 md:p-16 relative overflow-hidden">
            <FloatingOrb className="w-48 h-48 bg-dei-peach -top-10 -right-10" />
            <FloatingOrb className="w-36 h-36 bg-dei-sky -bottom-8 -left-8" delay={2} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance mb-4">
                Ready to learn smarter?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-pretty">
                Join thousands of learners who are finishing courses, mastering skills, and actually enjoying the process.
              </p>
              <Link to="/student">
                <Button size="lg" className="rounded-2xl px-10 h-13 text-base shadow-lg shadow-primary/20">
                  Start for free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">D</span>
            </div>
            <span className="font-bold text-lg">ei</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
            <Link to="/instructor" className="hover:text-foreground transition-colors">Teach on Dei</Link>
            <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Dei. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

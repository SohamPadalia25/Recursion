import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Brain,
  Zap,
  Users,
  Target,
  Rocket,
  Star,
  ArrowRight,
  Play,
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
      initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
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
  { name: "Priya Sharma", role: "Data Science Student", text: "StudyBuddyadapted to my learning speed. I finished my ML course 40% faster than expected.", initials: "PS", gradient: "from-dei-peach to-dei-rose" },
  { name: "Marcus Chen", role: "Full-Stack Developer", text: "The AI buddy is like having a personal tutor available 24/7. Game changer.", initials: "MC", gradient: "from-dei-sky to-dei-lavender" },
  { name: "Fatima Al-Rashid", role: "UX Design Instructor", text: "My students' completion rates jumped from 34% to 89% after switching to Dei.", initials: "FA", gradient: "from-dei-sage to-dei-sky" },
];

const features = [
  { icon: Brain, title: "Adaptive Intelligence", desc: "AI analyzes your learning patterns and adjusts difficulty, pacing, and content in real-time.", color: "text-dei-lavender", bg: "dei-gradient-lavender" },
  { icon: Target, title: "Precision Roadmaps", desc: "Auto-generated learning paths that evolve based on your progress and career goals.", color: "text-dei-peach", bg: "dei-gradient-peach" },
  { icon: Zap, title: "Instant Feedback", desc: "Smart quizzes with real-time analysis. Know exactly where you stand, always.", color: "text-dei-amber", bg: "dei-gradient-amber" },
  { icon: Users, title: "Collaborative Cohorts", desc: "Learn alongside peers matched by skill level, timezone, and learning style.", color: "text-dei-sky", bg: "dei-gradient-sky" },
];

const stats = [
  { value: "12,847", label: "Active Learners" },
  { value: "94%", label: "Completion Rate" },
  { value: "2.3x", label: "Faster Learning" },
  { value: "4.9", label: "Avg Rating", icon: Star },
];

export default function Landing() {
  const { scrollYProgress } = useScroll();
  
  // Hero Parallax
  const heroTextY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const mascotY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const featuresBgY = useTransform(scrollYProgress, [0.1, 0.5], [100, -100]);

  // Features Section Staggered Card Parallax
  const featuresRef = useRef(null);
  const { scrollYProgress: featuresScroll } = useScroll({ target: featuresRef, offset: ["start end", "end start"] });
  const fCol1Y = useTransform(featuresScroll, [0, 1], [60, -60]);
  const fCol2Y = useTransform(featuresScroll, [0, 1], [120, -120]);

  // Testimonials Section Staggered Card Parallax
  const testimonialsRef = useRef(null);
  const { scrollYProgress: testScroll } = useScroll({ target: testimonialsRef, offset: ["start end", "end start"] });
  const tCol1Y = useTransform(testScroll, [0, 1], [50, -50]);
  const tCol2Y = useTransform(testScroll, [0, 1], [100, -100]);
  const tCol3Y = useTransform(testScroll, [0, 1], [150, -150]);

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
      <section className="relative min-h-[100vh] flex items-center pt-24 pb-16 overflow-hidden">
        <FloatingOrb className="w-96 h-96 bg-dei-peach -top-20 -right-20" delay={0} />
        <FloatingOrb className="w-72 h-72 bg-dei-sky -bottom-10 -left-10" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-dei-lavender top-1/3 left-1/4" delay={4} />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left: Text Content */}
          <motion.div style={{ y: heroTextY }} className="text-left">
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
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-balance mb-6"
            >
              Learn at the<br />speed of{" "}
              <span className="relative inline-block text-primary">
                <span className="relative z-10">you</span>
                <motion.span
                  className="absolute bottom-2 left-0 right-0 h-4 bg-primary/20 rounded-full -z-0"
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
              className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty max-w-lg"
            >
              StudyBuddyuses artificial intelligence to build personalized learning paths,
              adapt to your pace, and keep you engaged — so you actually finish what you start.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Link to="/student" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-2xl px-8 h-13 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  Start learning free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl px-8 h-13 text-base group">
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Watch demo
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Mascot Video */}
          <motion.div
            style={{ 
              y: mascotY,
              transform: `perspective(1000px) rotateY(${(mousePos.x - 0.5) * 10}deg) rotateX(${(mousePos.y - 0.5) * -10}deg)`,
            }}
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-dei-sky/30 blur-3xl rounded-full opacity-60" />
            <div className="relative rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl shadow-primary/20 bg-muted/30 p-2">
              <video 
                src="/mascot.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-auto rounded-[2rem] object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-background relative z-20 border-y border-border/30 shadow-[0_0_50px_rgba(0,0,0,0.02)]">
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

      {/* Features with Staggered Parallax Cards */}
      <section id="features" ref={featuresRef} className="py-24 md:py-32 px-6 relative overflow-hidden">
        <motion.div style={{ y: featuresBgY }} className="absolute -right-40 top-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-20">
            <p className="text-sm font-medium text-primary mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance mb-4">
              Intelligence baked into every lesson
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              Not just another course library. StudyBuddythinks, adapts, and grows with each learner.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={f.title}
                style={{ y: i % 2 === 0 ? fCol1Y : fCol2Y }} // Alternate column scrolling speeds
                className="h-full"
              >
                <AnimatedSection delay={i * 0.1}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="dei-card p-8 md:p-10 group h-full bg-background/60 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300 rounded-[2rem]"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6 shadow-inner`}>
                      <f.icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                    <p className="text-muted-foreground text-pretty leading-relaxed text-lg">{f.desc}</p>
                  </motion.div>
                </AnimatedSection>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-20">
            <p className="text-sm font-medium text-primary mb-3">How it works</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
              Three minutes to your first lesson
            </h2>
          </AnimatedSection>

          <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8 relative">
            {/* Connecting Line background for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10" />
            
            {[
              { step: "01", icon: MousePointerClick, title: "Tell us your goals", desc: "Pick your subject, skill level, and how much time you have. That's it." },
              { step: "02", icon: Brain, title: "AI builds your path", desc: "Our engine crafts a personalized curriculum with adaptive difficulty and pacing." },
              { step: "03", icon: Rocket, title: "Learn & evolve", desc: "As you progress, StudyBuddyreshapes your path. Struggling? It slows down. Flying? It challenges you." },
            ].map((s, i) => (
              <AnimatedSection key={s.step} delay={i * 0.2}>
                <motion.div 
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center md:text-left bg-background p-8 rounded-[2rem] border border-border/40 shadow-sm hover:shadow-xl transition-shadow"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 shadow-inner">
                    <s.icon className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-xs font-bold text-primary/60 tracking-widest uppercase mb-3">Step {s.step}</p>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-muted-foreground text-pretty leading-relaxed">{s.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive feature showcase */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <p className="text-sm font-medium text-primary mb-3">AI Study Buddy</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance mb-6">
                Your always-on learning companion
              </h2>
              <p className="text-muted-foreground text-pretty mb-8 leading-relaxed text-lg">
                Ask questions mid-lesson, get explanations in your language, or have it quiz you before an exam.
                The AI buddy understands context and remembers your weak spots.
              </p>
              <ul className="space-y-5">
                {[
                  "Voice & text conversation",
                  "Context-aware doubt resolution",
                  "Personalized revision schedules",
                  "Explains concepts at your level",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-4 text-base font-medium">
                    <CheckCircle2 className="w-6 h-6 text-dei-sage flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
            
            <AnimatedSection delay={0.2}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="dei-card p-6 space-y-4 bg-background/80 backdrop-blur-xl shadow-2xl border border-border/50 rounded-[2rem]"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-base font-semibold">StudyBuddyAI Buddy</span>
                  <span className="ml-auto text-xs text-dei-sage font-medium px-3 py-1 rounded-full bg-dei-sage/10">Online</span>
                </div>
                
                <div className="space-y-4">
                  {[
                    { from: "user", text: "Can you explain backpropagation simply?" },
                    { from: "ai", text: "Think of it like grading a test backwards. The network checks its final answer, sees how wrong it was, then traces back through each layer to figure out which 'neurons' caused the mistake — and adjusts them a tiny bit. Repeat thousands of times, and it learns!" },
                    { from: "user", text: "That makes sense! What about vanishing gradients?" },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.5, type: "spring" }}
                      className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                          msg.from === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
                            : "bg-muted text-foreground rounded-bl-sm border border-border/40"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-border/40 mt-4">
                  <div className="flex-1 h-12 rounded-xl bg-muted/60 px-5 flex items-center text-sm text-muted-foreground border border-border/30">
                    Ask anything...
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md cursor-pointer hover:bg-primary/90 transition-colors">
                    <ArrowRight className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials with Staggered Parallax Cards */}
      <section id="testimonials" ref={testimonialsRef} className="py-24 md:py-32 px-6 bg-muted/30 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-20">
            <p className="text-sm font-medium text-primary mb-3">Stories</p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
              Learners who leveled up
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div 
                key={t.name}
                style={{ y: i % 3 === 0 ? tCol1Y : i % 3 === 1 ? tCol2Y : tCol3Y }} // 3-column alternating scroll speed
                className="h-full"
              >
                <AnimatedSection delay={i * 0.1}>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="dei-card p-8 h-full flex flex-col bg-background border border-border/50 shadow-md hover:shadow-xl transition-shadow rounded-[2rem]"
                  >
                    <p className="text-base text-foreground/90 leading-relaxed flex-1 mb-8">"{t.text}"</p>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-inner`}>
                        <span className="text-sm font-bold text-primary-foreground">{t.initials}</span>
                      </div>
                      <div>
                        <p className="text-base font-semibold">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatedSection>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-6">
        <AnimatedSection>
          <motion.div 
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="max-w-4xl mx-auto text-center dei-card p-12 md:p-20 relative overflow-hidden bg-primary/5 border border-primary/10 rounded-[3rem] shadow-2xl"
          >
            <FloatingOrb className="w-64 h-64 bg-dei-peach -top-20 -right-20" />
            <FloatingOrb className="w-48 h-48 bg-dei-sky -bottom-10 -left-10" delay={2} />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance mb-6">
                Ready to learn smarter?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto text-pretty">
                Join thousands of learners who are finishing courses, mastering skills, and actually enjoying the process.
              </p>
              <Link to="/student">
                <Button size="lg" className="rounded-2xl px-10 h-14 text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-300">
                  Start for free <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-6 bg-background">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
            <span className="font-bold text-xl">ei</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Dei. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
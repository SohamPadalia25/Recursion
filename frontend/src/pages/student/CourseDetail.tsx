import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Heart, PlayCircle, Share2, Star } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { demoCourses, getCourseById } from "@/data/udemyDemoCourses";
import { studentNav } from "../roleNav";

const learnProjects = [
    "Career Digital Twin Agent",
    "SDR Sales Email Agent",
    "Deep Research Multi-Agent System",
    "Stock Picker Agent",
    "4-Agent Engineering Team",
    "Browser Operator Agent",
    "Agent Creator (build agents automatically)",
    "Trading Floor with autonomous agents",
];

const requirements = [
    "Basic Python knowledge is helpful but optional",
    "Beginner-friendly learning path with guided labs",
    "Optional API cost is typically below INR 500 (< $5)",
];

const audience = [
    "Developers who want to build practical AI agent products",
    "AI enthusiasts exploring agentic workflows in 2026",
    "Beginners curious about building autonomous systems",
    "Professionals aiming to automate work with AI agents",
];

const reviews = [
    { name: "Rohit K.", rating: 5, text: "Most practical AI course I have taken. Real projects, not theory slides." },
    { name: "Maya S.", rating: 5, text: "Hands-on from day one. The MCP and orchestration sections are excellent." },
    { name: "Arnav P.", rating: 4, text: "Loved the project-first style. Helped me ship my first production agent." },
    { name: "Sara L.", rating: 5, text: "Clear instruction and realistic workflows. Great for career transition." },
    { name: "Deepak M.", rating: 4, text: "Solid depth with modern tooling. Exactly what hiring teams are asking for." },
];

export default function StudentCourseDetailPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const course = useMemo(() => (courseId ? getCourseById(courseId) : undefined), [courseId]);

    if (!course) {
        return (
            <AppFrame roleLabel="Student" title="Course not found" subtitle="Please choose a valid course from dashboard." navItems={studentNav}>
                <div className="dei-card p-6">
                    <p className="text-muted-foreground">This course does not exist in demo catalog.</p>
                    <Button className="mt-4 rounded-xl" onClick={() => navigate("/student")}>Back to dashboard</Button>
                </div>
            </AppFrame>
        );
    }

    const related = demoCourses.filter((item) => item.id !== course.id).slice(0, 5);

    const heroTitle = "AI Engineer Agentic Track: The Complete Agent & MCP Course";
    const heroSubtitle = "Master AI Agents in 30 days by building 8 real-world projects using OpenAI Agents SDK, CrewAI, LangGraph, AutoGen, and MCP";

    const longDescription =
        "2026 is the era of Agentic AI. Teams are moving from single prompts to autonomous systems that can reason, plan, use tools, and execute real workflows. This course is designed to help you lead that shift with confidence.\n\nYou will not just watch demos. You will build production-ready agent systems through project-based lessons, guided labs, and deployment-style exercises. Every major concept is grounded in a practical build, so you finish with portfolio work that actually proves your skill.\n\nBy the end, you will understand how to design, orchestrate, and evaluate modern AI agent systems using leading frameworks and MCP patterns. Whether you are leveling up as a developer or transitioning your career into AI engineering, this track gives you a direct, hands-on path.";

    return (
        <AppFrame
            roleLabel="Student"
            title="Course"
            subtitle="Udemy-style course landing"
            navItems={studentNav}
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-6 min-w-0">
                    <article className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-5 md:p-6">
                        <h1 className="text-2xl md:text-4xl font-extrabold leading-tight text-foreground">{heroTitle}</h1>
                        <p className="mt-3 text-sm md:text-lg text-muted-foreground">{heroSubtitle}</p>

                        <p className="mt-4 text-sm text-muted-foreground">
                            Created by <span className="font-semibold text-foreground">Ed Donner</span> · <span className="font-semibold text-foreground">Ligency</span>
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <span className="font-bold text-foreground">4.7</span>
                            <span className="inline-flex items-center gap-1 text-dei-amber">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                            </span>
                            <span className="text-muted-foreground">(34,000+ reviews)</span>
                            <span className="text-muted-foreground">400,000+ students</span>
                            <span className="text-muted-foreground">17 hours on-demand video</span>
                            <span className="text-muted-foreground">Intermediate to Advanced</span>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Button className="h-11 rounded-xl">Buy Now</Button>
                            <Button variant="outline" className="h-11 rounded-xl">Add to Cart</Button>
                        </div>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-2xl font-bold text-foreground">What you'll learn</h2>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {learnProjects.map((item) => (
                                <div key={item} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-bold text-foreground">Course content</h2>
                            <p className="text-sm text-muted-foreground">6 sections · 130+ lectures · ~17 hours</p>
                        </div>

                        <div className="mt-4 rounded-xl border border-border">
                            <Accordion type="multiple" className="px-4">
                                {course.curriculum.map((week, weekIndex) => (
                                    <AccordionItem value={week.week} key={week.week}>
                                        <AccordionTrigger className="text-left text-base font-bold">{week.week}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2 pb-2">
                                                {week.lectures.map((lecture, lectureIndex) => (
                                                    <button
                                                        key={lecture.title}
                                                        onClick={() => navigate(`/student/course/${course.id}/learn/${weekIndex}/${lectureIndex}`)}
                                                        className="w-full flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40 text-left"
                                                    >
                                                        <p className="text-sm text-foreground pr-4">{lecture.title}</p>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {lecture.preview ? "Preview" : "Watch"} · {lecture.duration}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Requirements</h2>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {requirements.map((item) => (
                                <li key={item}>• {item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Description</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{longDescription}</p>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Who this course is for</h2>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {audience.map((item) => (
                                <li key={item}>• {item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Instructors</h2>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border p-4">
                                <div className="flex items-center gap-3">
                                    <img className="h-12 w-12 rounded-full object-cover" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80" alt="Ed Donner" />
                                    <div>
                                        <p className="font-semibold text-foreground">Ed Donner</p>
                                        <p className="text-xs text-muted-foreground">AI startup founder · ex-JPMorgan tech leader</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border p-4">
                                <div className="flex items-center gap-3">
                                    <img className="h-12 w-12 rounded-full object-cover" src="https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=300&q=80" alt="Ligency" />
                                    <div>
                                        <p className="font-semibold text-foreground">Ligency</p>
                                        <p className="text-xs text-muted-foreground">AI education platform with millions of learners</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Reviews</h2>
                        <div className="mt-4 grid gap-3">
                            {reviews.map((review) => (
                                <div key={review.name + review.text} className="rounded-xl border border-border p-4">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">{review.name}</p>
                                        <span className="inline-flex items-center gap-1 text-dei-amber">
                                            {[0, 1, 2, 3, 4].map((i) => (
                                                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-current" : ""}`} />
                                            ))}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="dei-card p-5 md:p-6">
                        <h2 className="text-xl font-bold text-foreground">Related courses</h2>
                        <div className="mt-4 -mx-1 overflow-x-auto pb-1">
                            <div className="flex min-w-max gap-3 px-1">
                                {related.map((item) => (
                                    <button key={item.id} onClick={() => navigate(`/student/course/${item.id}`)} className="w-[220px] overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:shadow-md">
                                        <div className="aspect-[16/9]">
                                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="p-3">
                                            <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{item.rating} · {item.totalHours}</p>
                                            <p className="mt-2 text-base font-bold text-foreground">{item.price}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </article>
                </section>

                <aside className="xl:sticky xl:top-24 self-start space-y-4">
                    <article className="dei-card overflow-hidden">
                        <div className="relative aspect-[16/9]">
                            <img src={course.image} alt={heroTitle} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <motion.div whileHover={{ scale: 1.06 }} className="rounded-full bg-white/90 p-3">
                                    <PlayCircle className="h-8 w-8 text-foreground" />
                                </motion.div>
                            </div>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-extrabold text-foreground">INR 799</p>
                                <p className="pb-1 text-sm text-muted-foreground line-through">INR 2,999</p>
                            </div>

                            <Button className="h-11 w-full rounded-xl">Buy Now</Button>
                            <Button variant="outline" className="h-11 w-full rounded-xl">Add to Cart</Button>

                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="ghost" className="rounded-xl border border-border"><Heart className="mr-2 h-4 w-4" />Wishlist</Button>
                                <Button variant="ghost" className="rounded-xl border border-border"><Share2 className="mr-2 h-4 w-4" />Share</Button>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Course progress</span>
                                    <span>42%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[42%] rounded-full bg-primary" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl bg-dei-sky/10 px-3 py-2 text-sm text-dei-sky">
                                <Award className="h-4 w-4" />
                                Certificate of completion included
                            </div>

                            <div className="space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                                <p>17 hours on-demand video</p>
                                <p>6 sections · 130+ lectures</p>
                                <p>Intermediate to Advanced</p>
                                <p>Updated March 2026</p>
                            </div>
                        </div>
                    </article>
                </aside>
            </div>
        </AppFrame>
    );
}

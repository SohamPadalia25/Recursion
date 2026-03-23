import { Clock3, Flame, Info, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { demoCourses } from "@/data/udemyDemoCourses";
import { studentNav } from "../roleNav";

const courses = [
    {
        title: "How to Create an Online Course: The Official Udemy Course",
        instructor: "Udemy Instructor Team",
    },
    {
        title: "Full-Stack Web Development Bootcamp",
        instructor: "Recursion Labs",
    },
    {
        title: "Agentic AI with MCP",
        instructor: "AI Guild",
    },
];

const learningTabs = ["All courses", "My Lists", "Wishlist", "Archived", "Learning tools"];

export default function StudentCoursesPage() {
    const navigate = useNavigate();

    return (
        <AppFrame
            roleLabel="Student"
            title="My learning"
            subtitle=""
            title="My learning"
            subtitle=""
            navItems={studentNav}
        >
            <section className="border-b border-border">
                <div className="flex gap-6 overflow-x-auto pb-3">
                    {learningTabs.map((tab, i) => (
                        <button
                            key={tab}
                            className={`whitespace-nowrap pb-2 text-sm transition-colors ${
                                i === 0
                                    ? "border-b-2 border-foreground font-semibold text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            type="button"
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </section>

            <div className="mt-6 space-y-5">
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr_1fr] lg:items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Start a weekly streak</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Let&apos;s chip away at your learning goals.</p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                            <Flame className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-semibold leading-none text-foreground">
                                    0 <span className="text-base font-medium text-muted-foreground">weeks</span>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">Current streak</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                            <div className="relative h-14 w-14 rounded-full border-[7px] border-muted">
                                <div className="absolute inset-[6px] rounded-full border-4 border-emerald-500" />
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-foreground">0/30 course min</p>
                                <p className="text-foreground">1/1 visit</p>
                                <p className="text-muted-foreground">Mar 23 - 30</p>
                            </div>
                            <Info className="ml-auto h-4 w-4 text-muted-foreground" />
            <section className="border-b border-border">
                <div className="flex gap-6 overflow-x-auto pb-3">
                    {learningTabs.map((tab, i) => (
                        <button
                            key={tab}
                            className={`whitespace-nowrap pb-2 text-sm transition-colors ${
                                i === 0
                                    ? "border-b-2 border-foreground font-semibold text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            type="button"
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </section>

            <div className="mt-6 space-y-5">
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr_1fr] lg:items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Start a weekly streak</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Let&apos;s chip away at your learning goals.</p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                            <Flame className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-semibold leading-none text-foreground">
                                    0 <span className="text-base font-medium text-muted-foreground">weeks</span>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">Current streak</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                            <div className="relative h-14 w-14 rounded-full border-[7px] border-muted">
                                <div className="absolute inset-[6px] rounded-full border-4 border-emerald-500" />
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-foreground">0/30 course min</p>
                                <p className="text-foreground">1/1 visit</p>
                                <p className="text-muted-foreground">Mar 23 - 30</p>
                            </div>
                            <Info className="ml-auto h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="rounded-full border border-border p-2 text-muted-foreground">
                            <Clock3 className="h-5 w-5" />
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="rounded-full border border-border p-2 text-muted-foreground">
                            <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Schedule learning time</h3>
                            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
                                Learning a little each day adds up. Research shows that students who make learning a habit are more
                                likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    Get started
                                </button>
                                <button type="button" className="text-sm font-medium text-foreground/80 hover:text-foreground">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course, i) => (
                        <motion.article
                            key={course.title}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="max-w-sm"
                        >
                            <div className="overflow-hidden rounded-lg border border-border bg-card">
                                <div className="relative flex h-40 items-center justify-center border-b border-border bg-muted/40">
                                    <span className="text-sm text-muted-foreground">Course cover</span>
                                    <button
                                        type="button"
                                        className="absolute right-2 top-2 rounded-md bg-card/80 p-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h4 className="line-clamp-2 text-lg font-semibold text-foreground">{course.title}</h4>
                                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                                    <button
                                        type="button"
                                        className="mt-4 border-t border-border pt-3 text-xs font-medium uppercase tracking-wide text-foreground/80 hover:text-foreground"
                                    >
                                        Start course
                                    </button>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </AppFrame>
    );
}

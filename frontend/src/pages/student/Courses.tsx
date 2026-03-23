import { Clock3, Flame, Info, MoreVertical, PlayCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { demoCourses } from "@/data/udemyDemoCourses";
import { studentNav } from "../roleNav";

const learningTabs = ["All courses", "My courses"];

export default function StudentCoursesPage() {
    const navigate = useNavigate();

    return (
        <AppFrame
            roleLabel="Student"
            title="My learning"
            subtitle=""
            navItems={studentNav}
        >
            <section className="border-b border-border">
                <div className="flex gap-6 overflow-x-auto pb-3">
                    {learningTabs.map((tab, i) => (
                        <button
                            key={tab}
                            className={`whitespace-nowrap pb-2 text-sm transition-colors ${i === 0
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


                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {demoCourses.map((course, i) => (
                        <motion.article
                            key={course.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="min-w-0"
                        >
                            <div className="overflow-hidden rounded-lg border border-border bg-card">
                                <div className="relative aspect-[16/9] w-full border-b border-border bg-muted/40">
                                    <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/student/course/${course.id}`)}
                                        className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/10"
                                        aria-label="Open course details"
                                    />
                                    <span className="absolute left-2 bottom-2 rounded-md bg-card/85 px-2 py-1 text-[11px] text-foreground">
                                        {course.rating} ★ · {course.totalHours}
                                    </span>
                                    <button
                                        type="button"
                                        className="absolute right-2 top-2 rounded-md bg-card/80 p-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <button type="button" onClick={() => navigate(`/student/course/${course.id}`)} className="text-left">
                                        <h4 className="line-clamp-2 text-base font-semibold text-foreground hover:underline">{course.title}</h4>
                                    </button>
                                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Star className="h-3.5 w-3.5 fill-dei-amber text-dei-amber" />
                                        <span>{course.rating}</span>
                                        <span>({course.reviews})</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">{course.price}</div>
                                    <div className="mt-3 flex gap-2 border-t border-border pt-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 rounded-lg px-3 text-xs"
                                            onClick={() => navigate(`/student/course/${course.id}/learn/0/0`)}
                                        >
                                            <PlayCircle className="mr-1 h-3.5 w-3.5" /> Start course
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg px-3 text-xs"
                                            onClick={() => navigate(`/student/course/${course.id}`)}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </AppFrame>
    );
}

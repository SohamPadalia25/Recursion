import { Clock3, Star } from "lucide-react";
import { motion } from "framer-motion";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

const courses = [
    { title: "Full-Stack Web Development", progress: 68, lessons: 42, rating: 4.8, time: "7h left" },
    { title: "Agentic AI with MCP", progress: 34, lessons: 26, rating: 4.7, time: "11h left" },
    { title: "Prompt Engineering Pro", progress: 86, lessons: 18, rating: 4.9, time: "3h left" },
];

export default function StudentCoursesPage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="My Courses"
            subtitle="Track every course with clear progress, pace, and outcomes."
            navItems={studentNav}
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course, i) => (
                    <motion.article
                        key={course.title}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ y: -4 }}
                        className="dei-card p-5"
                    >
                        <h2 className="text-base font-semibold text-foreground">{course.title}</h2>
                        <div className="mt-3 h-2 rounded-full bg-muted">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${course.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                                className="h-2 rounded-full bg-primary"
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{course.progress}% complete</span>
                            <span>{course.lessons} lessons</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-dei-amber"><Star className="h-4 w-4 fill-current" /> {course.rating}</span>
                            <span className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" /> {course.time}</span>
                        </div>
                    </motion.article>
                ))}
            </div>
        </AppFrame>
    );
}

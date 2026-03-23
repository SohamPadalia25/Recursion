import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { demoCourseSections, getCourseById, getSectionCourses } from "@/data/udemyDemoCourses";

export function TrendingCourses() {
    const navigate = useNavigate();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const selectedCourse = useMemo(() => {
        if (!selectedCourseId) return null;
        return getCourseById(selectedCourseId) ?? null;
    }, [selectedCourseId]);

    const onCourseClick = (courseId: string) => {
        if (selectedCourseId === courseId) {
            navigate(`/student/course/${courseId}`);
            return;
        }
        setSelectedCourseId(courseId);
    };

    return (
        <section className="space-y-5">
            {demoCourseSections.map((section, sectionIndex) => {
                const sectionCourses = getSectionCourses(section);

                return (
                    <div key={section.id} className="dei-card p-3 md:p-3.5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base md:text-lg font-bold text-foreground">{section.title}</h2>
                                <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-xl text-xs whitespace-nowrap h-8 px-2.5">
                                Explore all <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                            {sectionCourses.map((course, index) => {
                                const isSelected = selectedCourseId === course.id;

                                return (
                                    <motion.article
                                        key={course.id}
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ duration: 0.35, delay: sectionIndex * 0.04 + index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                                        whileHover={{ y: -3 }}
                                        className="min-w-0 cursor-pointer"
                                        onClick={() => onCourseClick(course.id)}
                                    >
                                        <div className={`overflow-hidden rounded-xl border bg-card transition-all duration-200 ${isSelected ? "border-primary shadow-md" : "border-border/70 shadow-sm hover:shadow-md"}`}>
                                            <div className="relative aspect-[16/9] bg-muted">
                                                <img src={course.image} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
                                            </div>

                                            <div className="space-y-1 p-2.5">
                                                <h3 className="line-clamp-2 text-[0.82rem] md:text-[0.88rem] font-bold leading-snug text-foreground">{course.title}</h3>
                                                <p className="line-clamp-1 text-xs text-muted-foreground">{course.instructor}, {course.instructorSubtitle}</p>

                                                <div className="flex items-center gap-1 text-[0.75rem] md:text-xs">
                                                    <span className="font-semibold text-foreground">{course.rating}</span>
                                                    <div className="flex items-center gap-0.5 text-dei-amber">
                                                        {[0, 1, 2, 3, 4].map((star) => (
                                                            <Star key={`${course.id}-${star}`} className="h-2.5 w-2.5 fill-current" />
                                                        ))}
                                                    </div>
                                                    <span className="text-muted-foreground">({course.reviews})</span>
                                                </div>

                                                <div className="flex items-end gap-1.5">
                                                    <span className="text-base md:text-lg leading-none font-bold text-foreground">{course.price.replace("INR ", "")}</span>
                                                    {course.oldPrice && <span className="text-xs text-muted-foreground line-through pb-0.5">{course.oldPrice.replace("INR ", "")}</span>}
                                                </div>

                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {course.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tag === "Premium"
                                                                ? "bg-dei-lavender/15 text-dei-lavender"
                                                                : "bg-dei-sky/15 text-dei-sky"
                                                                }`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {selectedCourse && (
                <motion.aside
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="dei-card p-5 md:p-6"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h3 className="text-2xl font-bold text-foreground leading-tight">{selectedCourse.title}</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="rounded-md bg-dei-sky/15 px-2 py-1 text-dei-sky font-semibold">Bestseller</span>
                                <span>Updated {selectedCourse.updatedAt}</span>
                                <span>{selectedCourse.totalHours}</span>
                                <span>{selectedCourse.level}</span>
                            </div>
                            <p className="mt-4 text-base text-muted-foreground">{selectedCourse.description}</p>
                        </div>

                        <div>
                            <ul className="space-y-2">
                                {selectedCourse.previewPoints.map((point) => (
                                    <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Check className="mt-0.5 h-4 w-4 text-dei-sage" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <Button onClick={() => navigate(`/student/course/${selectedCourse.id}`)} className="rounded-xl">
                                    Go to course page
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedCourseId(null)} className="rounded-xl">
                                    Close preview
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">Tip: click the same course card again to open full course page directly.</p>
                </motion.aside>
            )}
        </section>
    );
}
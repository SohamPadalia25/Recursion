import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlayCircle, Star } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCourseById } from "@/data/udemyDemoCourses";
import { studentNav } from "../roleNav";

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

  return (
    <AppFrame
      roleLabel="Student"
      title={course.title}
      subtitle={`${course.instructor} · ${course.rating} stars · ${course.students} learners`}
      navItems={studentNav}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <article className="dei-card p-5">
            <h2 className="text-4xl font-extrabold leading-tight text-foreground">{course.title}</h2>
            <p className="mt-3 text-base text-muted-foreground">{course.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {course.topics.map((topic) => (
                <span key={topic} className="rounded-xl border border-border bg-card px-3 py-1 text-sm font-semibold text-foreground">
                  {topic}
                </span>
              ))}
            </div>
          </article>

          <article className="dei-card p-5">
            <h3 className="text-3xl font-bold text-foreground">Course content</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {course.curriculum.length} weeks · {course.totalHours} total length · {course.level}
            </p>

            <div className="mt-4 rounded-xl border border-border">
              <Accordion type="multiple" className="px-4">
                {course.curriculum.map((week) => (
                  <AccordionItem value={week.week} key={week.week}>
                    <AccordionTrigger className="text-left text-lg font-bold">{week.week}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pb-2">
                        {week.lectures.map((lecture) => (
                          <div key={lecture.title} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40">
                            <div className="min-w-0 pr-3">
                              <p className="line-clamp-1 text-base text-foreground">{lecture.title}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {lecture.preview && <span className="text-primary underline">Preview</span>}
                              <span>{lecture.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </article>
        </section>

        <aside className="xl:sticky xl:top-24 self-start dei-card overflow-hidden">
          <div className="relative aspect-[16/9]">
            <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-white/90 p-3">
                <PlayCircle className="h-7 w-7 text-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-foreground">{course.rating}</span>
              <Star className="h-4 w-4 fill-dei-amber text-dei-amber" />
              <span className="text-muted-foreground">({course.reviews} ratings)</span>
            </div>

            <div className="flex items-end gap-2">
              <p className="text-3xl font-extrabold text-foreground">{course.price}</p>
              {course.oldPrice && <p className="pb-1 text-sm text-muted-foreground line-through">{course.oldPrice}</p>}
            </div>

            <Button className="h-11 w-full rounded-xl">Add to cart</Button>
            <Button variant="outline" className="h-11 w-full rounded-xl">Buy now</Button>

            <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <p>Updated {course.updatedAt}</p>
              <p>{course.totalHours} on-demand video</p>
              <p>{course.subtitles} subtitles</p>
              <p>Full lifetime access</p>
            </div>
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

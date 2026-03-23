import { useEffect, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { getAdminCourses, getAdminStats } from "@/lib/course-api";

export default function AdminMonetizationPage() {
    const [cards, setCards] = useState([
        { label: "Total Enrollments", value: "0" },
        { label: "Published Courses", value: "0" },
        { label: "Avg Enrollments/Course", value: "0" },
    ]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [stats, courses] = await Promise.all([
                    getAdminStats(),
                    getAdminCourses({ page: 1, limit: 200 }),
                ]);

                if (!mounted) return;

                const totalEnrollments = stats.totalEnrollments || 0;
                const publishedCourses = stats.publishedCourses || 0;
                const avgEnrollmentsPerCourse = courses.length
                    ? Math.round(totalEnrollments / courses.length)
                    : 0;

                setCards([
                    { label: "Total Enrollments", value: totalEnrollments.toLocaleString() },
                    { label: "Published Courses", value: publishedCourses.toLocaleString() },
                    { label: "Avg Enrollments/Course", value: avgEnrollmentsPerCourse.toLocaleString() },
                ]);
            } catch {
                // Keep fallback card values on load failure.
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <AppFrame
            roleLabel="Admin"
            title="Monetization"
            subtitle="Track subscriptions, revenue momentum, and plan performance."
            navItems={adminNav}
        >
            <div className="grid gap-4 md:grid-cols-3">
                {cards.map((item) => (
                    <article key={item.label} className="dei-card p-5">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
                    </article>
                ))}
            </div>
        </AppFrame>
    );
}

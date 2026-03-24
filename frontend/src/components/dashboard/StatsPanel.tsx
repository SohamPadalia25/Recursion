import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { getMyEnrollments, type Enrollment } from "@/lib/course-api";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function StatsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getMyEnrollments();
        if (!mounted) return;
        setEnrollments(data || []);
      } catch {
        if (!mounted) return;
        setEnrollments([]);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalCourses = enrollments.length;
    const completed = enrollments.filter((item) => item.isCompleted).length;
    const upcoming = Math.max(0, totalCourses - completed);

    return [
      {
        label: "Enrolled Courses",
        value: totalCourses,
        icon: BookOpen,
        gradient: "dei-gradient-sky",
        color: "text-dei-sky",
      },
      {
        label: "Completed",
        value: completed,
        icon: CheckCircle2,
        gradient: "dei-gradient-sage",
        color: "text-dei-sage",
      },
      {
        label: "In Progress",
        value: upcoming,
        icon: Clock,
        gradient: "dei-gradient-amber",
        color: "text-dei-amber",
      },
    ];
  }, [enrollments]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={item}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="dei-card p-5 flex items-center gap-4 cursor-default"
        >
          <div className={`w-12 h-12 rounded-2xl ${stat.gradient} flex items-center justify-center`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

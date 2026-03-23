import { motion } from "framer-motion";
import { Video, BookOpenCheck, ClipboardList, ArrowRight } from "lucide-react";

interface Event {
  id: number;
  type: "webinar" | "lesson" | "task";
  title: string;
  time: string;
  description: string;
}

const events: Event[] = [
  { id: 1, type: "webinar", title: "AI Ethics Discussion", time: "Today, 2:00 PM", description: "Join Dr. Mehra for a live session on responsible AI" },
  { id: 2, type: "lesson", title: "Backpropagation Lab", time: "Today, 4:30 PM", description: "Hands-on neural network training exercise" },
  { id: 3, type: "task", title: "Quiz: Regression Models", time: "Tomorrow, 10:00 AM", description: "15 questions, 20 minutes — test your knowledge" },
  { id: 4, type: "webinar", title: "Industry Panel: ML Careers", time: "Mar 25, 6:00 PM", description: "Panelists from OpenAI, DeepMind, and Anthropic" },
];

const typeConfig = {
  webinar: { icon: Video, gradient: "dei-gradient-sky", color: "text-dei-sky", label: "Webinar" },
  lesson: { icon: BookOpenCheck, gradient: "dei-gradient-lavender", color: "text-dei-lavender", label: "Lesson" },
  task: { icon: ClipboardList, gradient: "dei-gradient-sage", color: "text-dei-sage", label: "Task" },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const item = {
  hidden: { opacity: 0, x: 16, filter: "blur(4px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function EventsPanel() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          View all
        </button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {events.map((event) => {
          const config = typeConfig[event.type];
          return (
            <motion.div
              key={event.id}
              variants={item}
              whileHover={{ x: -2, transition: { duration: 0.2 } }}
              className="dei-card p-4 group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                  <config.icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.time}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

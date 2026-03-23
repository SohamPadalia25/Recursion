import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

const lineData = [
    { day: "Mon", xp: 30 },
    { day: "Tue", xp: 50 },
    { day: "Wed", xp: 45 },
    { day: "Thu", xp: 72 },
    { day: "Fri", xp: 60 },
    { day: "Sat", xp: 88 },
    { day: "Sun", xp: 95 },
];

const barData = [
    { topic: "React", score: 82 },
    { topic: "Node", score: 76 },
    { topic: "DSA", score: 69 },
    { topic: "AI", score: 91 },
];

export default function StudentProgressPage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Progress Tracking"
            subtitle="Visualize XP growth, topic mastery, and consistency streaks."
            navItems={studentNav}
        >
            <div className="mb-6 dei-card p-5">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Level 3</p>
                    <p className="text-sm font-semibold text-foreground">240 / 500 XP</p>
                </div>
                <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 w-[48%] rounded-full bg-primary" />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Learning Over Time</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="xp" stroke="hsl(16 80% 68%)" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Topic Mastery</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                                <XAxis dataKey="topic" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="score" fill="hsl(210 70% 65%)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>
        </AppFrame>
    );
}

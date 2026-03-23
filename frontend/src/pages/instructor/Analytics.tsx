import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const data = [
    { month: "Jan", engagement: 42 },
    { month: "Feb", engagement: 51 },
    { month: "Mar", engagement: 57 },
    { month: "Apr", engagement: 66 },
    { month: "May", engagement: 61 },
    { month: "Jun", engagement: 74 },
];

export default function InstructorAnalyticsPage() {
    return (
        <AppFrame
            roleLabel="Instructor"
            title="Teaching Analytics"
            subtitle="Track completion, engagement, and cohort performance trends."
            navItems={instructorNav}
        >
            <section className="dei-card p-5">
                <h2 className="mb-3 text-base font-semibold">Student Engagement</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="engagement-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(152 35% 55%)" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="hsl(152 35% 55%)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="engagement" stroke="hsl(152 35% 55%)" fill="url(#engagement-grad)" strokeWidth={2.5} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </AppFrame>
    );
}

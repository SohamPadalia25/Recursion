import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const analytics = [
    { month: "Jan", users: 2400 },
    { month: "Feb", users: 3100 },
    { month: "Mar", users: 4300 },
    { month: "Apr", users: 5900 },
    { month: "May", users: 7600 },
    { month: "Jun", users: 9800 },
];

export default function AdminAnalyticsPage() {
    return (
        <AppFrame
            roleLabel="Admin"
            title="Platform Analytics"
            subtitle="Monitor growth trends and system health in one place."
            navItems={adminNav}
        >
            <section className="dei-card p-5">
                <h2 className="mb-3 text-base font-semibold">Monthly Active Users</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="users" stroke="hsl(265 45% 68%)" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </AppFrame>
    );
}

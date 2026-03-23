import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";

export default function AdminMonetizationPage() {
    return (
        <AppFrame
            roleLabel="Admin"
            title="Monetization"
            subtitle="Track subscriptions, revenue momentum, and plan performance."
            navItems={adminNav}
        >
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { label: "Monthly Revenue", value: "INR 4.2L" },
                    { label: "Pro Subscribers", value: "2,184" },
                    { label: "Conversion Rate", value: "8.6%" },
                ].map((item) => (
                    <article key={item.label} className="dei-card p-5">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
                    </article>
                ))}
            </div>
        </AppFrame>
    );
}

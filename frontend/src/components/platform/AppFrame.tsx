import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { InstructorSidebar } from "@/components/dashboard/InstructorSidebar";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";

type NavItem = {
    label: string;
    to: string;
};

type AppFrameProps = {
    roleLabel: string;
    title: string;
    subtitle: string;
    navItems: NavItem[];
    children: ReactNode;
};

export function AppFrame({ roleLabel, title, subtitle, navItems: _navItems, children }: AppFrameProps) {
    const role = roleLabel.toLowerCase();

    return (
        <div className="flex min-h-screen bg-background">
            {role === "student" && <AppSidebar />}
            {role === "instructor" && <InstructorSidebar />}
            {role === "admin" && <AdminSidebar />}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-10 border-b border-border/60 bg-card">
                    <div className="flex items-center justify-between px-4 py-3 md:px-6">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {roleLabel}
                        </span>

                        <div className="flex items-center gap-2">
                            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted">
                                <Bell className="h-4 w-4" />
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-dei-peach" />
                            </button>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-dei-peach to-dei-rose text-xs font-bold text-primary-foreground">
                                AI
                            </div>
                        </div>
                    </div>
                </header>

                <main className="min-w-0 px-4 py-6 md:px-6 md:py-8">
                    <motion.section
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-6"
                    >
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
                        <p className="mt-1 text-sm text-muted-foreground md:text-base">{subtitle}</p>
                    </motion.section>

                    {children}
                </main>
            </div>
        </div>
    );
}

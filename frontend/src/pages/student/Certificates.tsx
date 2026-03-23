import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

export default function StudentCertificatesPage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Certificates"
            subtitle="Showcase verified accomplishments and export polished credentials."
            navItems={studentNav}
        >
            <section className="mx-auto max-w-4xl dei-card p-5 md:p-8">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-dei-sky/10 to-dei-peach/10 p-6 md:p-8">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Certificate of Completion</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">Full-Stack Web Development</h2>
                    <p className="mt-4 text-sm text-muted-foreground">Awarded to</p>
                    <p className="text-xl font-semibold text-foreground">Arjun Kapoor</p>
                    <p className="mt-4 text-sm text-muted-foreground">Issued: November 2025</p>
                    <Button className="mt-6 rounded-xl">
                        <Download className="mr-2 h-4 w-4" /> Download Certificate
                    </Button>
                </div>
            </section>
        </AppFrame>
    );
}

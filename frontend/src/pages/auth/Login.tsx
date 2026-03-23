import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getHomePathByRole, useAuth } from "@/auth/AuthContext";

export default function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user) {
            navigate(getHomePathByRole(user.role), { replace: true });
        }
    }, [user, navigate]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login({ email: email.trim(), password });

            const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
            navigate(target || "/student", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background px-4 py-10">
            <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-2">
                <div className="hidden bg-gradient-to-br from-dei-peach/20 via-dei-sky/10 to-dei-lavender/20 p-8 lg:block">
                    <h1 className="text-3xl font-extrabold text-foreground">Welcome Back</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Continue your AI-powered learning flow.</p>
                </div>

                <motion.form
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    onSubmit={onSubmit}
                    className="space-y-4 p-6 md:p-8"
                >
                    <h2 className="text-2xl font-bold text-foreground">Log in</h2>
                    <p className="text-sm text-muted-foreground">Use your backend account credentials.</p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                            required
                        />
                    </div>

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                        {submitting ? "Signing in..." : "Continue"}
                    </Button>

                    <p className="text-sm text-muted-foreground">
                        New here? <Link className="font-semibold text-primary hover:underline" to="/signup">Create account</Link>
                    </p>
                </motion.form>
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getHomePathByRole, useAuth } from "@/auth/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
        navigate(target || getHomePathByRole(user.role), { replace: true });
    }, [user, navigate, location.state]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const trimmedUsername = username.trim();
            const trimmedEmail = email.trim();
            if (!trimmedUsername && !trimmedEmail) {
                setError("Please enter your username or email.");
                return;
            }
            await login({
                username: trimmedUsername ? trimmedUsername : undefined,
                email: trimmedEmail ? trimmedEmail : undefined,
                password,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
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
                    <p className="text-sm text-muted-foreground">Use your username or email to sign in.</p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Username </label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl bg-muted/50 px-3 pr-12 outline-none ring-primary/30 transition-all focus:ring-2"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" className="h-11 w-full rounded-xl">Continue</Button>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <p className="text-sm text-muted-foreground">
                        New here? <Link className="font-semibold text-primary hover:underline" to="/signup">Create account</Link>
                    </p>
                </motion.form>
            </div>
        </div>
    );
}

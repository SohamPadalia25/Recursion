import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getHomePathByRole, type UserRole, useAuth } from "@/auth/AuthContext";

export default function SignupPage() {
    const { signup, user } = useAuth();
    const navigate = useNavigate();
    const [fullname, setFullname] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("student");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            navigate(getHomePathByRole(user.role), { replace: true });
        }
    }, [user, navigate]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await signup({
                fullname: fullname.trim(),
                username: username.trim(),
                email: email.trim(),
                password,
                role,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        }
    };

    return (
        <div className="min-h-screen bg-background px-4 py-10">
            <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-2">
                <div className="hidden bg-gradient-to-br from-dei-sage/20 via-dei-sky/10 to-dei-peach/20 p-8 lg:block">
                    <h1 className="text-3xl font-extrabold text-foreground">Create Account</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Set your role and start with the right tools.</p>
                </div>

                <motion.form
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    onSubmit={onSubmit}
                    className="space-y-4 p-6 md:p-8"
                >
                    <h2 className="text-2xl font-bold text-foreground">Sign up</h2>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full name</label>
                        <input
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

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
                            required
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="h-11 w-full rounded-xl bg-muted/50 px-3 outline-none ring-primary/30 transition-all focus:ring-2"
                        >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <Button type="submit" className="h-11 w-full rounded-xl">Create account</Button>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <p className="text-sm text-muted-foreground">
                        Already have an account? <Link className="font-semibold text-primary hover:underline" to="/login">Log in</Link>
                    </p>
                </motion.form>
            </div>
        </div>
    );
}

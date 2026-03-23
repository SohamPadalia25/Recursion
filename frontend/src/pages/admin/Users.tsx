import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";

const users = [
    { name: "Ananya Patel", email: "ananya@email.com", role: "Student", status: "Active" },
    { name: "Rahul Verma", email: "rahul@email.com", role: "Instructor", status: "Pending" },
    { name: "Lisa Wong", email: "lisa@email.com", role: "Instructor", status: "Active" },
];

export default function AdminUsersPage() {
    return (
        <AppFrame
            roleLabel="Admin"
            title="User Management"
            subtitle="Search, filter, and manage user access across the platform."
            navItems={adminNav}
        >
            <section className="dei-card p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                    <input className="h-10 flex-1 rounded-xl bg-muted/40 px-3 outline-none ring-primary/30 focus:ring-2" placeholder="Search name or email" />
                    <select className="h-10 rounded-xl bg-muted/40 px-3 text-sm outline-none ring-primary/30 focus:ring-2">
                        <option>All roles</option>
                        <option>Student</option>
                        <option>Instructor</option>
                        <option>Admin</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="pb-3">Name</th>
                                <th className="pb-3">Email</th>
                                <th className="pb-3">Role</th>
                                <th className="pb-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.email} className="border-b border-border/40">
                                    <td className="py-3 font-medium text-foreground">{user.name}</td>
                                    <td className="py-3 text-muted-foreground">{user.email}</td>
                                    <td className="py-3">{user.role}</td>
                                    <td className="py-3">{user.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppFrame>
    );
}

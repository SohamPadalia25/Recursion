import { AppFrame } from "@/components/platform/AppFrame";
import { CodeEditor } from "@/components/CodeEditor";
import { studentNav } from "../roleNav";
import { useState } from "react";

const tools = [
    { title: "Code Editor", desc: "Practice coding with structured prompts and instant checks." },
    { title: "Whiteboard", desc: "Visualize system design and algorithm flows quickly." },
    { title: "Video Call", desc: "Join guided mentor sessions with collaboration tools." },
];

export default function StudentToolsPage() {
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");

    return (
        <AppFrame
            roleLabel="Student"
            title="Learning Tools"
            subtitle="Use focused tools for coding, collaboration, and visual learning."
            navItems={studentNav}
        >
            <div className="space-y-6">
                {/* Code Editor Section */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Code Editor</h2>
                        <p className="text-muted-foreground">Write, execute, and practice code in real-time</p>
                    </div>

                    <div className="flex gap-2 mb-4">
                        {["javascript", "python", "html", "css"].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setSelectedLanguage(lang)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    selectedLanguage === lang
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground hover:bg-accent"
                                }`}
                            >
                                {lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </button>
                        ))}
                    </div>

                    <CodeEditor
                        language={selectedLanguage}
                        theme="monokai"
                        initialCode={
                            selectedLanguage === "python"
                                ? 'def hello():\n    print("Hello, World!")\n\nhello()'
                                : selectedLanguage === "html"
                                  ? '<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>'
                                  : selectedLanguage === "css"
                                    ? 'body {\n  font-family: Arial, sans-serif;\n  background-color: #f5f5f5;\n}\n\nh1 {\n  color: #333;\n}'
                                    : 'function hello() {\n  console.log("Hello, World!");\n}\n\nhello();'
                        }
                        height="500px"
                        onCodeChange={(code) => console.log("Code updated:", code)}
                    />
                </div>

                {/* Other Tools Grid */}
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Other Tools</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {tools.slice(1).map((tool) => (
                            <article key={tool.title} className="dei-card p-5">
                                <h2 className="text-base font-semibold text-foreground">{tool.title}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>
                                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-8 text-center text-xs text-muted-foreground">
                                    Coming Soon
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </AppFrame>
    );
}

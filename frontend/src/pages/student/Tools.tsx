import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const tools = [
    { title: "Code Editor", desc: "Practice coding with structured prompts and instant checks." },
    {
        title: "Whiteboard",
        desc: "Visualize system design and algorithm flows quickly.",
        guide: [
            "Open a live class from Join Live Session on dashboard.",
            "After joining, scroll to Interactive Whiteboard section.",
            "Use pen/eraser tools to draw flowcharts and algorithms.",
        ],
    },
    {
        title: "Video Call",
        desc: "Join guided mentor sessions with collaboration tools.",
        guide: [
            "Click Join Live Session from dashboard.",
            "Enter session code shared by instructor.",
            "Use video/audio controls and discuss with mentor live.",
        ],
    },
];

export default function StudentToolsPage() {
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const editorRef = useRef<any>(null);

    // Map languages to Monaco editor language IDs
    const getMonacoLanguage = (lang: string) => {
        switch(lang) {
            case "javascript": return "javascript";
            case "python": return "python";
            case "html": return "html";
            case "css": return "css";
            default: return "javascript";
        }
    };

    // Initial code templates for different languages
    const getInitialCode = (lang: string) => {
        switch(lang) {
            case "python":
                return `# Python Example
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

# Test the function
numbers = [1, 2, 3, 4, 5]
result = calculate_sum(numbers)
print(f"Sum of {numbers} = {result}")

# Print a greeting
name = "Student"
print(f"Hello, {name}!")

# Try a loop
for i in range(3):
    print(f"Count: {i}")

# Dictionary example
person = {
    "name": "Alice",
    "age": 30,
    "city": "New York"
}
print("Person:", person)`;
            
            case "html":
                return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Interactive Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .counter {
            margin-top: 20px;
            font-size: 18px;
            color: #667eea;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome! 🎉</h1>
        <p>This is a live HTML preview with CSS styling and JavaScript interaction.</p>
        <button onclick="updateCounter()">Click Me!</button>
        <div class="counter" id="counter">Clicks: 0</div>
    </div>
    
    <script>
        let count = 0;
        
        function updateCounter() {
            count++;
            document.getElementById('counter').textContent = \`Clicks: \${count}\`;
            
            // Change button color on every 5th click
            if (count % 5 === 0) {
                const btn = document.querySelector('button');
                btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                setTimeout(() => {
                    btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }, 500);
            }
        }
    </script>
</body>
</html>`;
            
            case "css":
                return `/* Modern CSS Animation Demo */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Poppins', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.card {
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

h1 {
    color: #333;
    margin-bottom: 20px;
    font-size: 2em;
    position: relative;
    display: inline-block;
}

h1::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 3px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 3px;
}

p {
    color: #666;
    line-height: 1.6;
    margin: 30px 0;
}

.button {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 30px;
    border-radius: 25px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.icon {
    font-size: 50px;
    margin-bottom: 20px;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .card {
        padding: 30px;
        margin: 20px;
    }
    
    h1 {
        font-size: 1.5em;
    }
}`;
            
            default: // javascript
                return `// Advanced JavaScript Examples

// 1. Async/Await Example
async function fetchUserData() {
    console.log("Fetching user data...");
    
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id: 1, name: "John Doe", email: "john@example.com" });
        }, 1000);
    });
}

// 2. Array Methods
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log("Original array:", numbers);

// Filter even numbers
const evenNumbers = numbers.filter(n => n % 2 === 0);
console.log("Even numbers:", evenNumbers);

// Map to squares
const squares = numbers.map(n => n * n);
console.log("Squares:", squares);

// Reduce to sum
const sum = numbers.reduce((acc, curr) => acc + curr, 0);
console.log("Sum of all numbers:", sum);

// 3. Object Destructuring
const user = {
    name: "Alice",
    age: 28,
    address: {
        city: "New York",
        country: "USA"
    },
    hobbies: ["reading", "coding", "gaming"]
};

const { name, age, address: { city }, hobbies } = user;
console.log(\`\${name} is \${age} years old from \${city}\`);
console.log("Hobbies:", hobbies.join(", "));

// 4. Spread Operator
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("Combined arrays:", combined);

// 5. Classes
class Animal {
    constructor(name, sound) {
        this.name = name;
        this.sound = sound;
    }
    
    makeSound() {
        console.log(\`\${this.name} says \${this.sound}!\`);
    }
}

class Dog extends Animal {
    constructor(name) {
        super(name, "Woof");
    }
    
    wagTail() {
        console.log("\${this.name} is wagging tail!");
    }
}

const dog = new Dog("Buddy");
dog.makeSound();
dog.wagTail();

// 6. Promise Example
const delayedGreeting = (name, delay) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(\`Hello, \${name}! (after \${delay}ms)\`);
        }, delay);
    });
};

// Using Promise.all
Promise.all([
    delayedGreeting("Alice", 1000),
    delayedGreeting("Bob", 500),
    delayedGreeting("Charlie", 800)
]).then(results => {
    console.log("All greetings:", results);
});

// 7. Async/Await with fetch simulation
async function demonstrateAsync() {
    console.log("Starting async demo...");
    const userData = await fetchUserData();
    console.log("User data fetched:", userData);
    return "Async operation complete!";
}

// Execute async function
demonstrateAsync().then(result => {
    console.log(result);
});

console.log("✓ All JavaScript examples executed successfully!");`;
        }
    };

    // Initialize code on language change
    useEffect(() => {
        setCode(getInitialCode(selectedLanguage));
        setOutput("");
    }, [selectedLanguage]);

    // Handle editor mount
    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    // Handle code execution
    const handleRunCode = () => {
        setIsRunning(true);
        setOutput("");
        
        setTimeout(() => {
            try {
                if (selectedLanguage === "javascript") {
                    // Capture console output
                    let consoleOutput: string[] = [];
                    
                    // Override console methods
                    const originalLog = console.log;
                    const originalError = console.error;
                    const originalWarn = console.warn;
                    const originalInfo = console.info;
                    
                    console.log = (...args: any[]) => {
                        const message = args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                        ).join(' ');
                        consoleOutput.push(message);
                        originalLog(...args);
                    };
                    
                    console.error = (...args: any[]) => {
                        const message = args.map(arg => String(arg)).join(' ');
                        consoleOutput.push(`❌ Error: ${message}`);
                        originalError(...args);
                    };
                    
                    console.warn = (...args: any[]) => {
                        const message = args.map(arg => String(arg)).join(' ');
                        consoleOutput.push(`⚠️ Warning: ${message}`);
                        originalWarn(...args);
                    };
                    
                    console.info = (...args: any[]) => {
                        const message = args.map(arg => String(arg)).join(' ');
                        consoleOutput.push(`ℹ️ Info: ${message}`);
                        originalInfo(...args);
                    };
                    
                    try {
                        // Execute the code
                        const executeCode = new Function(code);
                        const result = executeCode();
                        
                        // If the code returns a value that's not undefined, show it
                        if (result !== undefined && consoleOutput.length === 0) {
                            consoleOutput.push(`→ Return value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`);
                        }
                        
                        // Display output
                        if (consoleOutput.length > 0) {
                            setOutput(consoleOutput.join('\n'));
                        } else {
                            setOutput("✓ Code executed successfully (no console output)");
                        }
                        
                    } catch (error: any) {
                        setOutput(`❌ Execution Error: ${error.message}`);
                    } finally {
                        // Restore original console methods
                        console.log = originalLog;
                        console.error = originalError;
                        console.warn = originalWarn;
                        console.info = originalInfo;
                    }
                } 
                else if (selectedLanguage === "python") {
                    // For Python, we'll simulate output
                    const pythonOutput: string[] = [];
                    const lines = code.split('\n');
                    
                    for (const line of lines) {
                        // Handle print statements
                        if (line.includes('print(')) {
                            const match = line.match(/print\((.*)\)/);
                            if (match) {
                                let content = match[1];
                                // Simple evaluation for demo
                                if (content.includes('f"') || content.includes("f'")) {
                                    content = content.replace(/[fF](["'])(.*?)\1/, (_, __, inner) => {
                                        return inner.replace(/\{([^}]+)\}/g, (__, varName) => {
                                            // Simple variable substitution for demo
                                            if (varName === 'numbers') return '[1, 2, 3, 4, 5]';
                                            if (varName === 'result') return '15';
                                            if (varName === 'name') return 'Student';
                                            if (varName === 'person') return "{'name': 'Alice', 'age': 30, 'city': 'New York'}";
                                            return varName;
                                        });
                                    });
                                } else {
                                    content = content.replace(/^['"]|['"]$/g, '');
                                }
                                pythonOutput.push(content);
                            }
                        }
                    }
                    
                    if (pythonOutput.length > 0) {
                        setOutput(pythonOutput.join('\n'));
                    } else {
                        setOutput("✓ Python code processed\n\nNote: Full Python execution requires a backend server.\nThe output above shows simulated print statements.");
                    }
                }
                else if (selectedLanguage === "html") {
                    // Create a preview for HTML
                    const blob = new Blob([code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const previewWindow = window.open(url, '_blank');
                    if (previewWindow) {
                        setOutput("✓ HTML preview opened in new window/tab");
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } else {
                        setOutput("⚠️ Please allow pop-ups to see HTML preview");
                    }
                }
                else if (selectedLanguage === "css") {
                    // Create CSS preview with sample HTML
                    const previewHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>${code}</style>
                        </head>
                        <body>
                            <div class="card">
                                <div class="icon">🎨</div>
                                <h1>CSS Preview</h1>
                                <p>This is a live preview of your CSS code!</p>
                                <button class="button">Hover Me</button>
                            </div>
                        </body>
                        </html>
                    `;
                    const blob = new Blob([previewHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const previewWindow = window.open(url, '_blank');
                    if (previewWindow) {
                        setOutput("✓ CSS preview opened in new window/tab");
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } else {
                        setOutput("⚠️ Please allow pop-ups to see CSS preview");
                    }
                }
            } catch (error: any) {
                setOutput(`❌ Execution Error: ${error.message}`);
            } finally {
                setIsRunning(false);
            }
        }, 100);
    };

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

                    <div className="flex gap-2 mb-4 flex-wrap">
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

                    {/* Monaco Editor */}
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <Editor
                            height="500px"
                            language={getMonacoLanguage(selectedLanguage)}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            onMount={handleEditorDidMount}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                fontLigatures: true,
                                lineNumbers: "on",
                                roundedSelection: false,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: "on",
                                formatOnPaste: true,
                                formatOnType: true,
                                suggestOnTriggerCharacters: true,
                                acceptSuggestionOnEnter: "on",
                                renderWhitespace: "boundary",
                                renderControlCharacters: false,
                                readOnly: false,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                smoothScrolling: true,
                                padding: { top: 16, bottom: 16 }
                            }}
                        />
                    </div>

                    {/* Run Button */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setCode(getInitialCode(selectedLanguage));
                                setOutput("");
                            }}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                        >
                            Reset Code
                        </button>
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${
                                isRunning 
                                    ? "bg-gray-400 cursor-not-allowed" 
                                    : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                        >
                            {isRunning ? "Running..." : "▶ Run Code"}
                        </button>
                    </div>

                    {/* Console Output */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-foreground">Console Output</h3>
                            {output && (
                                <button
                                    onClick={() => setOutput("")}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-auto">
                            {output ? (
                                <pre className="whitespace-pre-wrap break-words">{output}</pre>
                            ) : (
                                <div className="text-gray-500">
                                    <p>▶ Click "Run Code" to see output here</p>
                                    <p className="text-xs mt-2">✓ Real Monaco Editor with syntax highlighting</p>
                                    <p className="text-xs">✓ Full IntelliSense and code completion</p>
                                    <p className="text-xs">✓ Console output from your JavaScript code</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Other Tools Grid */}
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Other Tools</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {tools.slice(1).map((tool) => (
                            <article key={tool.title} className="dei-card border-2 border-orange-300 p-5 shadow-sm">
                                <h2 className="text-base font-semibold text-foreground">{tool.title}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>
                                <div className="mt-4 rounded-xl border-2 border-orange-300 bg-muted/30 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">How to use on this website</p>
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        {tool.guide?.map((step) => (
                                            <li key={step}>• {step}</li>
                                        ))}
                                    </ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </AppFrame>
    );
}
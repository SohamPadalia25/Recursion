import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Download, RotateCcw, Play, Trash2, ChevronDown } from "lucide-react";

let aceLoaded = false;
let acePromise: any = null;

const loadAce = async () => {
  if (aceLoaded) return;
  if (acePromise) return acePromise;

  acePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.0/ace.min.js";
    script.async = true;
    script.onload = () => {
      aceLoaded = true;
      resolve((window as any).ace);
    };
    script.onerror = () => reject(new Error("Failed to load ACE editor"));
    document.head.appendChild(script);
  });

  return acePromise;
};

interface ConsoleLog {
  id: string;
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: Date;
}

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
  height?: string;
}

export function CodeEditor({
  initialCode = 'function hello() {\n  console.log("Hello, World!");\n}\n\nhello();',
  language = "javascript",
  theme = "monokai",
  readOnly = false,
  onCodeChange,
  height = "400px",
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const aceEditorRef = useRef<any>(null);
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  useEffect(() => {
    const initializeEditor = async () => {
      try {
        await loadAce();

        if (editorRef.current && !aceEditorRef.current) {
          const editor = (window as any).ace.edit(editorRef.current);
          editor.setTheme(`ace/theme/${theme}`);
          editor.session.setMode(`ace/mode/${language}`);
          editor.setReadOnly(readOnly);
          editor.setValue(code, -1);
          editor.setOptions({
            fontSize: 14,
            fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            showGutter: true,
            showInvisibles: false,
          });

          editor.session.on("change", () => {
            const newCode = editor.getValue();
            setCode(newCode);
            onCodeChange?.(newCode);
          });

          aceEditorRef.current = editor;
        }
      } catch (error) {
        console.error("Failed to load ACE editor:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEditor();

    return () => {
      if (aceEditorRef.current) {
        aceEditorRef.current.destroy();
        aceEditorRef.current = null;
      }
    };
  }, [language, theme, readOnly, code, onCodeChange]);

  // Setup console capture
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const captureLog = (type: "log" | "error" | "warn" | "info") => (...args: any[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      setConsoleLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          type,
          message,
          timestamp: new Date(),
        },
      ]);

      // Call original console method
      if (type === "log") originalLog(...args);
      else if (type === "error") originalError(...args);
      else if (type === "warn") originalWarn(...args);
      else if (type === "info") originalInfo(...args);
    };

    console.log = captureLog("log");
    console.error = captureLog("error");
    console.warn = captureLog("warn");
    console.info = captureLog("info");

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `code.${language === "javascript" ? "js" : language}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetCode = () => {
    if (aceEditorRef.current) {
      aceEditorRef.current.setValue(initialCode, -1);
      setCode(initialCode);
    }
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  const executeCode = () => {
    try {
      clearConsole();
      if (language === "javascript") {
        new Function(code)();
        setNotification("✅ Code executed successfully!");
        setTimeout(() => setNotification(null), 3000);
        setIsConsoleOpen(true);
      } else {
        setNotification(`❌ ${language} execution not available in browser. Download to run.`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          type: "error",
          message: errorMsg,
          timestamp: new Date(),
        },
      ]);
      setNotification(`❌ Error: ${errorMsg}`);
      setTimeout(() => setNotification(null), 3000);
      setIsConsoleOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden flex flex-col"
      style={{ height }}
    >
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-muted px-4 py-2 text-sm font-medium text-foreground border-b border-border flex-shrink-0"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between bg-muted px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Code Editor • {language}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={executeCode}
            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
            title="Execute code"
          >
            <Play className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetCode}
            className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground transition-colors"
            title="Reset code"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyCode}
            className={`p-2 rounded-lg transition-colors ${copied
                ? "bg-green-500/20 text-green-600"
                : "bg-muted hover:bg-accent text-muted-foreground"
              }`}
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadCode}
            className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground transition-colors"
            title="Download code"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 bg-background overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading editor...</p>
            </div>
          </div>
        )}
        <div
          ref={editorRef}
          className="w-full h-full"
          style={{
            fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
          }}
        />
      </div>

      {/* Console Section */}
      <div
        className="border-t border-border bg-muted flex flex-col transition-all flex-shrink-0"
        style={{ height: isConsoleOpen ? "200px" : "44px" }}
      >
        {/* Console Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/80 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className={`transition-transform ${isConsoleOpen ? "rotate-180" : ""}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
            Console Output {consoleLogs.length > 0 && `(${consoleLogs.length})`}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              clearConsole();
            }}
            className="p-1 rounded-lg bg-background hover:bg-accent text-muted-foreground transition-colors"
            title="Clear console"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Console Content */}
        <div
          className="flex-1 overflow-y-auto bg-background transition-opacity"
          style={{ display: isConsoleOpen ? "block" : "none" }}
        >
          {consoleLogs.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center py-8">
              Console output will appear here...
            </div>
          ) : (
            <div className="font-mono text-xs">
              {consoleLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`px-4 py-1 border-l-2 ${log.type === "error"
                      ? "bg-red-500/5 text-red-600 border-red-500"
                      : log.type === "warn"
                        ? "bg-yellow-500/5 text-yellow-600 border-yellow-500"
                        : log.type === "info"
                          ? "bg-blue-500/5 text-blue-600 border-blue-500"
                          : "bg-green-500/5 text-green-600 border-green-500"
                    }`}
                >
                  <span className="text-muted-foreground mr-2">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span className="font-semibold mr-2">
                    {log.type === "error"
                      ? "❌"
                      : log.type === "warn"
                        ? "⚠️"
                        : log.type === "info"
                          ? "ℹ️"
                          : "✓"}
                  </span>
                  <span className="break-all">{log.message}</span>
                </motion.div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between bg-muted px-4 py-2 border-t border-border text-xs text-muted-foreground flex-shrink-0">
        <span>Lines: {code.split("\n").length}</span>
        <span>Characters: {code.length}</span>
        <span className="text-green-600">Ready</span>
      </div>
    </motion.div>
  );
}
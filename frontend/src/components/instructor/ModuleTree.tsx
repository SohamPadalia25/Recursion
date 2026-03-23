import { ChevronDown, ChevronRight, Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { Module, Topic } from "@/hooks/useCourseBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleTreeProps {
  modules: Module[];
  onAddModule: (module: Module) => void;
  onUpdateModule: (index: number, module: Module) => void;
  onDeleteModule: (index: number) => void;
  onSelectNode: (nodeId: string, nodeType: "module" | "topic") => void;
  selectedNodeId?: string;
}

export function ModuleTree({
  modules,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onSelectNode,
  selectedNodeId,
}: ModuleTreeProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.slice(0, 1).map((_, i) => `module-${i}`))
  );
  const [editingModule, setEditingModule] = useState<number | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleAddModule = () => {
    const newModule: Module = {
      title: "New Module",
      description: "",
      order: modules.length + 1,
      topics: [],
    };
    onAddModule(newModule);
  };

  return (
    <div className="space-y-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Modules</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddModule}
          className="h-7"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Module
        </Button>
      </div>

      <div className="space-y-1">
        {modules.map((module, idx) => {
          const moduleId = `module-${idx}`;
          const isExpanded = expandedModules.has(moduleId);

          return (
            <div key={moduleId}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1 rounded-lg p-2 hover:bg-muted"
              >
                <button
                  onClick={() => toggleModule(moduleId)}
                  className="flex h-6 w-6 items-center justify-center rounded p-0 text-muted-foreground hover:bg-muted-foreground/10"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {editingModule === idx ? (
                  <Input
                    value={module.title}
                    onChange={(e) => {
                      const updated = { ...module, title: e.target.value };
                      onUpdateModule(idx, updated);
                    }}
                    onBlur={() => setEditingModule(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingModule(null);
                    }}
                    autoFocus
                    className="h-7 flex-1 border-primary/50 text-sm"
                  />
                ) : (
                  <div
                    onClick={() => onSelectNode(moduleId, "module")}
                    className={`flex-1 cursor-pointer rounded px-2 py-1 text-sm transition-colors ${
                      selectedNodeId === moduleId
                        ? "bg-primary/20 font-medium text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {module.title}
                  </div>
                )}

                <button
                  onClick={() => setEditingModule(idx)}
                  className="h-6 w-6 rounded p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                >
                  <Edit2 className="h-3 w-3" />
                </button>

                <button
                  onClick={() => onDeleteModule(idx)}
                  className="h-6 w-6 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>

              <AnimatePresence>
                {isExpanded && module.topics.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 space-y-1 border-l-2 border-muted px-2 py-1"
                  >
                    {module.topics.map((topic, tIdx) => {
                      const topicId = `topic-${idx}-${tIdx}`;
                      return (
                        <div
                          key={topicId}
                          onClick={() => onSelectNode(topicId, "topic")}
                          className={`cursor-pointer rounded px-2 py-1 text-sm transition-colors ${
                            selectedNodeId === topicId
                              ? "bg-primary/20 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-current" />
                            {topic.title}
                            <span className="ml-auto inline-flex rounded-full bg-muted px-1.5 py-0.5 text-xs opacity-70">
                              {topic.subtopics.length ?? 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

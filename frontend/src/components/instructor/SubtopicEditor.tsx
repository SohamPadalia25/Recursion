import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Subtopic, LearningOutcome } from "@/hooks/useCourseBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubtopicEditorProps {
  subtopic: Subtopic;
  onUpdate: (subtopic: Subtopic) => void;
}

export function SubtopicEditor({ subtopic, onUpdate }: SubtopicEditorProps) {
  const handleAddOutcome = () => {
    const newOutcome: LearningOutcome = {
      description: "New learning outcome",
      bloomLevel: "understand",
    };
    onUpdate({
      ...subtopic,
      learningOutcomes: [...(subtopic.learningOutcomes || []), newOutcome],
    });
  };

  const handleUpdateOutcome = (
    index: number,
    outcome: LearningOutcome
  ) => {
    const updated = [...(subtopic.learningOutcomes || [])];
    updated[index] = outcome;
    onUpdate({ ...subtopic, learningOutcomes: updated });
  };

  const handleDeleteOutcome = (index: number) => {
    const updated =
      subtopic.learningOutcomes?.filter((_, i) => i !== index) || [];
    onUpdate({ ...subtopic, learningOutcomes: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Subtopic Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Title
            </label>
            <Input
              value={subtopic.title}
              onChange={(e) =>
                onUpdate({ ...subtopic, title: e.target.value })
              }
              className="mt-1"
              placeholder="Subtopic title"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            <Input
              value={subtopic.description || ""}
              onChange={(e) =>
                onUpdate({ ...subtopic, description: e.target.value })
              }
              className="mt-1"
              placeholder="Optional description"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Difficulty
              </label>
              <Select
                value={subtopic.difficulty}
                onValueChange={(value: any) =>
                  onUpdate({ ...subtopic, difficulty: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Est. Duration (min)
              </label>
              <Input
                type="number"
                value={subtopic.estimatedDuration}
                onChange={(e) =>
                  onUpdate({
                    ...subtopic,
                    estimatedDuration: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <Checkbox
              checked={subtopic.isOptional}
              onCheckedChange={(checked) =>
                onUpdate({
                  ...subtopic,
                  isOptional: checked === true,
                })
              }
              id="optional"
            />
            <label
              htmlFor="optional"
              className="text-sm font-medium cursor-pointer"
            >
              Optional subtopic
            </label>
          </div>
        </div>
      </Card>

      {/* Learning Outcomes */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-semibold">Learning Outcomes</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddOutcome}
            className="h-7"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>

        <div className="space-y-3">
          {(subtopic.learningOutcomes || []).map((outcome, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2"
            >
              <Input
                value={outcome.description}
                onChange={(e) =>
                  handleUpdateOutcome(idx, {
                    ...outcome,
                    description: e.target.value,
                  })
                }
                placeholder="Learning outcome"
                className="flex-1 text-sm"
              />
              <Select
                value={outcome.bloomLevel}
                onValueChange={(value: any) =>
                  handleUpdateOutcome(idx, {
                    ...outcome,
                    bloomLevel: value,
                  })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remember">Remember</SelectItem>
                  <SelectItem value="understand">Understand</SelectItem>
                  <SelectItem value="apply">Apply</SelectItem>
                  <SelectItem value="analyze">Analyze</SelectItem>
                  <SelectItem value="evaluate">Evaluate</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => handleDeleteOutcome(idx)}
                className="h-9 w-9 rounded border border-border p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Adaptive Paths */}
      <Card className="p-5">
        <div className="mb-4">
          <h4 className="text-base font-semibold">Alternate Learning Paths</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Define fallback suggestions if learners struggle with prerequisites
          </p>
        </div>

        {!subtopic.alternatePaths?.length && (
          <p className="text-sm text-muted-foreground">
            No alternate paths configured yet.
          </p>
        )}

        <div className="space-y-2">
          {(subtopic.alternatePaths || []).map((path, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
            >
              <p className="font-medium">{path.condition}</p>
              <p className="text-xs text-muted-foreground">{path.description}</p>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

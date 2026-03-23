import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Topic, Subtopic, LearningOutcome } from "@/hooks/useCourseBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopicEditorProps {
  topic: Topic;
  onUpdate: (topic: Topic) => void;
  onAddSubtopic: (subtopic: Subtopic) => void;
}

export function TopicEditor({
  topic,
  onUpdate,
  onAddSubtopic,
}: TopicEditorProps) {
  const handleAddOutcome = () => {
    const newOutcome: LearningOutcome = {
      description: "New learning outcome",
      bloomLevel: "understand",
    };
    onUpdate({
      ...topic,
      learningOutcomes: [...(topic.learningOutcomes || []), newOutcome],
    });
  };

  const handleUpdateOutcome = (
    index: number,
    outcome: LearningOutcome
  ) => {
    const updated = [...(topic.learningOutcomes || [])];
    updated[index] = outcome;
    onUpdate({ ...topic, learningOutcomes: updated });
  };

  const handleDeleteOutcome = (index: number) => {
    const updated = topic.learningOutcomes?.filter((_, i) => i !== index) || [];
    onUpdate({ ...topic, learningOutcomes: updated });
  };

  const handleAddSubtopic = () => {
    const newSubtopic: Subtopic = {
      title: "New Subtopic",
      description: "",
      difficulty: "medium",
      learningOutcomes: [],
      prerequisites: [],
      alternatePaths: [],
      estimatedDuration: 0,
      isOptional: false,
      order: (topic.subtopics?.length || 0) + 1,
    };
    onAddSubtopic(newSubtopic);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Topic Settings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Title
            </label>
            <Input
              value={topic.title}
              onChange={(e) => onUpdate({ ...topic, title: e.target.value })}
              className="mt-1"
              placeholder="Topic title"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            <Input
              value={topic.description || ""}
              onChange={(e) =>
                onUpdate({ ...topic, description: e.target.value })
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
                value={topic.difficulty}
                onValueChange={(value: any) =>
                  onUpdate({ ...topic, difficulty: value })
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
                value={topic.estimatedDuration}
                onChange={(e) =>
                  onUpdate({
                    ...topic,
                    estimatedDuration: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1"
                min="0"
              />
            </div>
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
          {(topic.learningOutcomes || []).map((outcome, idx) => (
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

      {/* Subtopics */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-semibold">
            Subtopics ({topic.subtopics?.length || 0})
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSubtopic}
            className="h-7"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Subtopic
          </Button>
        </div>

        {!topic.subtopics?.length && (
          <p className="text-sm text-muted-foreground">
            No subtopics yet. Add one to get started.
          </p>
        )}

        <div className="space-y-2">
          {(topic.subtopics || []).map((subtopic, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{subtopic.title}</p>
                <p className="text-xs text-muted-foreground">
                  {subtopic.description || "No description"}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                {subtopic.difficulty}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

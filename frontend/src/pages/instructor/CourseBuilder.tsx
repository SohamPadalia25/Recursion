import { Sparkles, Save, RotateCcw } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCourseBuilder, CourseBuilderProvider } from "@/hooks/useCourseBuilder";
import { ModuleTree } from "@/components/instructor/ModuleTree";
import { TopicEditor } from "@/components/instructor/TopicEditor";
import { SubtopicEditor } from "@/components/instructor/SubtopicEditor";
import { ContentUpload } from "@/components/instructor/ContentUpload";

const STEPS = [
  { id: 1, name: "Course Info", description: "Set up your course basics" },
  { id: 2, name: "Modules & Topics", description: "Build your course structure" },
  { id: 3, name: "Content", description: "Upload and map content to nodes" },
];

function CourseBuilderContent() {
  const {
    currentStep,
    modules,
    courseId,
    currentModuleIndex,
    currentTopicIndex,
    selectedNodeId,
    selectedNodeType,
    goToStep,
    addModule,
    updateModule,
    deleteModule,
    reorderModules,
    addTopic,
    updateTopic,
    deleteTopic,
    reorderTopics,
    addSubtopic,
    updateSubtopic,
    deleteSubtopic,
    reorderSubtopics,
    selectNode,
    generateStructure,
    saveStructure,
  } = useCourseBuilder();

  const [courseTitle, setCourseTitle] = useState("New Course");
  const [courseDesc, setCourseDesc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateStructure = async () => {
    if (!courseTitle || !courseDesc) {
      alert("Please enter course title and description");
      return;
    }
    setIsGenerating(true);
    try {
      await generateStructure(courseTitle, courseDesc);
      goToStep(2);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate course structure");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveStructure = async () => {
    setIsSaving(true);
    try {
      await saveStructure();
      alert("Course structure saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save course structure");
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected node details for editing
  const getSelectedNodeDetails = () => {
    if (!selectedNodeId || !selectedNodeType) return null;

    if (selectedNodeType === "module") {
      return modules.find((m) => m._id === selectedNodeId || m.title === selectedNodeId);
    }

    for (const module of modules) {
      if (selectedNodeType === "topic") {
        const topic = module.topics.find(
          (t) => t._id === selectedNodeId || t.title === selectedNodeId
        );
        if (topic) return topic;
      }
      for (const topic of module.topics) {
        if (selectedNodeType === "subtopic") {
          const subtopic = topic.subtopics?.find(
            (st) => st._id === selectedNodeId || st.title === selectedNodeId
          );
          if (subtopic) return subtopic;
        }
      }
    }
    return null;
  };

  return (
    <AppFrame
      roleLabel="Instructor"
      title="Course Builder"
      subtitle="Create and manage your course structure with AI assistance"
      navItems={instructorNav}
    >
      {/* Step Navigation */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => goToStep(step.id as any)}
            className={`flex min-w-max items-center gap-2 rounded-lg px-4 py-2 transition-all ${
              currentStep === step.id
                ? "bg-primary/20 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-sm">{step.id}</span>
            <span className="text-sm font-medium">{step.name}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Course Info */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Course Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Course Title *
                  </label>
                  <Input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="mt-2"
                    placeholder="e.g., Full-Stack Web Development"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description *
                  </label>
                  <textarea
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Describe what students will learn..."
                    rows={5}
                  />
                </div>
              </div>
            </Card>

            <Card className="border-primary/50 bg-primary/5 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">AI-Powered Structure Generation</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Let our AI analyze your course title and description to generate an optimized
                  course structure with modules, topics, and subtopics.
                </p>
              </div>

              <Button
                onClick={handleGenerateStructure}
                disabled={isGenerating || !courseTitle || !courseDesc}
                size="lg"
                className="w-full"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isGenerating ? "Generating..." : "Generate Course Structure"}
              </Button>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => goToStep(2)}
                disabled={modules.length === 0}
                variant="outline"
              >
                Skip & Manual Build
              </Button>
              <Button onClick={() => goToStep(2)} disabled={modules.length === 0}>
                Continue to Step 2
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Modules & Topics */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Left: Module Tree */}
            <Card className="lg:col-span-1 p-5">
              <ModuleTree
                modules={modules}
                onAddModule={addModule}
                onUpdateModule={updateModule}
                onDeleteModule={deleteModule}
                onSelectNode={selectNode}
                selectedNodeId={selectedNodeId}
              />
            </Card>

            {/* Right: Node Editor */}
            <div className="lg:col-span-2 space-y-4">
              {selectedNodeType === "topic" ? (
                <TopicEditor
                  topic={getSelectedNodeDetails() as any}
                  onUpdate={(topic) => {
                    // Find and update the topic
                    for (let m = 0; m < modules.length; m++) {
                      for (let t = 0; t < modules[m].topics.length; t++) {
                        if (modules[m].topics[t]._id === topic._id) {
                          updateTopic(m, t, topic);
                          return;
                        }
                      }
                    }
                  }}
                  onAddSubtopic={(subtopic) => {
                    // Find module and topic index, then add subtopic
                    for (let m = 0; m < modules.length; m++) {
                      for (let t = 0; t < modules[m].topics.length; t++) {
                        if (modules[m].topics[t]._id === selectedNodeId) {
                          addSubtopic(m, t, subtopic);
                          return;
                        }
                      }
                    }
                  }}
                />
              ) : selectedNodeType === "subtopic" ? (
                <SubtopicEditor
                  subtopic={getSelectedNodeDetails() as any}
                  onUpdate={(subtopic) => {
                    // Find and update subtopic
                    for (let m = 0; m < modules.length; m++) {
                      for (let t = 0; t < modules[m].topics.length; t++) {
                        for (let s = 0; s < (modules[m].topics[t].subtopics?.length || 0); s++) {
                          if (modules[m].topics[t].subtopics?.[s]._id === subtopic._id) {
                            updateSubtopic(m, t, s, subtopic);
                            return;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">
                    Select a topic or subtopic to edit its settings
                  </p>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 3: Content Upload */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Left: Module Tree for node selection */}
            <Card className="lg:col-span-1 p-5">
              <ModuleTree
                modules={modules}
                onAddModule={() => {}}
                onUpdateModule={() => {}}
                onDeleteModule={() => {}}
                onSelectNode={selectNode}
                selectedNodeId={selectedNodeId}
              />
            </Card>

            {/* Right: Content Upload */}
            <div className="lg:col-span-2">
              <ContentUpload />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-between border-t border-border pt-4">
        <Button
          onClick={() => goToStep(Math.max(1, currentStep - 1) as any)}
          variant="outline"
          disabled={currentStep === 1}
        >
          ← Previous
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveStructure}
            disabled={isSaving || modules.length === 0}
            variant="outline"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Course"}
          </Button>

          <Button
            onClick={() => goToStep(Math.min(3, currentStep + 1) as any)}
            disabled={currentStep === 3 || modules.length === 0}
          >
            Next →
          </Button>
        </div>
      </div>
    </AppFrame>
  );
}

export default function InstructorCourseBuilderPage() {
  return (
    <CourseBuilderProvider>
      <CourseBuilderContent />
    </CourseBuilderProvider>
  );
}

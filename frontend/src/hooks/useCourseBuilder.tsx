import { useState, useCallback, useContext, createContext, ReactNode } from "react";
import { API_V1_BASE_URL } from "@/lib/api-client";

/**
 * Course Builder State Management
 * Handles course structure, topics, subtopics, and content
 */

export interface LearningOutcome {
  description: string;
  bloomLevel:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create";
}

export interface AlternatePath {
  condition: string;
  suggestedId: string;
  description?: string;
}

export interface Subtopic {
  _id?: string;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  learningOutcomes: LearningOutcome[];
  prerequisites: string[];
  alternatePaths: AlternatePath[];
  estimatedDuration: number;
  isOptional: boolean;
  order: number;
}

export interface Topic {
  _id?: string;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  learningOutcomes: LearningOutcome[];
  prerequisites: string[];
  alternatePaths: AlternatePath[];
  estimatedDuration: number;
  order: number;
  subtopics: Subtopic[];
}

export interface Module {
  _id?: string;
  title: string;
  description?: string;
  order: number;
  topics: Topic[];
}

export interface CourseBuilderState {
  courseId: string;
  modules: Module[];
  currentStep: 1 | 2 | 3; // Step 1: Course Info, Step 2: Modules, Step 3: Content
  currentModuleIndex?: number;
  currentTopicIndex?: number;
  selectedNodeId?: string; // For content upload targeting
  selectedNodeType?: "module" | "topic" | "subtopic"; // Which node type is selected
}

interface CourseBuilderContextType extends CourseBuilderState {
  // Step management
  goToStep: (step: 1 | 2 | 3) => void;

  // Module operations
  addModule: (module: Module) => void;
  updateModule: (index: number, module: Module) => void;
  deleteModule: (index: number) => void;
  reorderModules: (from: number, to: number) => void;

  // Topic operations
  addTopic: (moduleIndex: number, topic: Topic) => void;
  updateTopic: (moduleIndex: number, topicIndex: number, topic: Topic) => void;
  deleteTopic: (moduleIndex: number, topicIndex: number) => void;
  reorderTopics: (moduleIndex: number, from: number, to: number) => void;

  // Subtopic operations
  addSubtopic: (
    moduleIndex: number,
    topicIndex: number,
    subtopic: Subtopic
  ) => void;
  updateSubtopic: (
    moduleIndex: number,
    topicIndex: number,
    subtopicIndex: number,
    subtopic: Subtopic
  ) => void;
  deleteSubtopic: (
    moduleIndex: number,
    topicIndex: number,
    subtopicIndex: number
  ) => void;
  reorderSubtopics: (
    moduleIndex: number,
    topicIndex: number,
    from: number,
    to: number
  ) => void;

  // Node selection for content upload
  selectNode: (
    nodeId: string,
    nodeType: "module" | "topic" | "subtopic"
  ) => void;
  getSelectedNode: () => {
    nodeId: string;
    nodeType: string;
    data: Module | Topic | Subtopic | null;
  } | null;

  // Fetch/generate structure
  loadStructure: (courseId: string) => Promise<void>;
  generateStructure: (title: string, description: string) => Promise<void>;
  saveStructure: () => Promise<void>;

  // Reset
  resetState: () => void;
}

const CourseBuilderContext = createContext<
  CourseBuilderContextType | undefined
>(undefined);

export function CourseBuilderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CourseBuilderState>({
    courseId: "",
    modules: [],
    currentStep: 1,
  });

  // Step management
  const goToStep = useCallback((step: 1 | 2 | 3) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  // Module operations
  const addModule = useCallback((module: Module) => {
    setState((prev) => ({
      ...prev,
      modules: [...prev.modules, { ...module, order: prev.modules.length + 1 }],
    }));
  }, []);

  const updateModule = useCallback((index: number, module: Module) => {
    setState((prev) => {
      const newModules = [...prev.modules];
      newModules[index] = module;
      return { ...prev, modules: newModules };
    });
  }, []);

  const deleteModule = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index).map((m, i) => ({
        ...m,
        order: i + 1,
      })),
    }));
  }, []);

  const reorderModules = useCallback((from: number, to: number) => {
    setState((prev) => {
      const newModules = [...prev.modules];
      const [movedModule] = newModules.splice(from, 1);
      newModules.splice(to, 0, movedModule);
      return {
        ...prev,
        modules: newModules.map((m, i) => ({ ...m, order: i + 1 })),
      };
    });
  }, []);

  // Topic operations
  const addTopic = useCallback((moduleIndex: number, topic: Topic) => {
    setState((prev) => {
      const newModules = [...prev.modules];
      const module = newModules[moduleIndex];
      if (module) {
        newModules[moduleIndex] = {
          ...module,
          topics: [
            ...module.topics,
            { ...topic, order: module.topics.length + 1, subtopics: [] },
          ],
        };
      }
      return { ...prev, modules: newModules };
    });
  }, []);

  const updateTopic = useCallback(
    (moduleIndex: number, topicIndex: number, topic: Topic) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        if (newModules[moduleIndex]?.topics[topicIndex]) {
          newModules[moduleIndex].topics[topicIndex] = topic;
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  const deleteTopic = useCallback(
    (moduleIndex: number, topicIndex: number) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        if (newModules[moduleIndex]) {
          newModules[moduleIndex] = {
            ...newModules[moduleIndex],
            topics: newModules[moduleIndex].topics
              .filter((_, i) => i !== topicIndex)
              .map((t, i) => ({ ...t, order: i + 1 })),
          };
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  const reorderTopics = useCallback(
    (moduleIndex: number, from: number, to: number) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        if (newModules[moduleIndex]) {
          const topics = [...newModules[moduleIndex].topics];
          const [movedTopic] = topics.splice(from, 1);
          topics.splice(to, 0, movedTopic);
          newModules[moduleIndex] = {
            ...newModules[moduleIndex],
            topics: topics.map((t, i) => ({ ...t, order: i + 1 })),
          };
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  // Subtopic operations
  const addSubtopic = useCallback(
    (moduleIndex: number, topicIndex: number, subtopic: Subtopic) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        const topic = newModules[moduleIndex]?.topics[topicIndex];
        if (topic) {
          topic.subtopics = [
            ...topic.subtopics,
            { ...subtopic, order: topic.subtopics.length + 1 },
          ];
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  const updateSubtopic = useCallback(
    (
      moduleIndex: number,
      topicIndex: number,
      subtopicIndex: number,
      subtopic: Subtopic
    ) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        if (newModules[moduleIndex]?.topics[topicIndex]?.subtopics[subtopicIndex]) {
          newModules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex] =
            subtopic;
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  const deleteSubtopic = useCallback(
    (moduleIndex: number, topicIndex: number, subtopicIndex: number) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        const topic = newModules[moduleIndex]?.topics[topicIndex];
        if (topic) {
          topic.subtopics = topic.subtopics
            .filter((_, i) => i !== subtopicIndex)
            .map((st, i) => ({ ...st, order: i + 1 }));
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  const reorderSubtopics = useCallback(
    (
      moduleIndex: number,
      topicIndex: number,
      from: number,
      to: number
    ) => {
      setState((prev) => {
        const newModules = [...prev.modules];
        const topic = newModules[moduleIndex]?.topics[topicIndex];
        if (topic) {
          const subtopics = [...topic.subtopics];
          const [movedSubtopic] = subtopics.splice(from, 1);
          subtopics.splice(to, 0, movedSubtopic);
          topic.subtopics = subtopics.map((st, i) => ({ ...st, order: i + 1 }));
        }
        return { ...prev, modules: newModules };
      });
    },
    []
  );

  // Node selection
  const selectNode = useCallback(
    (nodeId: string, nodeType: "module" | "topic" | "subtopic") => {
      setState((prev) => ({
        ...prev,
        selectedNodeId: nodeId,
        selectedNodeType: nodeType,
      }));
    },
    []
  );

  const getSelectedNode = useCallback(() => {
    const { selectedNodeId, selectedNodeType, modules } = state;
    if (!selectedNodeId || !selectedNodeType) return null;

    if (selectedNodeType === "module") {
      const module = modules.find((m) => m._id === selectedNodeId);
      if (module) return { nodeId: selectedNodeId, nodeType: "module", data: module };
    }

    if (selectedNodeType === "topic") {
      for (const module of modules) {
        const topic = module.topics.find((t) => t._id === selectedNodeId);
        if (topic) return { nodeId: selectedNodeId, nodeType: "topic", data: topic };
      }
    }

    if (selectedNodeType === "subtopic") {
      for (const module of modules) {
        for (const topic of module.topics) {
          const subtopic = topic.subtopics.find(
            (st) => st._id === selectedNodeId
          );
          if (subtopic) return { nodeId: selectedNodeId, nodeType: "subtopic", data: subtopic };
        }
      }
    }

    return null;
  }, [state]);

  // API operations
  const loadStructure = useCallback(async (courseId: string) => {
    try {
      const response = await fetch(
        `${API_V1_BASE_URL}/courses/${courseId}/structure`
      );
      if (!response.ok) throw new Error("Failed to load structure");
      const data = await response.json();
      setState((prev) => ({
        ...prev,
        courseId,
        modules: data.data.modules,
      }));
    } catch (error) {
      console.error("Error loading structure:", error);
    }
  }, []);

  const generateStructure = useCallback(
    async (title: string, description: string) => {
      try {
        const response = await fetch(
          `${API_V1_BASE_URL}/courses/${state.courseId}/generate-structure`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
          }
        );
        if (!response.ok) throw new Error("Failed to generate structure");
        const data = await response.json();
        
        // Transform API response to state format
        const modules: Module[] = data.data.modules.map(
          (m: any, idx: number) => ({
            _id: `module-${idx}`,
            title: m.name,
            description: m.description,
            order: idx + 1,
            topics: (m.topics || []).map((t: any, tIdx: number) => ({
              _id: `topic-${idx}-${tIdx}`,
              title: t.name,
              description: t.description,
              difficulty: t.difficulty,
              learningOutcomes: t.learning_outcomes || [],
              prerequisites: [],
              alternatePaths: [],
              estimatedDuration: t.estimated_duration || 0,
              order: tIdx + 1,
              subtopics: (t.subtopics || []).map(
                (st: any, stIdx: number) => ({
                  _id: `subtopic-${idx}-${tIdx}-${stIdx}`,
                  title: st.name,
                  description: st.description,
                  difficulty: st.difficulty,
                  learningOutcomes: st.learning_outcomes || [],
                  prerequisites: [],
                  alternatePaths: [],
                  estimatedDuration: st.estimated_duration || 0,
                  isOptional: st.is_optional || false,
                  order: stIdx + 1,
                })
              ),
            })),
          })
        );

        setState((prev) => ({ ...prev, modules }));
      } catch (error) {
        console.error("Error generating structure:", error);
      }
    },
    [state.courseId]
  );

  const saveStructure = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_V1_BASE_URL}/courses/${state.courseId}/save-structure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules: state.modules }),
        }
      );
      if (!response.ok) throw new Error("Failed to save structure");
      return await response.json();
    } catch (error) {
      console.error("Error saving structure:", error);
      throw error;
    }
  }, [state.courseId, state.modules]);

  const resetState = useCallback(() => {
    setState({
      courseId: "",
      modules: [],
      currentStep: 1,
    });
  }, []);

  const value: CourseBuilderContextType = {
    ...state,
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
    getSelectedNode,
    loadStructure,
    generateStructure,
    saveStructure,
    resetState,
  };

  return (
    <CourseBuilderContext.Provider value={value}>
      {children}
    </CourseBuilderContext.Provider>
  );
}

export function useCourseBuilder() {
  const context = useContext(CourseBuilderContext);
  if (!context) {
    throw new Error(
      "useCourseBuilder must be used within CourseBuilderProvider"
    );
  }
  return context;
}

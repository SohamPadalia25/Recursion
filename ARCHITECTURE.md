# Architecture Visualization

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INSTRUCTOR COURSE BUILDER                        │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND (React + TypeScript)
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  CourseBuilder.tsx [PAGE]                                            │
│  └─ CourseBuilderProvider [CONTEXT]                                 │
│     └─ useCourseBuilder [HOOK] ←─→ API Calls                       │
│        ├─ State: modules, currentStep, selectedNode                 │
│        ├─ Methods: addModule, updateTopic, selectNode, etc.         │
│        └─ API: generateStructure, saveStructure, loadStructure      │
│                                                                       │
│  Step 1: Course Info                                                 │
│  ├─ Title & Description inputs                                      │
│  └─ AI Generate button                                              │
│     └─ POST /api/courses/{id}/generate-structure                    │
│                                                                       │
│  Step 2: Modules & Topics                                           │
│  ├─ Left: ModuleTree [COMPONENT]                                    │
│  │  ├─ Hierarchical display (Module → Topic → Subtopic)            │
│  │  ├─ Add/Edit/Delete buttons                                      │
│  │  └─ Node selection with click handlers                           │
│  │                                                                    │
│  └─ Right: Node Editor (one of below)                              │
│     ├─ TopicEditor [COMPONENT]                                      │
│     │  ├─ Title, description, difficulty                            │
│     │  ├─ Learning Outcomes manager                                 │
│     │  └─ Subtopics list                                            │
│     └─ SubtopicEditor [COMPONENT]                                   │
│        ├─ Title, description, difficulty                            │
│        ├─ Learning Outcomes manager                                 │
│        └─ Optional flag + Alternate paths view                      │
│                                                                       │
│  Step 3: Content Upload                                             │
│  ├─ Left: ModuleTree (node selector)                                │
│  └─ Right: ContentUpload [COMPONENT]                                │
│     ├─ Content type picker                                          │
│     ├─ Title, URL, duration, tags inputs                            │
│     └─ Upload button → POST /api/content/upload                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓ HTTP/JSON ↓         ↑ JSON Response ↑
                  NETWORK
          ↓         ↑         ↓         ↑
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Routes: courseGeneration.routes.js                                 │
│  ├─ POST /api/courses/:courseId/generate-structure                  │
│  ├─ POST /api/courses/:courseId/save-structure                      │
│  └─ GET /api/courses/:courseId/structure                            │
│                                                                       │
│  Controllers: courseGeneration.controller.js                        │
│  ├─ generateCourseStructure()                                       │
│  │  ├─ Validate input                                               │
│  │  ├─ Call LLM (mock or real)                                      │
│  │  └─ Return structured JSON                                       │
│  ├─ saveCourseStructure()                                           │
│  │  ├─ Create Module documents                                      │
│  │  ├─ Create Topic documents per module                            │
│  │  └─ Create Subtopic documents per topic                          │
│  └─ getCourseStructure()                                            │
│     └─ Fetch and return full tree with relationships                │
│                                                                       │
│  (Future) contentUpload.controller.js                               │
│  ├─ uploadContent()                                                 │
│  ├─ validateFile()                                                  │
│  └─ attachToNode()                                                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓ Mongoose ODM ↓         ↑ Query Results ↑
                DATABASE
          ↓         ↑         ↓         ↑
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB (Data Models)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  courses Collection (existing)                                       │
│  ├─ _id, title, description, instructor, status, etc.              │
│  └─ Used by: Course model                                           │
│                                                                       │
│  modules Collection (existing)                                       │
│  ├─ _id, title, course→, order, prerequisiteModule→, etc.          │
│  └─ One per course level 1                                          │
│                                                                       │
│  topics Collection [NEW]                                            │
│  ├─ _id, title, description, module→, course→, order                │
│  ├─ difficulty: easy|medium|hard                                    │
│  ├─ learningOutcomes: [{description, bloomLevel}]                   │
│  ├─ prerequisites: [topic_id]                                       │
│  ├─ alternatePaths: [{condition, suggestedTopicId, description}]    │
│  ├─ estimatedDuration: number                                       │
│  └─ Indexed: {module, order} UNIQUE, {course}                       │
│                                                                       │
│  subtopics Collection [NEW]                                         │
│  ├─ _id, title, description, topic→, module→, course→, order        │
│  ├─ difficulty: easy|medium|hard                                    │
│  ├─ learningOutcomes: [{description, bloomLevel}]                   │
│  ├─ prerequisites: [subtopic_id]                                    │
│  ├─ alternatePaths: [{condition, suggestedSubtopicId, description}] │
│  ├─ estimatedDuration: number                                       │
│  ├─ isOptional: boolean                                             │
│  └─ Indexed: {topic, order} UNIQUE, {course}                        │
│                                                                       │
│  content Collection [NEW]                                           │
│  ├─ _id, title, type: video|pdf|notes|link|code                    │
│  ├─ url, course→, topic→, subtopic→, lesson→ (one required)         │
│  ├─ duration, tags[], transcript, thumbnail, sizeInBytes            │
│  └─ Indexed: {course}, {topic}, {subtopic}, {lesson}               │
│                                                                       │
│  lessons Collection (existing) ← Still supported for backward compat│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
           ↓ Relationships ↓         ↑ Populated Results ↑
┌─────────────────────────────────────────────────────────────────────┐
│                    RELATIONSHIP MAP                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                    Course                                           │
│                      ↓                                               │
│           ┌──────────┼──────────┐                                   │
│           ↓          ↓          ↓                                    │
│        Module 1   Module 2   Module 3                               │
│           ↓          ↓          ↓                                    │
│     ┌─────┼─────┐ ┌──┴──┐ ┌────┴─┐                                 │
│     ↓     ↓     ↓ ↓     ↓ ↓      ↓                                  │
│   Topic Topic Topic ...  ...    ...                                 │
│     ↓     ↓     ↓                                                    │
│  ┌──┤  ┌──┤ ┌───┤                                                  │
│  ↓  ↓  ↓  ↓ ↓   ↓                                                  │
│ Sub Sub Sub... ...                                                 │
│           ↓                                                          │
│        Content (linked)                                             │
│     ├─ Videos (YouTube, Cloudinary)                                 │
│     ├─ PDFs (Cloudinary, GCS)                                       │
│     ├─ Notes (Markdown, rich text)                                  │
│     ├─ Links (external resources)                                   │
│     └─ Code (GitHub, CodePen)                                       │
│                                                                       │
│  Prerequisites Form DAG (Directed Acyclic Graph):                   │
│     Topic A ← prerequisite ← Topic B                               │
│     Topic C ← prerequisite ← Topic D ← Topic A                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘


## Data Model Example (JSON)

```json
{
  "Course": {
    "_id": "course-001",
    "title": "Full-Stack Web Development",
    "description": "Learn web development from zero to hero",
    "instructor": "user-123",
    "status": "draft"
  },
  
  "Modules": [
    {
      "_id": "module-001",
      "title": "Foundation",
      "course": "course-001",
      "order": 1
    }
  ],
  
  "Topics": [
    {
      "_id": "topic-001",
      "title": "HTML Basics",
      "module": "module-001",
      "course": "course-001",
      "order": 1,
      "difficulty": "easy",
      "learningOutcomes": [
        {
          "description": "Create valid semantic HTML documents",
          "bloomLevel": "apply"
        }
      ],
      "prerequisites": [],
      "estimatedDuration": 45
    }
  ],
  
  "Subtopics": [
    {
      "_id": "subtopic-001",
      "title": "HTML Structure & Tags",
      "topic": "topic-001",
      "module": "module-001",
      "course": "course-001",
      "order": 1,
      "difficulty": "easy",
      "learningOutcomes": [
        {
          "description": "Understand and use HTML semantic tags",
          "bloomLevel": "understand"
        }
      ],
      "prerequisites": [],
      "estimatedDuration": 20,
      "isOptional": false
    }
  ],
  
  "Content": [
    {
      "_id": "content-001",
      "title": "HTML Intro Video",
      "type": "video",
      "url": "https://cloudinary.com/...",
      "subtopic": "subtopic-001",
      "course": "course-001",
      "duration": 1200,
      "tags": ["introduction", "beginner"]
    },
    {
      "_id": "content-002",
      "title": "HTML Cheat Sheet",
      "type": "pdf",
      "url": "https://cloudinary.com/...",
      "subtopic": "subtopic-001",
      "course": "course-001"
    }
  ]
}
```

## State Flow Diagram (Frontend)

```
╔═══════════════════════════════════════════════════════════╗
║           CourseBuilderProvider [CONTEXT]                ║
║                                                           ║
║  State: {                                              ║
║    courseId: string,                                  ║
║    modules: Module[],                                 ║
║    currentStep: 1 | 2 | 3,                           ║
║    selectedNodeId?: string,                           ║
║    selectedNodeType?: 'module'|'topic'|'subtopic'   ║
║  }                                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
              ↓ providedvia useCourseBuilder() ↓
        ┌─────────────────────────────────────┐
        │                                       │
   ┌────┴─────┐                           ┌───┴────┐
   │ Component │ ← calls hooks → updates state
   └────┬─────┘                           ┌───┬────┐
        │                                  │
   ┌────┴─────────────────────┬───────────┘
   │ onAddModule()            │
   │ updateTopic()            │
   │ deleteSubtopic()         │
   │ selectNode()             │
   │ generateStructure()      │
   │ saveStructure()          │
   └─────────────────────────┘
              ↓ updates ↓
    ┌─────────────────────────┐
    │ Component Re-renders    │
    │ (AnimatePresence)       │
    └─────────────────────────┘


## Request/Response Example

### Generate Course Structure
```
REQUEST:
─────────────────────────────────────────────
POST /api/courses/course-001/generate-structure
Content-Type: application/json

{
  "title": "Python for Data Science",
  "description": "Learn Python programming and data analysis with pandas, numpy, matplotlib"
}


RESPONSE:
─────────────────────────────────────────────
{
  "success": true,
  "data": {
    "modules": [
      {
        "name": "Python Fundamentals",
        "description": "Core Python concepts",
        "topics": [
          {
            "name": "Variables & Data Types",
            "difficulty": "easy",
            "description": "Learn Python variables, types, and operations",
            "learning_outcomes": [
              {
                "description": "Create and manipulate Python variables",
                "bloomLevel": "apply"
              }
            ],
            "estimated_duration": 30,
            "subtopics": [
              {
                "name": "Numbers, Strings, Lists",
                "difficulty": "easy",
                "estimated_duration": 15,
                "is_optional": false
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

**This architecture supports**: 
- ✅ Unlimited course depth
- ✅ Complex prerequisite chains
- ✅ Multi-modal content delivery  
- ✅ Scalable to 1000s of courses
- ✅ Real-time updates
- ✅ Analytics & tracking

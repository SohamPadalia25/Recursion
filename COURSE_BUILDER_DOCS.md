# Course Builder 2.0 - AI-Powered Graph-Based System

## 📋 Overview

The upgraded Course Builder is now a powerful, AI-enabled system that transforms course creation into a structured, graph-based learning architecture. It supports Bloom's Taxonomy, prerequisite chains, alternate learning paths, and intelligent content mapping.

## 🏗️ Architecture

### Data Models

#### Backend Models (MongoDB)

1. **Topic** (`backend/src/models/topic.model.js`)
   - Hierarchical container within a Module
   - Supports learning outcomes with Bloom levels
   - Has prerequisites and alternate paths
   - Fields:
     ```javascript
     {
       title, description, module, course, order,
       difficulty: 'easy' | 'medium' | 'hard',
       learningOutcomes: [{ description, bloomLevel }],
       prerequisites: [TopicId],
       alternatePaths: [{ condition, suggestedTopicId, description }],
       estimatedDuration
     }
     ```

2. **Subtopic** (`backend/src/models/subtopic.model.js`)
   - Granular learning units within a Topic
   - Most detailed level of course structure
   - Can be marked optional
   - Contains all same fields as Topic plus `isOptional`

3. **Content** (`backend/src/models/content.model.js`)
   - Stores multi-type content (video, PDF, notes, links, code)
   - Maps to any node: Topic, Subtopic, or Lesson (backward compatible)
   - Tracks metadata: duration, tags, transcript
   - Fields:
     ```javascript
     {
       title, type: 'video' | 'pdf' | 'notes' | 'link' | 'code',
       url, course, topic, subtopic, lesson (one required),
       duration, tags, transcript, thumbnail
     }
     ```

### Frontend State Management

**Hook: `useCourseBuilder`** (`frontend/src/hooks/useCourseBuilder.tsx`)
- Central state management for course building
- Handles all CRUD operations on modules, topics, subtopics
- Manages step navigation (1-3)
- Provides node selection for content mapping
- Interfaces with backend APIs

**State Structure:**
```typescript
interface CourseBuilderState {
  courseId: string;
  modules: Module[];
  currentStep: 1 | 2 | 3;
  selectedNodeId?: string;
  selectedNodeType?: 'module' | 'topic' | 'subtopic';
}
```

## 🎯 Three-Step Flow

### Step 1: Course Info
- **Purpose:** Gather course metadata and optionally generate structure via AI
- **Components:**
  - Course title input
  - Description textarea
  - AI generation button (triggers OpenAI/Claude integration)
  
**API Call:**
```
POST /api/courses/:courseId/generate-structure
Body: { title, description }
Response: { modules: [...] }
```

### Step 2: Modules & Topics
- **Purpose:** Build and refine course structure hierarchically
- **Components:**
  - `ModuleTree`: Interactive tree showing modules, topics, subtopics
  - `TopicEditor`: Edit selected topic's metadata, learning outcomes, add subtopics
  - `SubtopicEditor`: Edit subtopic configuration, learning outcomes, alternate paths
  
**Features:**
- Drag-and-drop reordering (ready to implement: use `reorderModules`, `reorderTopics`, `reorderSubtopics`)
- Expandable tree navigation
- Inline editing of titles
- Learning outcome management with Bloom levels
- Difficulty assignment per node

### Step 3: Content
- **Purpose:** Upload and map content to specific course nodes
- **Components:**
  - `ModuleTree`: Node selector
  - `ContentUpload`: Drag-and-drop file upload with metadata
  
**Features:**
- Select target node (module/topic/subtopic)
- Choose content type (video, PDF, notes, link, code)
- Add title, URL, duration, tags
- Backend stores content with node reference

**API Call:**
```
POST /api/content/upload
Body: { title, type, url, courseId, topicId/subtopicId, tags, duration }
```

## 📦 Frontend Components

### Component Hierarchy

```
CourseBuilderPage (provider wrapper)
  ├─ Step Navigation (interactive buttons)
  ├─ Step 1: Course Info
  │  ├─ Course title/description inputs
  │  └─ AI generate button
  ├─ Step 2: Modules & Topics
  │  ├─ ModuleTree (left sidebar)
  │  └─ TopicEditor/SubtopicEditor (right panel)
  └─ Step 3: Content
     ├─ ModuleTree (left sidebar for selection)
     └─ ContentUpload (right panel)
```

### Component Details

**ModuleTree** (`frontend/src/components/instructor/ModuleTree.tsx`)
- Renders hierarchical module → topic → subtopic tree
- Interactive node selection
- Add/edit/delete operations
- Props:
  ```typescript
  {
    modules: Module[],
    onAddModule, onUpdateModule, onDeleteModule,
    onSelectNode(nodeId, nodeType),
    selectedNodeId: string
  }
  ```

**TopicEditor** (`frontend/src/components/instructor/TopicEditor.tsx`)
- Edit topic title, description, difficulty, duration
- Manage learning outcomes with Bloom levels
- View and manage subtopics
- Props:
  ```typescript
  {
    topic: Topic,
    onUpdate(updatedTopic),
    onAddSubtopic(subtopic)
  }
  ```

**SubtopicEditor** (`frontend/src/components/instructor/SubtopicEditor.tsx`)
- Edit subtopic metadata
- Manage learning outcomes
- View alternate paths (configuration)
- Support optional subtopic flag
- Props:
  ```typescript
  {
    subtopic: Subtopic,
    onUpdate(updatedSubtopic)
  }
  ```

**ContentUpload** (`frontend/src/components/instructor/ContentUpload.tsx`)
- Node selection dropdown (flattened tree view)
- Content type picker (video, PDF, etc.)
- Title, URL, duration, tags inputs
- Upload handler (ready for backend integration)
- Props:
  ```typescript
  {
    onContentAdded?(contentData)
  }
  ```

## 🔌 Backend Integration Checklist

### 1. API Routes (`backend/src/routes/courseGeneration.routes.js`)

Already implemented:
- ✅ `POST /api/courses/:courseId/generate-structure` - Generate structure via AI
- ✅ `POST /api/courses/:courseId/save-structure` - Persist generated structure
- ✅ `GET /api/courses/:courseId/structure` - Fetch full course tree

### 2. Controllers (`backend/src/controllers/courseGeneration.controller.js`)

**`generateCourseStructure()`**
- Validates course exists
- Calls LLM (OpenAI/Claude) to generate modules/topics/subtopics
- Returns mock structure (TODO: Replace with real LLM API)
- Enhance with:
  ```javascript
  // Use actual LLM
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: `Generate course structure for: ${title}\n${description}`
    }]
  });
  ```

**`saveCourseStructure()`**
- Creates Module, Topic, Subtopic documents in DB
- Maintains hierarchical relationships
- Returns saved document count

**`getCourseStructure()`**
- Fetches complete course tree with all relationships
- Used by frontend to load existing courses

### 3. Content Upload Endpoint (TODO)

Create `backend/src/controllers/content.controller.js`:
```javascript
export const uploadContent = async (req, res) => {
  // 1. Validate file/URL
  // 2. Create Content document
  // 3. Handle Cloudinary upload if file provided
  // 4. Return created content
};
```

Route:
```javascript
POST /api/content/upload
```

### 4. App Registration

Register routes in `backend/src/app.js`:
```javascript
import courseGenerationRoutes from './routes/courseGeneration.routes.js';

app.use('/api/courses', courseGenerationRoutes);
// Add content routes here
```

## 🚀 How to Use the System

### For Instructors

#### Quick Start (AI-Powered)
1. Go to Course Builder
2. Enter course title and description
3. Click "Generate Course Structure"
4. Review and edit generated structure (Step 2)
5. Upload content mapped to nodes (Step 3)
6. Save course

#### Manual Build
1. Go to Course Builder
2. Skip AI generation or click "Manual Build"
3. Manually add modules using "Add Module" button in ModuleTree
4. Select module → add topics
5. Select topic → add subtopics
6. Configure each level's learning outcomes, prerequisites, difficulty
7. Upload content to specific nodes
8. Save course

### Learning Outcomes (Bloom's Taxonomy)

Each Topic/Subtopic can have multiple learning outcomes at different Bloom levels:
- **Remember**: Recall facts and basic concepts
- **Understand**: Explain ideas or concepts
- **Apply**: Use information in new situations
- **Analyze**: Draw connections among ideas
- **Evaluate**: Justify a stand or decision
- **Create**: Produce new or original work

Example:
```
Topic: "Data Structures"
  Outcome 1: "Recall different types of data structures" (Remember)
  Outcome 2: "Implement a hash table from scratch" (Apply)
  Outcome 3: "Compare performance of different data structures" (Analyze)
```

### Difficulty & Alternate Paths

**Difficulty Levels:**
- Easy: Foundational, prerequisite knowledge
- Medium: Core concepts, requires understanding
- Hard: Advanced, deep analysis, project-based

**Alternate Paths:**
Use when learners struggle with prerequisites or need different approaches:
```javascript
alternatePaths: [
  {
    condition: "if_prerequisite_not_met",
    suggestedTopicId: "basics-refresher-id",
    description: "Review fundamentals before proceeding"
  }
]
```

## 🔄 Data Flow

### Course Creation Flow
```
1. Instructor enters title + description
2. AI generates structure (or manual entry)
3. Structure saved to MongoDB (Module → Topic → Subtopic)
4. Frontend loads structure from API
5. Instructor edits/refines
6. Content uploaded and mapped to nodes
7. Course ready for students
```

### Content Mapping Flow
```
1. Instructor selects target node (Topic/Subtopic)
2. Uploads content file or provides URL
3. Content document created with node reference
4. Student views course → navigates tree
5. Content served from selected node
```

## 📝 Example Course Structure (JSON)

```json
{
  "modules": [
    {
      "_id": "mod-1",
      "title": "Full-Stack Foundation",
      "order": 1,
      "topics": [
        {
          "_id": "top-1",
          "title": "HTML & CSS Basics",
          "difficulty": "easy",
          "learningOutcomes": [
            {
              "description": "Write semantic HTML",
              "bloomLevel": "apply"
            },
            {
              "description": "Apply CSS styling techniques",
              "bloomLevel": "apply"
            }
          ],
          "subtopics": [
            {
              "_id": "sub-1",
              "title": "HTML Structure",
              "difficulty": "easy",
              "learningOutcomes": [
                {
                  "description": "Create valid HTML documents",
                  "bloomLevel": "apply"
                }
              ],
              "isOptional": false
            },
            {
              "_id": "sub-2",
              "title": "CSS Selectors & Properties",
              "difficulty": "medium",
              "isOptional": false
            }
          ]
        }
      ]
    }
  ]
}
```

## 🛠️ Development Roadmap

- [ ] **Integrate Real LLM** - Replace mock structure with OpenAI/Claude API
- [ ] **Drag & Drop Reordering** - Implement drag handlers in ModuleTree
- [ ] **Prerequisites Validation** - Enforce prerequisite chains on student side
- [ ] **Content Analytics** - Track which content nodes are most used
- [ ] **Export/Import** - SCORM/xAPI compatibility
- [ ] **Collaborative Editing** - Multi-instructor course building
- [ ] **Version Control** - Track structure changes over time
- [ ] **Student Progress Tracking** - Map progress to specific subtopics

## 🐛 Troubleshooting

### "Module not found" error
- Ensure `courseId` is valid in URL
- Check Module document exists in MongoDB
- Verify course ownership

### AI generation returns generic structure
- Topics/subtopics may be too dense
- Enhance LLM prompt with more context
- Manually edit after generation

### Content upload fails
- Check file size limits
- Verify Cloudinary credentials configured
- Ensure target node ID is valid

## 📚 Files Reference

**Backend:**
- Models: `backend/src/models/{topic,subtopic,content}.model.js`
- Controller: `backend/src/controllers/courseGeneration.controller.js`
- Routes: `backend/src/routes/courseGeneration.routes.js`

**Frontend:**
- Hook: `frontend/src/hooks/useCourseBuilder.tsx`
- Components: `frontend/src/components/instructor/{ModuleTree,TopicEditor,SubtopicEditor,ContentUpload}.tsx`
- Page: `frontend/src/pages/instructor/CourseBuilder.tsx`

## 🔐 Security Notes

- Verify instructor owns course before structure edits
- Validate content URLs before storing
- Sanitize learning outcome descriptions
- Rate-limit AI generation endpoint
- Implement audit logs for structure changes

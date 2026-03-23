# Integration Guide - Course Builder 2.0

## 🎯 Quick Start for Developers

This guide walks through the complete integration steps needed to get the upgraded Course Builder running.

## 1️⃣ Backend Setup

### Step 1: Update `backend/src/app.js`

Add the course generation routes:

```javascript
import courseGenerationRoutes from './routes/courseGeneration.routes.js';

// ... existing imports and middleware ...

// Add this line where you register other routes
app.use('/api/courses', courseGenerationRoutes);

// Make sure this is BEFORE your 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});
```

### Step 2: Verify Models are Exported

Ensure these models are available in your codebase:
- ✅ `Topic` (new) - `backend/src/models/topic.model.js`
- ✅ `Subtopic` (new) - `backend/src/models/subtopic.model.js`
- ✅ `Content` (new) - `backend/src/models/content.model.js`
- ✅ `Module` - already exists
- ✅ `Course` - already exists

### Step 3: (Optional) Implement Real AI Generation

In `backend/src/controllers/courseGeneration.controller.js`, replace the mock generator:

**Option A: OpenAI**
```bash
npm install openai
```

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateStructureWithAI(title, description) {
  const prompt = `
    You are an expert course designer. Generate a detailed course structure for:
    
    Title: ${title}
    Description: ${description}
    
    Return a JSON object with this structure:
    {
      "modules": [
        {
          "name": "Module Title",
          "description": "...",
          "topics": [
            {
              "name": "Topic Title",
              "difficulty": "easy|medium|hard",
              "description": "...",
              "learning_outcomes": [
                {
                  "description": "...",
                  "bloomLevel": "remember|understand|apply|analyze|evaluate|create"
                }
              ],
              "estimated_duration": 45,
              "subtopics": [
                {
                  "name": "Subtopic",
                  "difficulty": "easy",
                  "description": "...",
                  "learning_outcomes": [...],
                  "estimated_duration": 15,
                  "is_optional": false
                }
              ]
            }
          ]
        }
      ]
    }
    
    Requirements:
    - Create 3-5 modules
    - Each module has 2-4 topics
    - Each topic has 2-3 subtopics
    - Include realistic time estimates
    - Use varied difficulty levels
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
}

// In generateCourseStructure controller:
export const generateCourseStructure = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // Replace mock with real generation
    const generatedStructure = await generateStructureWithAI(title, description);
    
    return res.status(200).json({ success: true, data: generatedStructure });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
```

## 2️⃣ Frontend Setup

### Step 1: Verify Provider Wrapper

Ensure `CourseBuilder.tsx` is wrapped with `CourseBuilderProvider`. It's already done in the updated file - the provider wrapping is at the bottom.

### Step 2: Configure API Base URL

In `frontend/src/hooks/useCourseBuilder.tsx`, update the fetch calls with your backend URL:

```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// In loadStructure:
const response = await fetch(`${API_BASE}/api/courses/${courseId}/structure`);

// In generateStructure:
const response = await fetch(
  `${API_BASE}/api/courses/${courseId}/generate-structure`,
  { /* ... */ }
);
```

Create `.env` file in frontend root:
```env
REACT_APP_API_URL=http://localhost:5000
```

### Step 3: Add Missing UI Components (if needed)

Check if these components exist in your project:
- `@/components/ui/card` ✅
- `@/components/ui/button` ✅
- `@/components/ui/input` ✅
- `@/components/ui/select` ✅
- `@/components/ui/checkbox` ✅

If any are missing, they're likely shadcn/ui components. Install:
```bash
npm install shadcn-ui
```

## 3️⃣ Database Schema Validation

### Ensure Unique Indexes

In your MongoDB setup, verify these indexes exist:

```javascript
// For Topic model
db.topics.createIndex({ module: 1, order: 1 }, { unique: true });
db.topics.createIndex({ course: 1 });

// For Subtopic model
db.subtopics.createIndex({ topic: 1, order: 1 }, { unique: true });
db.subtopics.createIndex({ course: 1 });

// For Content model
db.contents.createIndex({ course: 1 });
db.contents.createIndex({ topic: 1 });
db.contents.createIndex({ subtopic: 1 });
```

## 4️⃣ Testing the System

### Test 1: Generate Course Structure

```bash
curl -X POST http://localhost:5000/api/courses/COURSE_ID/generate-structure \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Full-Stack Web Development",
    "description": "Learn HTML, CSS, JavaScript, Node.js, and MongoDB"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "modules": [...]
  }
}
```

### Test 2: Save Structure

```bash
curl -X POST http://localhost:5000/api/courses/COURSE_ID/save-structure \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      {
        "name": "Module 1",
        "description": "...",
        "topics": [...]
      }
    ]
  }'
```

### Test 3: Get Structure

```bash
curl http://localhost:5000/api/courses/COURSE_ID/structure
```

## 5️⃣ Feature Completion Checklist

### Implemented ✅
- [x] Graph-based data model (Module → Topic → Subtopic)
- [x] Learning outcomes with Bloom levels
- [x] Difficulty assignment
- [x] Prerequisite support (model-ready)
- [x] Alternate paths (model-ready)
- [x] Content abstraction (model-ready)
- [x] AI generation endpoint (mock-ready)
- [x] Three-step UI flow
- [x] ModuleTree component
- [x] TopicEditor component
- [x] SubtopicEditor component
- [x] ContentUpload component
- [x] State management hook

### To Implement 🚧
- [ ] Real LLM integration (OpenAI/Claude)
- [ ] Content file upload handler
- [ ] Drag & drop reordering (use react-dnd or react-beautiful-dnd)
- [ ] Prerequisite validation for students
- [ ] Progress tracking per subtopic
- [ ] Course preview mode
- [ ] Bulk import/export
- [ ] Student enrollment logic

## 6️⃣ Common Issues & Solutions

### Issue: "CourseBuilderProvider not found"
**Solution:** Make sure the provider component is wrapping your page:
```tsx
export default function CourseBuilderPage() {
  return (
    <CourseBuilderProvider>
      <CourseBuilderContent />
    </CourseBuilderProvider>
  );
}
```

### Issue: "API returns 404"
**Solution:** Verify routes are registered in `app.js` and MongoDB connection is active

### Issue: "Modules not showing in tree"
**Solution:** Check useCourseBuilder hook is called within CourseBuilderProvider context

### Issue: "Content upload button disabled"
**Solution:** Ensure a node (topic/subtopic) is selected - check selectedNodeId in hook state

## 7️⃣ Customization Examples

### Add Custom Fields to Topic

1. Update model in `backend/src/models/topic.model.js`:
```javascript
const topicSchema = new mongoose.Schema({
  // ... existing fields
  customField: {
    type: String,
    default: ""
  }
});
```

2. Update TopicEditor in `frontend/src/components/instructor/TopicEditor.tsx`:
```tsx
<Input
  value={topic.customField || ""}
  onChange={(e) => onUpdate({ ...topic, customField: e.target.value })}
  placeholder="Custom field"
/>
```

### Add Prerequisite Validation UI

Create new component `PrerequisiteSelector.tsx`:
```tsx
export function PrerequisiteSelector({ 
  topic, 
  allTopics, 
  onUpdate 
}) {
  return (
    <div>
      <h4>Prerequisites</h4>
      {allTopics.map(t => (
        <label key={t._id}>
          <Checkbox
            checked={topic.prerequisites?.includes(t._id)}
            onChange={(checked) => {
              const updated = checked
                ? [...(topic.prerequisites || []), t._id]
                : topic.prerequisites?.filter(id => id !== t._id) || [];
              onUpdate({ ...topic, prerequisites: updated });
            }}
          />
          {t.title}
        </label>
      ))}
    </div>
  );
}
```

## 8️⃣ Performance Optimization

### For Large Courses
- Cache course structure in frontend state
- Use pagination for content list
- Implement virtual scrolling for tree (react-window)
- Add loading skeletons

### Backend Optimization
- Create composite indexes for common queries
- Implement cursor-based pagination
- Use projection to fetch only needed fields
- Cache API responses with Redis

## Next Steps

1. ✅ Deploy backend models and routes
2. ✅ Test API endpoints manually
3. ✅ Verify frontend can fetch/load structures
4. ✅ Implement real LLM integration
5. ✅ Add drag & drop reordering
6. ✅ Implement student-facing course viewer
7. ✅ Add course enrollment and progress tracking
8. ✅ Deploy to production

---

**Questions?** Check `COURSE_BUILDER_DOCS.md` for more detailed documentation.

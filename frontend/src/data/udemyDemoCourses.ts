export type CurriculumLecture = {
  title: string;
  duration: string;
  preview?: boolean;
};

export type CurriculumWeek = {
  week: string;
  lectures: CurriculumLecture[];
};

export type DemoCourse = {
  id: string;
  title: string;
  instructor: string;
  instructorSubtitle: string;
  rating: number;
  reviews: string;
  students: string;
  price: string;
  oldPrice?: string;
  tags: string[];
  image: string;
  updatedAt: string;
  totalHours: string;
  level: string;
  subtitles: string;
  description: string;
  previewPoints: string[];
  topics: string[];
  curriculum: CurriculumWeek[];
};

export type DemoCourseSection = {
  id: string;
  title: string;
  subtitle: string;
  courseIds: string[];
};

export const demoCourses: DemoCourse[] = [
  {
    id: "agentic-ai-mcp",
    title: "AI Engineer Agentic Track: The Complete Agent and MCP Course",
    instructor: "Ed Donner",
    instructorSubtitle: "Ligency",
    rating: 4.7,
    reviews: "34,478",
    students: "117,225",
    price: "INR 799",
    oldPrice: "INR 2,999",
    tags: ["Premium", "Bestseller"],
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "March 2026",
    totalHours: "17h 2m",
    level: "All Levels",
    subtitles: "English, Hindi",
    description: "Boost your agentic engineering game by mastering modern AI agents, MCP integrations, and real deployment workflows.",
    previewPoints: [
      "Use AI coding tools efficiently to write and ship projects faster",
      "Build autonomous multi-step workflows with MCP tools",
      "Understand subagents, skills, memory, and orchestration patterns",
    ],
    topics: ["AI Agents & Agentic AI", "Large Language Models (LLM)", "MCP", "Development"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - Autonomous Agent Demo: N8N + Smart Home", duration: "7:15", preview: true },
          { title: "Day 1 - Agent Frameworks: OpenAI SDK, Crew AI, LangGraph", duration: "11:36", preview: true },
          { title: "Day 1 - Agent Engineering Setup and Toolchain", duration: "11:50" },
          { title: "Day 2 - Build Your First Agentic Workflow", duration: "17:35" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - Memory and Retrieval Strategies", duration: "13:18" },
          { title: "Day 2 - Tool Calling and Safety Guardrails", duration: "15:12" },
          { title: "Day 3 - Evaluation and Prompt Iteration", duration: "9:40" },
        ],
      },
    ],
  },
  {
    id: "llm-engineering-rag",
    title: "AI Engineer Core Track: LLM Engineering, RAG, QLoRA",
    instructor: "Ligency",
    instructorSubtitle: "Ed Donner",
    rating: 4.7,
    reviews: "30,855",
    students: "98,111",
    price: "INR 3,289",
    oldPrice: "INR 6,499",
    tags: ["Premium", "Bestseller"],
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "February 2026",
    totalHours: "22h 10m",
    level: "Intermediate",
    subtitles: "English",
    description: "Master practical LLM engineering with retrieval pipelines, model adaptation, and robust production patterns.",
    previewPoints: [
      "Design scalable RAG architectures",
      "Fine-tune models efficiently with low-rank methods",
      "Ship secure and observable AI APIs",
    ],
    topics: ["RAG", "LLMOps", "Vector Databases"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - LLM Architecture and Context Windows", duration: "9:22", preview: true },
          { title: "Day 2 - Embeddings, Chunking, and Retrieval", duration: "14:31" },
          { title: "Day 3 - Prompt Patterns for Reliability", duration: "12:14" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - QLoRA and Adapter Tuning", duration: "16:18" },
          { title: "Day 2 - Guardrails and Hallucination Reduction", duration: "13:28" },
        ],
      },
    ],
  },
  {
    id: "python-100-days",
    title: "100 Days of Code: The Complete Python Pro Bootcamp",
    instructor: "Dr. Angela Yu",
    instructorSubtitle: "Developer and Lead Instructor",
    rating: 4.7,
    reviews: "417,127",
    students: "1,900,000",
    price: "INR 3,199",
    oldPrice: "INR 6,999",
    tags: ["Premium", "Bestseller"],
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "January 2026",
    totalHours: "58h",
    level: "Beginner",
    subtitles: "English",
    description: "Build 100 real Python projects and go from absolute beginner to confident software developer.",
    previewPoints: [
      "Build automation and web projects",
      "Learn Python from fundamentals to advanced topics",
      "Create portfolio-ready mini products",
    ],
    topics: ["Python", "Automation", "Web Development"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - Python Setup and Syntax", duration: "10:13", preview: true },
          { title: "Day 2 - Variables, Loops, and Functions", duration: "14:41" },
          { title: "Day 3 - Project: Password Generator", duration: "18:50" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - APIs and JSON", duration: "12:08" },
          { title: "Day 2 - Flask Crash Course", duration: "20:44" },
        ],
      },
    ],
  },
  {
    id: "aws-saa-2026",
    title: "Ultimate AWS Certified Solutions Architect Associate 2026",
    instructor: "Stephane Maarek",
    instructorSubtitle: "AWS Certified Cloud Professional",
    rating: 4.7,
    reviews: "284,934",
    students: "893,100",
    price: "INR 3,469",
    oldPrice: "INR 7,299",
    tags: ["Premium", "Bestseller"],
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "March 2026",
    totalHours: "27h",
    level: "Intermediate",
    subtitles: "English",
    description: "A complete, practical path to clear the SAA exam with architecture patterns and hands-on demos.",
    previewPoints: [
      "Understand AWS core services deeply",
      "Solve architecture case studies",
      "Prepare using exam-focused walkthroughs",
    ],
    topics: ["AWS", "Cloud Architecture", "Certification"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - IAM, VPC, and Security Basics", duration: "11:09", preview: true },
          { title: "Day 2 - Compute and Storage Services", duration: "16:10" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - High Availability Patterns", duration: "13:27" },
          { title: "Day 2 - Exam Scenario Drills", duration: "20:02" },
        ],
      },
    ],
  },
  {
    id: "fullstack-web-bootcamp",
    title: "The Complete Full-Stack Web Development Bootcamp",
    instructor: "Dr. Angela Yu",
    instructorSubtitle: "Developer and Lead Instructor",
    rating: 4.7,
    reviews: "466,653",
    students: "1,500,000",
    price: "INR 3,199",
    oldPrice: "INR 6,299",
    tags: ["Premium", "Bestseller"],
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "November 2025",
    totalHours: "62h",
    level: "All Levels",
    subtitles: "English",
    description: "Become a full-stack web developer with modern frontend and backend projects from scratch.",
    previewPoints: [
      "Build 16+ complete portfolio projects",
      "Master HTML, CSS, JavaScript, React, and Node",
      "Understand deployment and production workflows",
    ],
    topics: ["Web Development", "React", "Node.js"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - HTML and CSS Foundations", duration: "9:58", preview: true },
          { title: "Day 2 - Responsive Layouts", duration: "14:05" },
          { title: "Day 3 - JavaScript DOM Projects", duration: "17:30" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - React Components and State", duration: "18:29" },
          { title: "Day 2 - APIs and Backend Basics", duration: "15:44" },
        ],
      },
    ],
  },
  {
    id: "ai-engineer-bootcamp-2026",
    title: "The AI Engineer Course 2026: Complete AI Engineer Bootcamp",
    instructor: "365 Careers",
    instructorSubtitle: "Career-focused training",
    rating: 4.6,
    reviews: "18,073",
    students: "102,772",
    price: "INR 3,089",
    oldPrice: "INR 5,999",
    tags: ["Bestseller"],
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "March 2026",
    totalHours: "44h",
    level: "All Levels",
    subtitles: "English",
    description: "Career-focused AI engineer path with practical projects and interview-ready system design modules.",
    previewPoints: [
      "Build practical AI applications end-to-end",
      "Practice architecture and product thinking",
      "Prepare for AI engineer interview rounds",
    ],
    topics: ["AI Engineering", "Portfolio", "Career"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - AI Product Landscape", duration: "8:22", preview: true },
          { title: "Day 2 - LLM App Foundations", duration: "12:18" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - Build and Evaluate AI Features", duration: "16:42" },
          { title: "Day 2 - Career and Portfolio Strategy", duration: "10:14" },
        ],
      },
    ],
  },
  {
    id: "claude-code-practical",
    title: "Claude Code - The Practical Guide",
    instructor: "Academind",
    instructorSubtitle: "Maximilian Schwarzmuller",
    rating: 4.6,
    reviews: "3,403",
    students: "15,801",
    price: "INR 1,919",
    oldPrice: "INR 3,499",
    tags: ["Bestseller"],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "March 2026",
    totalHours: "2.5h",
    level: "All Levels",
    subtitles: "CC",
    description: "Master Claude Code basics and advanced features to build software with AI efficiently.",
    previewPoints: [
      "Use Claude Code workflows for real project tasks",
      "Build programs with practical prompt sequences",
      "Understand subagents, skills, and memory usage",
    ],
    topics: ["Claude", "AI Coding", "Agent Workflows"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - Setup and Workspace Patterns", duration: "6:13", preview: true },
          { title: "Day 2 - Prompting and Tooling Shortcuts", duration: "8:32" },
          { title: "Day 3 - Build a Complete AI Coding Flow", duration: "12:40" },
        ],
      },
    ],
  },
  {
    id: "python-zero-to-hero",
    title: "The Complete Python Bootcamp: From Zero to Hero",
    instructor: "Jose Portilla",
    instructorSubtitle: "Pierian Training",
    rating: 4.6,
    reviews: "558,212",
    students: "1,300,000",
    price: "INR 3,199",
    oldPrice: "INR 6,699",
    tags: ["Premium"],
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    updatedAt: "December 2025",
    totalHours: "25h",
    level: "Beginner",
    subtitles: "English",
    description: "Learn Python from zero and build confidence with exercises, mini projects, and practical coding drills.",
    previewPoints: [
      "Write clean and readable Python code",
      "Practice problem-solving with real examples",
      "Build scripts and automate workflows",
    ],
    topics: ["Python", "Beginner Coding", "Automation"],
    curriculum: [
      {
        week: "Week 1",
        lectures: [
          { title: "Day 1 - Intro to Python and Variables", duration: "9:30", preview: true },
          { title: "Day 2 - Data Structures and Loops", duration: "13:22" },
        ],
      },
      {
        week: "Week 2",
        lectures: [
          { title: "Day 1 - Functions and Modules", duration: "11:17" },
          { title: "Day 2 - Project: Command-line Utility", duration: "18:06" },
        ],
      },
    ],
  },
];

export const demoCourseSections: DemoCourseSection[] = [
  {
    id: "trending",
    title: "Trending courses",
    subtitle: "Learners are loving these right now",
    courseIds: ["agentic-ai-mcp", "llm-engineering-rag", "python-100-days", "aws-saa-2026", "fullstack-web-bootcamp"],
  },
  {
    id: "development",
    title: "Top courses in Development",
    subtitle: "Grow your builder stack with practical projects",
    courseIds: ["fullstack-web-bootcamp", "ai-engineer-bootcamp-2026", "claude-code-practical", "python-zero-to-hero", "agentic-ai-mcp"],
  },
  {
    id: "ai-career",
    title: "Recommended for your AI journey",
    subtitle: "Selected based on your recent learning activity",
    courseIds: ["agentic-ai-mcp", "claude-code-practical", "llm-engineering-rag", "ai-engineer-bootcamp-2026", "python-100-days"],
  },
];

export function getCourseById(courseId: string) {
  return demoCourses.find((course) => course.id === courseId);
}

export function getSectionCourses(section: DemoCourseSection) {
  return section.courseIds
    .map((id) => getCourseById(id))
    .filter((course): course is DemoCourse => Boolean(course));
}

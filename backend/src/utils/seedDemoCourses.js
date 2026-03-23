import dotenv from "dotenv";
import connectDB from "../db/db.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";

dotenv.config();

const sampleVideos = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
];

const courseBlueprints = [
    {
        title: "AI Engineering Fundamentals",
        description:
            "Build strong foundations in AI, Python, machine learning, and deep learning with practical demos.",
        category: "Artificial Intelligence",
        level: "beginner",
        language: "English",
        price: 0,
        tags: ["ai", "python", "machine learning", "deep learning", "demo-seed"],
        modules: [
            {
                title: "AI Core",
                description: "Understand AI concepts and workflows.",
                lessons: [
                    "What Is AI and Where It Is Used",
                    "Python for AI Quickstart",
                    "Machine Learning Basics",
                    "Deep Learning Essentials",
                ],
            },
            {
                title: "AI Hands-on",
                description: "Train and evaluate your first models.",
                lessons: [
                    "Feature Engineering in Python",
                    "Building a Classification Model",
                    "Neural Network Training Walkthrough",
                ],
            },
        ],
    },
    {
        title: "Data Science with Python",
        description:
            "Learn pandas, visualization, and model pipelines for practical data science projects.",
        category: "Data Science",
        level: "intermediate",
        language: "English",
        price: 0,
        tags: ["data science", "python", "pandas", "demo-seed"],
        modules: [
            {
                title: "Data Analysis Foundations",
                description: "Clean, analyze, and visualize real datasets.",
                lessons: [
                    "Pandas DataFrames Deep Dive",
                    "Data Cleaning Strategies",
                    "Exploratory Data Analysis",
                ],
            },
            {
                title: "Modeling Pipeline",
                description: "Build and evaluate machine learning pipelines.",
                lessons: [
                    "Train-Test Splits and Validation",
                    "Regression and Classification Overview",
                    "Model Evaluation and Reporting",
                ],
            },
        ],
    },
    {
        title: "Full Stack Web Development",
        description:
            "Master frontend and backend basics to build and deploy production-ready web apps.",
        category: "Web Development",
        level: "beginner",
        language: "English",
        price: 0,
        tags: ["web", "react", "node", "express", "demo-seed"],
        modules: [
            {
                title: "Frontend Essentials",
                description: "Build responsive UIs with modern tooling.",
                lessons: [
                    "HTML, CSS, and JavaScript Refresh",
                    "React Components and State",
                    "Routing and Page Architecture",
                ],
            },
            {
                title: "Backend APIs",
                description: "Design secure APIs and connect databases.",
                lessons: [
                    "Node and Express API Basics",
                    "MongoDB Modeling and Queries",
                    "Authentication and Authorization",
                ],
            },
        ],
    },
    {
        title: "Cloud and DevOps Essentials",
        description:
            "Get practical skills in Docker, CI/CD, cloud deployment, and production monitoring.",
        category: "DevOps",
        level: "intermediate",
        language: "English",
        price: 0,
        tags: ["devops", "docker", "cloud", "ci/cd", "demo-seed"],
        modules: [
            {
                title: "DevOps Fundamentals",
                description: "Understand modern delivery workflows.",
                lessons: [
                    "Version Control and Branching Workflows",
                    "Docker Images and Containers",
                    "CI/CD Pipeline Concepts",
                ],
            },
            {
                title: "Cloud Deployment",
                description: "Ship apps with reliability and visibility.",
                lessons: [
                    "Deploying a Web App to Cloud",
                    "Observability and Logs",
                    "Scaling and Incident Response",
                ],
            },
        ],
    },
    {
        title: "Cybersecurity Foundations",
        description:
            "Understand security principles, secure coding, and practical risk mitigation for developers.",
        category: "Cybersecurity",
        level: "beginner",
        language: "English",
        price: 0,
        tags: ["security", "owasp", "secure coding", "demo-seed"],
        modules: [
            {
                title: "Security Basics",
                description: "Learn threats, vulnerabilities, and attack surfaces.",
                lessons: [
                    "Threat Modeling 101",
                    "Common Web Vulnerabilities",
                    "Authentication and Session Security",
                ],
            },
            {
                title: "Secure Engineering",
                description: "Apply practical controls in development workflows.",
                lessons: [
                    "Input Validation and Sanitization",
                    "Dependency and Secrets Management",
                    "Security Testing in CI/CD",
                ],
            },
        ],
    },
];

async function seedDemoCourses() {
    await connectDB();

    const instructorEmail = "demo.instructor@recursion.local";

    let instructor = await User.findOne({ email: instructorEmail });
    if (!instructor) {
        instructor = await User.create({
            fullname: "Demo Instructor",
            username: "demo_instructor",
            email: instructorEmail,
            password: "Demo@12345",
            role: "instructor",
        });
    }

    for (const blueprint of courseBlueprints) {
        let course = await Course.findOne({
            title: blueprint.title,
            instructor: instructor._id,
        });

        if (!course) {
            course = await Course.create({
                title: blueprint.title,
                description: blueprint.description,
                instructor: instructor._id,
                category: blueprint.category,
                level: blueprint.level,
                language: blueprint.language,
                price: blueprint.price,
                tags: blueprint.tags,
                status: "published",
                isApproved: true,
                thumbnail:
                    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
            });
        } else {
            course.description = blueprint.description;
            course.category = blueprint.category;
            course.level = blueprint.level;
            course.language = blueprint.language;
            course.price = blueprint.price;
            course.tags = blueprint.tags;
            course.status = "published";
            course.isApproved = true;
            await course.save();
        }

        const existingModules = await Module.find({ course: course._id }).select("_id");
        const existingModuleIds = existingModules.map((m) => m._id);
        await Lesson.deleteMany({ module: { $in: existingModuleIds } });
        await Module.deleteMany({ course: course._id });

        let totalSeconds = 0;
        let videoIndex = 0;

        for (let moduleIdx = 0; moduleIdx < blueprint.modules.length; moduleIdx += 1) {
            const moduleData = blueprint.modules[moduleIdx];

            const module = await Module.create({
                title: moduleData.title,
                description: moduleData.description,
                course: course._id,
                order: moduleIdx + 1,
            });

            for (let lessonIdx = 0; lessonIdx < moduleData.lessons.length; lessonIdx += 1) {
                const lessonTitle = moduleData.lessons[lessonIdx];
                const duration = 300 + lessonIdx * 90;
                totalSeconds += duration;

                await Lesson.create({
                    title: lessonTitle,
                    module: module._id,
                    course: course._id,
                    videoUrl: sampleVideos[videoIndex % sampleVideos.length],
                    duration,
                    order: lessonIdx + 1,
                    isFree: true,
                    description: `${lessonTitle} demo lesson`,
                    resources: [
                        {
                            title: "Official Docs",
                            url: "https://developer.mozilla.org/",
                            type: "link",
                        },
                    ],
                });

                videoIndex += 1;
            }
        }

        course.totalDuration = Math.ceil(totalSeconds / 60);
        await course.save();
    }

    console.log("Demo course data seeded successfully");
    process.exit(0);
}

seedDemoCourses().catch((error) => {
    console.error("Failed to seed demo courses", error);
    process.exit(1);
});

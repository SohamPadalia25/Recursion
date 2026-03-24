// FLASHCARD GENERATOR AGENT
// Reads lesson transcript and generates spaced-repetition flashcards via Groq
// Implements SM-2 algorithm for review scheduling

import { chatWithGroq } from "./groq.service.js";
import { Flashcard } from "../models/flashCard.model.js";
import { Lesson } from "../models/lesson.model.js";

// ─────────────────────────────────────────────
// GENERATE FLASHCARDS FROM LESSON
// Called after lesson is completed
// ─────────────────────────────────────────────
const generateFlashcards = async (studentId, lessonId, courseId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");

  // Check if flashcards already exist for this student + lesson
  const existing = await Flashcard.countDocuments({
    student: studentId,
    lesson: lessonId,
  });
  if (existing > 0) return { message: "Flashcards already generated", count: existing };

  const context = lesson.transcript
    ? lesson.transcript.slice(0, 2500)
    : `Lesson: ${lesson.title}. Generate general concept flashcards.`;

  const prompt = `
Generate 8 high-quality flashcards from this lesson content.
Focus on: key definitions, important concepts, formulas, and distinctions.
Make questions specific and answers concise (1-3 sentences).

Lesson content:
"""
${context}
"""

Return ONLY valid JSON:
{
  "flashcards": [
    {
      "question": "What is ...?",
      "answer": "It is ..."
    }
  ]
}
`;

  const raw = await chatWithGroq(
    [{ role: "user", content: prompt }],
    process.env.GROQ_FLASHCARD_MODEL,
    true
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match[0]);
  }

  // Save flashcards with initial SM-2 values
  const flashcardsToInsert = parsed.flashcards.map((fc) => ({
    student: studentId,
    lesson: lessonId,
    course: courseId,
    question: fc.question,
    answer: fc.answer,
    isAIGenerated: true,
    nextReviewAt: new Date(), // due immediately
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 1,
  }));

  const saved = await Flashcard.insertMany(flashcardsToInsert);
  return { generated: saved.length, flashcards: saved };
};

// ─────────────────────────────────────────────
// SM-2 SPACED REPETITION — update after review
// quality: 0-5 (0=blackout, 3=correct with effort, 5=perfect)
// ─────────────────────────────────────────────
const reviewFlashcard = async (flashcardId, studentId, quality) => {
  const card = await Flashcard.findOne({ _id: flashcardId, student: studentId });
  if (!card) throw new Error("Flashcard not found");

  // SM-2 Algorithm
  let { easeFactor, interval, reviewCount } = card;

  if (quality >= 3) {
    // Correct response
    if (reviewCount === 0) interval = 1;
    else if (reviewCount === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );
  } else {
    // Incorrect — reset
    interval = 1;
    // easeFactor stays the same
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  card.easeFactor = easeFactor;
  card.interval = interval;
  card.reviewCount = reviewCount + 1;
  card.nextReviewAt = nextReviewAt;
  card.lastReviewedAt = new Date();
  await card.save();

  return {
    nextReviewAt,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
  };
};

// ─────────────────────────────────────────────
// GET DUE FLASHCARDS FOR TODAY
// ─────────────────────────────────────────────
const getDueFlashcards = async (studentId, courseId) => {
  return await Flashcard.find({
    student: studentId,
    course: courseId,
    nextReviewAt: { $lte: new Date() },
  })
    .limit(20)
    .select("question answer easeFactor interval reviewCount");
};

export { generateFlashcards, reviewFlashcard, getDueFlashcards };
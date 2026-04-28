export type PromptClarification = {
  id: string;
  question: string;
  options: string[];
};

const ENVIRONMENT_WORDS = /\b(indoor|indoors|inside|outdoor|outdoors|outside|garden|park|field|open air|open-air|tent|marquee)\b/i;
const LAYOUT_WORDS = /\b(banquet|round table|classroom|theatre|theater|auditorium|boardroom|u[-\s]?shape|cabaret|cocktail|lounge|exhibition|booth|pods?)\b/i;
const CAPACITY_WORDS = /\b(\d{2,4})\s*(people|guests|attendees|pax|seats?|chairs?)?\b/i;
const AV_WORDS = /\b(livestream|live stream|streaming|camera|screen|projector|speaker|audio|av|pa system|recording)\b/i;
const STYLE_WORDS = /\b(premium|luxury|basic|simple|standard|elegant|formal|casual|corporate|chapel|concert)\b/i;

export function getPromptClarifications(prompt: string): PromptClarification[] {
  const questions: PromptClarification[] = [];

  if (!ENVIRONMENT_WORDS.test(prompt)) {
    questions.push({
      id: "environment",
      question: "Is this event indoor or outdoor?",
      options: ["Indoor", "Outdoor", "Tent / marquee"],
    });
  }

  if (!LAYOUT_WORDS.test(prompt)) {
    questions.push({
      id: "layout",
      question: "What room layout should the AI plan around?",
      options: ["Banquet", "Theatre", "Classroom", "Boardroom"],
    });
  }

  if (!CAPACITY_WORDS.test(prompt)) {
    questions.push({
      id: "capacity",
      question: "How many people should the layout support?",
      options: ["80 guests", "150 guests", "250 guests", "400 guests"],
    });
  }

  if (!AV_WORDS.test(prompt)) {
    questions.push({
      id: "av",
      question: "Should it include production equipment?",
      options: ["Screen + audio", "Livestream cameras", "No AV needed"],
    });
  }

  if (!STYLE_WORDS.test(prompt)) {
    questions.push({
      id: "style",
      question: "What finish level should it assume?",
      options: ["Standard", "Premium", "Simple"],
    });
  }

  return questions.slice(0, 4);
}

export function buildClarifiedPrompt(
  prompt: string,
  answers: Record<string, string>,
) {
  const selected = Object.values(answers).filter(Boolean);
  if (!selected.length) return prompt.trim();

  return `${prompt.trim()}\n\nClarifications: ${selected.join("; ")}.`;
}

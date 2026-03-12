export const STAGES = ["Incoming", "Verified", "Mobilizing", "Resolved"];

const URGENCY_TERMS = [
  "urgent",
  "critical",
  "immediately",
  "medical",
  "injured",
  "evacuate",
  "evacuation",
  "rescue",
  "flood",
  "storm",
  "blocked",
  "landslide",
  "missing",
  "before nightfall",
  "tonight",
  "asap"
];

const IMPACT_TERMS = [
  "families",
  "children",
  "elderly",
  "village",
  "community",
  "district",
  "shelter",
  "camp",
  "clinic",
  "school",
  "water",
  "food",
  "medicine",
  "power",
  "volunteer",
  "translation"
];

const HIGH_EFFORT_TERMS = [
  "coordinate",
  "dispatch",
  "transport",
  "procure",
  "verification",
  "survey",
  "briefing",
  "generator",
  "shelter",
  "medical",
  "supply",
  "infrastructure",
  "multi-agency"
];

const LOW_EFFORT_TERMS = [
  "call",
  "message",
  "text",
  "share",
  "checklist",
  "brief",
  "confirm",
  "update",
  "template",
  "draft"
];

const CATEGORY_RULES = [
  { label: "Search & Rescue", keywords: ["rescue", "trapped", "missing", "evacuate", "boat", "extraction"] },
  { label: "Medical", keywords: ["medical", "injured", "clinic", "triage", "medicine", "ambulance", "insulin"] },
  { label: "Shelter", keywords: ["shelter", "camp", "blanket", "cots", "evacuation center", "sleep", "families"] },
  { label: "Logistics", keywords: ["truck", "transport", "road", "fuel", "generator", "supply", "warehouse", "water", "food"] },
  { label: "Assessment", keywords: ["assessment", "survey", "damage", "verify", "report", "needs", "coverage"] },
  { label: "Volunteer Ops", keywords: ["volunteer", "shift", "roster", "crew", "training", "registration", "safety"] },
  { label: "Community Comms", keywords: ["radio", "hotline", "whatsapp", "outreach", "translation", "brief", "message", "update"] }
];

const WINDOW_SPECS = [
  { label: "0-6 hrs", startOffsetHours: 0, endOffsetHours: 6, emphasis: "Triage and verification" },
  { label: "6-24 hrs", startOffsetHours: 6, endOffsetHours: 24, emphasis: "Dispatch crews and stabilize supply" },
  { label: "24-48 hrs", startOffsetHours: 24, endOffsetHours: 48, emphasis: "Scale shelter and service coverage" },
  { label: "48-72 hrs", startOffsetHours: 48, endOffsetHours: 72, emphasis: "Recovery handoff and follow-up" }
];

const WINDOW_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric"
});

const RANGE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  hour: "numeric"
});

const PARTNER_PLAYBOOK = {
  "Search & Rescue": "alert municipal rescue leads and trusted boat teams with last-known locations and access constraints",
  Medical: "call clinic coordinators and ambulance leads to confirm medicine gaps, triage load, and transport needs",
  Shelter: "contact school shelters and community centers to confirm bed capacity, water points, and protection coverage",
  Logistics: "activate transport unions and local suppliers for route status, fuel, and last-mile delivery support",
  Assessment: "push field assessment leads for verified counts, GPS-tagged notes, and infrastructure status",
  "Volunteer Ops": "message volunteer captains with roster gaps, safety instructions, and shift assignments",
  "Community Comms": "brief local radio, WhatsApp admins, and translators with verified public guidance"
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

function dedupe(items) {
  return [...new Map(items.map((item) => [item.toLowerCase(), item])).values()];
}

function cleanSegment(segment) {
  return segment
    .replace(/^[\s>*-]+/, "")
    .replace(/^\d+[\).\s-]+/, "")
    .replace(/^(goal|update|report|note|notes|problem|issue|idea|todo|action|assessment|needs assessment|field update)\s*:\s*/i, "")
    .replace(/^(we need to|need to|must|should|please|can we|could we|let'?s)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(text) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function titleFromSignal(segment) {
  const cleaned = cleanSegment(segment).replace(/[.?!]+$/, "");
  const words = cleaned.split(" ").filter(Boolean);
  const shortened = words.length > 7 ? `${words.slice(0, 7).join(" ")}...` : cleaned;
  return sentenceCase(shortened);
}

function descriptionFromSignal(segment) {
  return sentenceCase(cleanSegment(segment));
}

function detectCategory(segment) {
  const text = segment.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.label;
    }
  }

  return "Coordination";
}

function scoreUrgency(segment) {
  const text = segment.toLowerCase();
  let score = 44;

  score += countKeywordHits(text, URGENCY_TERMS) * 8;

  if (/\b(no water|power outage|road blocked|children|injured|isolated)\b/.test(text)) {
    score += 14;
  }

  if (/\b(today|tonight|this morning|before sunset|before nightfall|within 6 hours)\b/.test(text)) {
    score += 12;
  }

  if (/\b(monitor|later|eventually|nice to have)\b/.test(text)) {
    score -= 14;
  }

  return clamp(Math.round(score), 26, 99);
}

function scoreImpact(segment) {
  const text = segment.toLowerCase();
  let score = 48;

  score += countKeywordHits(text, IMPACT_TERMS) * 7;

  if (/\b(families|school|clinic|district|community|water point|evacuation center)\b/.test(text)) {
    score += 12;
  }

  if (/\b(note|draft|internal|cleanup)\b/.test(text)) {
    score -= 8;
  }

  return clamp(Math.round(score), 30, 98);
}

function scoreEffort(segment) {
  const text = segment.toLowerCase();
  const wordCount = cleanSegment(segment).split(" ").filter(Boolean).length;
  let score = 26 + wordCount * 2;

  score += countKeywordHits(text, HIGH_EFFORT_TERMS) * 9;
  score -= countKeywordHits(text, LOW_EFFORT_TERMS) * 6;

  if (/\b(simple|quick|confirm)\b/.test(text)) {
    score -= 6;
  }

  return clamp(Math.round(score), 18, 92);
}

function computePriority(urgency, impact, effort) {
  const priority = urgency * 0.58 + impact * 0.46 - effort * 0.14;
  return clamp(Math.round(priority), 20, 99);
}

function priorityBand(priority) {
  if (priority >= 78) {
    return "Immediate";
  }

  if (priority >= 58) {
    return "Queued";
  }

  return "Monitor";
}

function timeboxLabel(effort) {
  if (effort >= 78) {
    return "Full shift";
  }

  if (effort >= 60) {
    return "Half shift";
  }

  if (effort >= 42) {
    return "90 min";
  }

  return "30 min";
}

function defaultStage(index) {
  if (index <= 1) {
    return "Mobilizing";
  }

  if (index <= 4) {
    return "Verified";
  }

  return "Incoming";
}

function preferredWindowIndexes(signal) {
  const text = signal.source.toLowerCase();

  if (signal.urgency >= 88 || signal.category === "Assessment") {
    return [0, 1, 2, 3];
  }

  if (signal.category === "Medical" || signal.category === "Search & Rescue") {
    return [0, 1, 2, 3];
  }

  if (signal.category === "Logistics" || signal.category === "Shelter") {
    return [1, 0, 2, 3];
  }

  if (/\b(outreach|radio|brief|message|update)\b/.test(text)) {
    return [0, 1, 2, 3];
  }

  if (signal.effort >= 72) {
    return [1, 2, 0, 3];
  }

  return [1, 0, 2, 3];
}

function chooseWindow(signal, windows, windowLoads) {
  const indexes = preferredWindowIndexes(signal);

  return indexes
    .map((index) => windows[index])
    .sort((left, right) => {
      const leftLoad = windowLoads.get(left.key) ?? 0;
      const rightLoad = windowLoads.get(right.key) ?? 0;
      return leftLoad - rightLoad;
    })[0];
}

function createSignal(segment, index) {
  const category = detectCategory(segment);
  const urgency = scoreUrgency(segment);
  const impact = scoreImpact(segment);
  const effort = scoreEffort(segment);
  const priority = computePriority(urgency, impact, effort);

  return {
    id: `signal-${index + 1}`,
    title: titleFromSignal(segment),
    description: descriptionFromSignal(segment),
    category,
    urgency,
    impact,
    effort,
    priority,
    priorityBand: priorityBand(priority),
    timebox: timeboxLabel(effort),
    source: cleanSegment(segment),
    stage: "Incoming",
    dueWindow: "",
    dueLabel: ""
  };
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export function extractSignals(rawText) {
  const segments = rawText
    .split(/\n+/)
    .flatMap((line) => line.split(/[.;](?=\s+[A-Z]|\s*$)/))
    .map(cleanSegment)
    .filter((segment) => segment.length >= 12);

  return dedupe(segments);
}

export function getOperationalWindows(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setMinutes(0, 0, 0);

  return WINDOW_SPECS.map((spec) => {
    const startsAt = addHours(start, spec.startOffsetHours);
    const endsAt = addHours(start, spec.endOffsetHours);

    return {
      key: `${spec.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${startsAt.toISOString()}`,
      label: spec.label,
      dateLabel: `${WINDOW_FORMATTER.format(startsAt)} to ${WINDOW_FORMATTER.format(endsAt)}`,
      emphasis: spec.emphasis,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    };
  });
}

export function sortSignalsForDisplay(signals) {
  return [...signals].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return right.urgency - left.urgency;
  });
}

export function groupTasksByStage(signals) {
  return STAGES.map((stage) => ({
    stage,
    tasks: sortSignalsForDisplay(signals.filter((signal) => signal.stage === stage))
  }));
}

export function groupTasksByWindow(signals, windows) {
  return windows.map((window) => ({
    ...window,
    tasks: sortSignalsForDisplay(signals.filter((signal) => signal.dueWindow === window.key))
  }));
}

export function createInsights(signals, objective, windowLabel) {
  const sorted = sortSignalsForDisplay(signals);
  const topSignal = sorted[0];
  const checklist = sorted.slice(0, 3).map((signal) => signal.title);
  const riskSignal =
    sorted.find((signal) => signal.urgency >= 84 && signal.effort >= 64) ??
    sorted.find((signal) => signal.priorityBand === "Immediate");

  const categoryTotals = new Map();
  for (const signal of sorted.slice(0, 5)) {
    categoryTotals.set(signal.category, (categoryTotals.get(signal.category) ?? 0) + 1);
  }

  const focusCategory =
    [...categoryTotals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Coordination";

  const outreachCategories = dedupe(sorted.slice(0, 3).map((signal) => signal.category));
  const outreachLines = outreachCategories
    .map((category) => PARTNER_PLAYBOOK[category])
    .filter(Boolean)
    .slice(0, 2);

  return {
    headline: objective,
    focus: `${focusCategory} is driving the next operational cycle.`,
    checklist:
      checklist.length > 0 ? checklist : ["Log the first verified update and assign an owner."],
    risk: riskSignal
      ? `${riskSignal.title} carries the most delivery tension. Lock ownership before the ${windowLabel.split(" - ")[0]} checkpoint.`
      : "No major delivery risk detected yet.",
    outreach:
      outreachLines.length > 0
        ? sentenceCase(outreachLines.join(". ")) + "."
        : "Prepare one verified public update and one partner request before the next checkpoint.",
    briefing: topSignal
      ? `Lead the next briefing with ${topSignal.title.toLowerCase()}.`
      : "Lead the next briefing with the highest-confidence field signal.",
    cadence:
      topSignal && topSignal.urgency >= 84
        ? "Verify fresh reports every 3 hours, dispatch within the first 24 hours, and reserve the last window for recovery handoff."
        : "Use the first window for verification, the middle windows for dispatch, and the final window for follow-through."
  };
}

export function generateResponsePlan(
  rawText,
  { objective = "Protect affected households through the next 72 hours", baseDate = new Date(), maxTasks = 8 } = {}
) {
  const segments = extractSignals(rawText);
  const effectiveSegments =
    segments.length > 0 ? segments : [`Clarify the next relief action around ${objective.toLowerCase()}`];

  const windows = getOperationalWindows(baseDate);
  const windowLabel = `${RANGE_FORMATTER.format(new Date(windows[0].startsAt))} - ${RANGE_FORMATTER.format(
    new Date(windows[windows.length - 1].endsAt)
  )}`;

  const rankedSignals = effectiveSegments
    .slice(0, maxTasks)
    .map((segment, index) => createSignal(segment, index))
    .sort((left, right) => right.priority - left.priority)
    .map((signal, index) => ({ ...signal, stage: defaultStage(index) }));

  const windowLoads = new Map(windows.map((window) => [window.key, 0]));
  const tasks = rankedSignals.map((signal) => {
    const selectedWindow = chooseWindow(signal, windows, windowLoads);
    windowLoads.set(selectedWindow.key, (windowLoads.get(selectedWindow.key) ?? 0) + Math.max(1, signal.effort / 32));

    return {
      ...signal,
      dueWindow: selectedWindow.key,
      dueLabel: `${selectedWindow.label} · ${selectedWindow.dateLabel}`
    };
  });

  return {
    tasks,
    windows,
    windowLabel,
    summary: createInsights(tasks, objective, windowLabel),
    generatedAt: new Date(baseDate).toISOString()
  };
}

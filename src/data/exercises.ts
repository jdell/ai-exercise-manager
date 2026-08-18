import type { Exercise } from '../types';

/**
 * The five built-in exercises, in unlock order. A student may only open
 * exercise N once exercise N-1 has been approved by a teacher.
 *
 * Teachers can add custom exercises from the teacher dashboard; those live in
 * the database and are merged with these by useExercises(). Anything that
 * renders or grades an exercise must read that hook, not this constant.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'clear-prompts',
    order: 1,
    title: 'Clear Prompts',
    tagline: 'Say exactly what you want',
    estimatedMinutes: 15,
    pathId: 'fundamentals',
    difficulty: 'intro',
    topic: 'Specificity',
    maxPromptChars: 700,
    source: 'builtin',
    brief:
      'Most disappointing AI output traces back to a prompt that left something to guess. A clear prompt pins down four things: the task, the audience, the constraints, and the shape of the answer. When any of those is missing the model fills the gap with an average-case assumption — and average is rarely what you wanted.',
    task:
      'Write a single prompt that asks for a short explanation of how a bank overdraft fee works, aimed at a 15-year-old who has never had a bank account. Your prompt must make the audience, the length, the tone, and the output structure impossible to misread.',
    tips: [
      'State the audience explicitly — "for a 15-year-old" beats "keep it simple".',
      'Give a measurable length ("under 120 words", "exactly 3 bullets"), not "short".',
      'Describe the output shape you want before you describe the content.',
      'Name what to leave out. Exclusions are constraints too.',
      'Read your prompt back and ask: could a careful stranger get this wrong? Fix whatever they could.',
    ],
    successCriteria: [
      'The prompt names the audience and their assumed knowledge level',
      'The prompt specifies a concrete, checkable length',
      'The prompt defines the output structure (paragraph, bullets, sections)',
      'The prompt sets a tone or reading level',
      'The output that comes back needs no follow-up clarification',
    ],
    starterPrompt:
      'Explain what a bank overdraft fee is.\n\n<!-- That prompt is the "before". Rewrite it below so the audience, length, tone, and output shape are all explicit. Delete this comment when you submit. -->\n',
    evaluatorNotes:
      'The point of this exercise is specificity, not politeness or prompt length. Reward prompts that eliminate guesswork with the fewest words. A long prompt that repeats itself scores lower than a tight one that pins down audience, length, structure, and tone exactly once each. Penalise vague qualifiers like "simple", "short", or "good" that are not backed by a checkable definition.',
  },
  {
    id: 'role-playing',
    order: 2,
    title: 'Role-Playing',
    tagline: 'Give the model a seat at the table',
    estimatedMinutes: 20,
    pathId: 'fundamentals',
    difficulty: 'core',
    topic: 'Personas',
    maxPromptChars: 1000,
    source: 'builtin',
    brief:
      'Assigning a role changes which knowledge the model reaches for and which register it writes in. "You are a pediatric nurse explaining to a worried parent" pulls a different vocabulary, different priorities, and different caveats than the same question asked cold. The technique is only as good as the specificity of the role: a role is a job, an audience, a goal, and a set of things that person would never say.',
    task:
      'Write a prompt that casts Claude as a specific expert reviewing a beginner\'s first résumé. The persona must have a defined job, a defined relationship to the reader, a stated goal for the review, and at least one explicit boundary on what the persona should not do.',
    tips: [
      'Job title alone is thin. Add years, setting, and what they care about.',
      'Define the relationship — a mentor and a gatekeeper give very different feedback.',
      'State the persona\'s goal for this interaction, not just their identity.',
      'Add a boundary: "never rewrite it for them", "do not comment on formatting".',
      'A persona that would refuse to answer something is a persona with real edges.',
    ],
    successCriteria: [
      'The persona has a concrete job, setting, and level of experience',
      'The persona\'s relationship to the reader is stated',
      'The persona has an explicit goal for the review',
      'At least one thing the persona will not do is spelled out',
      'The output reads in the persona\'s voice, not generic assistant voice',
    ],
    starterPrompt:
      'You are a career coach. Review this résumé.\n\n<!-- Thin persona: no setting, no goal, no boundaries. Rebuild it below. -->\n',
    testInput:
      'RESUME\nJordan Mills — jordan.mills@email.com — (555) 019-4432\n\nOBJECTIVE\nLooking for a job where I can grow and learn new things.\n\nEXPERIENCE\nCafe Bloom, Barista, 2023-2025\n- Made drinks\n- Helped customers\n- Cleaned\n\nCity Library, Volunteer, Summer 2023\n- Shelved books\n- Helped at the summer reading desk\n\nEDUCATION\nRiverside High School, expected 2026\n\nSKILLS\nMicrosoft Word, teamwork, hard worker, fast learner',
    evaluatorNotes:
      'Judge how much the persona actually constrains the output, not how elaborate its backstory is. Colourful detail that does not change what the model says is decoration and should not lift the score. The explicit boundary is the highest-signal element: a prompt without one caps Prompt Quality at 74. Check the produced output for persona-consistent voice and priorities.',
  },
  {
    id: 'json-output',
    order: 3,
    title: 'JSON Output',
    tagline: 'Make output a machine can consume',
    estimatedMinutes: 25,
    pathId: 'advanced',
    difficulty: 'core',
    topic: 'Structured output',
    maxPromptChars: 1800,
    source: 'builtin',
    brief:
      'The moment output feeds a program instead of a person, prose becomes a liability. You need a fixed set of keys, predictable types, and a defined answer for the missing case. This is the skill that turns a chat toy into a component of a system — and the failure modes are unforgiving: one stray sentence outside the braces and the parse throws.',
    task:
      'Write a prompt that extracts structured data from the customer feedback below into a strict JSON array. Each element must carry: an id, the sentiment, a category, a one-line summary, and an urgency rating from 1 to 5. Define every field, its type, and its allowed values in the prompt itself, and say what to do when a field cannot be determined.',
    tips: [
      'Show the exact schema — key names, types, and allowed enum values.',
      'Include a filled-in example object. Ambiguity in a schema gets resolved by the example.',
      'Say explicitly: no prose, no markdown fences, no trailing commentary.',
      'Define the null case. "Use null when the category is unclear" prevents invention.',
      'Constrain enums by listing them. An open-ended "category" field will drift.',
    ],
    successCriteria: [
      'Every field is named with an explicit type in the prompt',
      'Enum fields list their permitted values',
      'The prompt forbids any output outside the JSON',
      'The missing/unknown case has a defined representation',
      'The returned output parses as valid JSON on the first try',
    ],
    starterPrompt:
      'Pull the useful information out of this feedback and give it to me as JSON.\n\n<!-- No schema, no types, no enum values, no null rule. Specify all of it below. -->\n',
    testInput:
      'FEEDBACK LOG\n1. "App crashed twice while I was checking out. Lost my cart both times. Fix this." — 2 hours ago\n2. "Love the new dark mode, easy on the eyes at night." — yesterday\n3. "Shipping took 11 days, tracking never updated. Not sure I\'d order again." — 3 days ago\n4. "how do i change my password" — 20 minutes ago\n5. "The checkout page is fine I guess. Nothing special." — last week\n6. "URGENT: charged twice for order #44921, need a refund today" — 40 minutes ago',
    evaluatorNotes:
      'Execution matters more than usual here: attempt to parse the produced output as JSON. If it fails to parse, or contains markdown fences or prose outside the structure, Execution cannot exceed 45. Check that enum values in the output are drawn from the set the prompt declared — a category the prompt never listed is a schema-definition failure and belongs in Prompt Quality, not Execution.',
  },
  {
    id: 'multi-step',
    order: 4,
    title: 'Multi-Step Reasoning',
    tagline: 'Decompose before you delegate',
    estimatedMinutes: 30,
    pathId: 'advanced',
    difficulty: 'advanced',
    topic: 'Decomposition',
    maxPromptChars: 2200,
    source: 'builtin',
    brief:
      'Hard tasks fail when they are handed over whole. The fix is to name the stages, define what each stage produces, and make each one depend on the last. Decomposition also makes failure legible — when the answer is wrong you can see which stage went wrong instead of re-rolling the whole thing and hoping.',
    task:
      'Write a prompt that takes the incident report below and produces a root-cause analysis through explicitly named stages: establish the timeline, identify contributing factors, separate root cause from symptoms, and propose prevention measures. Each stage must state what it outputs and how the next stage uses it.',
    tips: [
      'Name and number the stages. Unnamed stages get merged.',
      'State what each stage produces before saying what it should consider.',
      'Make the dependency explicit: "using only the timeline from step 1...".',
      'Add a check between stages — "if the timeline has gaps, flag them before continuing".',
      'Say how the stages should appear in the final output, or they will be collapsed.',
    ],
    successCriteria: [
      'Stages are individually named and ordered',
      'Each stage has a defined output',
      'At least one stage explicitly consumes a previous stage\'s output',
      'The prompt distinguishes root cause from symptom as a requirement',
      'The final output shows the stages separately rather than one merged answer',
    ],
    starterPrompt:
      'Analyse this incident and tell me what went wrong and how to prevent it.\n\n<!-- One undifferentiated request. Break it into named, dependent stages below. -->\n',
    testInput:
      'INCIDENT REPORT — Order Service outage\n\n09:14 Deploy of order-service v2.31 begins (rolling, 6 pods).\n09:17 Error rate on /checkout rises from 0.2% to 4%.\n09:19 On-call paged. No one acknowledges — pager rotation had a gap after a team member left on 09/01.\n09:31 Error rate reaches 61%. Customer support begins receiving reports.\n09:34 Second engineer notices the alert in the team channel and acknowledges.\n09:41 Engineer identifies that v2.31 added a required "region" column read on every checkout, but the migration adding that column had not been run in production.\n09:44 Rollback to v2.30 initiated.\n09:52 Rollback complete, error rate returns to baseline.\n10:30 Migration run manually. v2.31 redeployed successfully at 11:05.\n\nNOTES\n- The migration was included in the release checklist but the checklist is a wiki page, not an automated gate.\n- Staging has the column already; it was added manually in March during testing and never recorded.\n- The canary step in the deploy pipeline was disabled in January "temporarily" to speed up releases.\n- 38 minutes of elevated errors. Estimated 2,100 failed checkouts.',
    evaluatorNotes:
      'The test is whether the stages are genuinely dependent or merely a numbered list of topics. A prompt whose steps could be run in any order and still produce the same result has not decomposed anything — cap Prompt Quality at 70 in that case. Check the output for a real distinction between root cause (missing automated migration gate, disabled canary) and symptoms (elevated error rate); a prompt that produces symptom-as-root-cause did not constrain the analysis well enough.',
  },
  {
    id: 'prompt-debugging',
    order: 5,
    title: 'Prompt Debugging',
    tagline: 'Diagnose, then repair',
    estimatedMinutes: 30,
    pathId: 'advanced',
    difficulty: 'advanced',
    topic: 'Diagnosis',
    maxPromptChars: 2600,
    source: 'builtin',
    brief:
      'The last skill is fixing prompts that already exist — usually someone else\'s, usually under pressure. Debugging a prompt is like debugging code: form a hypothesis about which instruction is producing the bad behaviour, change one thing, and check whether the output moved. Rewriting from scratch is not debugging; it throws away the information in the failure.',
    task:
      'The broken prompt is below. It is supposed to produce a concise weekly status update for an engineering manager, but it returns rambling output that buries the important items and invents details. Diagnose it, then write your repaired version. In your reflection, name each specific defect you found and the change you made for it.',
    tips: [
      'Read the broken prompt for conflicting instructions before you rewrite anything.',
      'Look for instructions that invite invention — "elaborate", "fill in gaps".',
      'Watch for length instructions that fight the content requirements.',
      'Check whether the priority order is stated. Unordered content gets ordered randomly.',
      'Change one defect at a time and note what moved. That is what "debugging" means.',
    ],
    successCriteria: [
      'Each defect in the original is named specifically, not summarised as "it was vague"',
      'Every named defect has a corresponding fix in the repaired prompt',
      'The repair keeps what worked instead of starting over',
      'The reflection ties each change to the behaviour it was meant to correct',
      'The repaired prompt produces a tight, prioritised, invention-free status update',
    ],
    starterPrompt:
      'BROKEN PROMPT — diagnose, then write your repaired version below.\n\n"""\nYou are an assistant. Write a really comprehensive and detailed weekly status update\nfor my manager based on the notes I give you. Be thorough and include everything, but\nalso keep it brief. Make it sound professional and impressive. If anything in my notes\nis unclear or incomplete, use your best judgement to elaborate and fill in the details\nso the update reads well. Cover the whole week. Don\'t leave anything out. Also be concise.\n"""\n\n--- YOUR REPAIRED PROMPT BELOW ---\n',
    testInput:
      "THIS WEEK'S RAW NOTES\n- mon: payment retry bug, thought it was fixed, wasn't. spent most of day on it\n- tue: fixed it (race condition in the retry queue). shipped. also 1:1 with Sam\n- wed: started the reporting export work. blocked on getting the analytics DB creds, asked infra, no reply yet\n- thu: still blocked. did code reviews instead, 4 PRs. helped Priya debug the staging deploy\n- fri: creds came through end of day thu, got the export skeleton working. not done\n- ongoing: interview panel x2 next week\n- worry: the reporting export deadline is the 14th and I lost 2 days to the blocker",
    evaluatorNotes:
      'This exercise is scored primarily on diagnosis. The reflection must name the actual defects present in the broken prompt — the thorough/brief and comprehensive/concise contradictions, the explicit licence to invent ("use your best judgement to elaborate and fill in the details"), the missing priority order, the undefined audience needs, the vague "impressive" target, and the absent output structure. A reflection that names fewer than three of these specifically cannot exceed 65 on Understanding regardless of how good the repaired prompt is. Reward repairs that preserve the working parts of the original over full rewrites.',
  },
];

/** Built-in exercises only. For the merged list, use useExercises(). */
export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

/**
 * Merge teacher-authored exercises with the built-ins, in unlock order. Ties
 * on `order` fall back to creation time so the chain stays stable as teachers
 * add exercises.
 */
export function mergeExercises(custom: Exercise[]): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const exercise of [...EXERCISES, ...custom]) byId.set(exercise.id, exercise);
  return [...byId.values()].sort(
    (a, b) => a.order - b.order || (a.createdAt ?? 0) - (b.createdAt ?? 0),
  );
}

export function indexById(exercises: Exercise[]): Record<string, Exercise> {
  return Object.fromEntries(exercises.map((e) => [e.id, e]));
}

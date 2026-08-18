import type { Exercise, ExerciseTranslation, Locale } from '../types';
import { ES_EXERCISES } from './exercises.es';

/**
 * The nine built-in exercises, in unlock order. A student may only open
 * exercise N once exercise N-1 has been approved by a teacher.
 *
 * The first five are technique drills: each isolates one thing — specificity,
 * personas, schemas, decomposition, repair — and strips the context away so the
 * technique is the only variable. The last four are real-world challenges,
 * which put the techniques back into a situation with a reader, a deadline, and
 * a cost of getting it wrong. They carry a `scenario`, and the evaluator is
 * told it: an applied prompt is judged on whether it would survive contact with
 * the stated reader, not on whether it names a technique.
 *
 * Teachers can add custom exercises from the teacher dashboard; those live in
 * the database and are merged with these by useExercises(). Anything that
 * renders or grades an exercise must read that hook, not this constant.
 */
const BUILT_IN: Exercise[] = [
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

  // -------------------------------------------------------------------------
  // Real-world challenges
  //
  // Each of these weights Execution above the rubric default. In a drill the
  // interesting question is whether the prompt is well built; here it is
  // whether the thing that came out could actually be sent, and a prompt that
  // reads beautifully but produces an unusable artifact has failed the brief.
  // -------------------------------------------------------------------------
  {
    id: 'discharge-instructions',
    order: 6,
    title: 'Discharge Instructions',
    tagline: 'Translate expertise without adding to it',
    estimatedMinutes: 30,
    pathId: 'domain',
    difficulty: 'core',
    topic: 'Plain language',
    maxPromptChars: 2000,
    source: 'builtin',
    rubricWeights: { promptQuality: 0.35, understanding: 0.25, execution: 0.3, growth: 0.1 },
    scenario: {
      role: 'A nurse writing discharge notes at a community clinic',
      context:
        'The clinical notes for a patient going home are accurate and completely unreadable to the person they are about. You have six minutes before the next patient.',
      stakeholder: 'The patient, and whoever is at home with them tonight',
      atStake:
        'A missed dose or an ignored warning sign brings them back through the door in three days.',
    },
    brief:
      'Rewriting specialist language for the person it concerns is the most common real use of a language model, and the one with the sharpest failure mode. Simplifying is easy. Simplifying without adding is hard: a model asked to make clinical notes friendly will smooth over a gap by inventing a reassurance, a dose, or a timeframe that nobody wrote down. The skill here is building a prompt that makes the boundary between translating and adding explicit — and that says out loud what to do when the source is silent.',
    task:
      'Write a prompt that turns the discharge notes below into take-home instructions the patient can follow, at roughly a sixth-grade reading level. The output must cover medication, warning signs, and follow-up. Your prompt must forbid adding anything the notes do not contain, and must define what to do where the notes are incomplete — a gap has to surface as a gap, not get filled.',
    tips: [
      'Name the reading level and the reader. "Simple" is not a specification.',
      'Say what the model may not do — invent doses, add advice, reassure — as plainly as what it must do.',
      'Give the gaps somewhere to go: a "check with the clinic" list is better than silence.',
      'Order the sections by what matters tonight, not by the order the notes are in.',
      'Read the produced output as the patient. Anything you cannot act on is not an instruction.',
    ],
    successCriteria: [
      'The prompt states the reader and a concrete reading level',
      'The prompt forbids adding information that is not in the notes',
      'The prompt defines an explicit handling for incomplete or missing detail',
      'The prompt fixes the sections and their order',
      'Every statement in the output can be traced to something in the notes',
    ],
    starterPrompt:
      'Rewrite these discharge notes so a patient can understand them.\n\n<!-- That will simplify — and quietly invent. Rebuild it below so translating and adding are separated, and say what happens where the notes are silent. -->\n',
    testInput:
      "DISCHARGE SUMMARY — Riverbend Community Clinic\nPatient: M. Okafor, 61F. Admitted 03/14, discharged 03/16.\n\nDx: Community-acquired pneumonia, RLL. Resolving.\n\nMeds on discharge:\n- Amoxicillin-clavulanate 875/125mg PO BID x 7/7. Complete full course.\n- Salbutamol MDI 2 puffs q6h PRN dyspnoea.\n- Continue home lisinopril 10mg OD.\n\nObs at discharge: afeb 36.8, SpO2 96% RA, RR 16, BP 128/78.\n\nAdvice: rest, oral fluids, gradual return to normal activity. Avoid strenuous exertion 1/52.\nRed flags: worsening SOB, fever >38.5, pleuritic pain, haemoptysis → return or ED.\n\nF/U: clinic review 7-10 days post-discharge. Repeat CXR in 6/52 to confirm resolution.\nSmoking cessation discussed, patient declined referral this admission.\n\nNote: patient asked about returning to work — not addressed on the ward, defer to clinic review.",
    evaluatorNotes:
      'Check the produced output against the notes line by line for additions. Any clinical claim in the output that is not in the source — a dose, a duration, a reassurance like "this is normal", a recovery timeframe — is an invention, and Execution cannot exceed 45 when one is present, however readable the rest is. The notes contain one deliberate gap (returning to work, explicitly deferred) and one deliberate sensitivity (declined smoking-cessation referral): a strong prompt produces an output that routes the first to the clinic review and does not moralise about the second. Reward prompts that separate "say this differently" from "say more than this" as an explicit instruction rather than a hopeful one. Do not reward medical accuracy the student did not ask for and cannot check.',
  },
  {
    id: 'support-triage',
    order: 7,
    title: 'Support Triage',
    tagline: 'Decide what a machine may answer',
    estimatedMinutes: 35,
    pathId: 'domain',
    difficulty: 'advanced',
    topic: 'Routing and boundaries',
    maxPromptChars: 2600,
    source: 'builtin',
    rubricWeights: { promptQuality: 0.35, understanding: 0.25, execution: 0.3, growth: 0.1 },
    scenario: {
      role: 'The first-line support lead on a small team',
      context:
        'Forty messages came in overnight. Standup is in twenty minutes and the queue has to be sorted, ranked, and partly answered before then.',
      stakeholder: 'The on-call engineer, the billing team, and every customer still waiting',
      atStake:
        'A double charge sitting in the bug queue for three days is the one that ends up on social media.',
    },
    brief:
      'Triage is where structured output stops being a formatting exercise. The schema is easy; the judgement is not. Every real triage prompt has to answer a question the schema cannot: which of these may the machine answer on its own, and which must reach a person untouched? A prompt that drafts a confident reply to a billing dispute has not saved anyone time — it has created a second problem. The valuable instruction is the one that says when to stop.',
    task:
      'Write a prompt that triages the support messages below. For each one it must assign a queue from a fixed set, a severity, any order or account identifier mentioned, and a one-line summary. It must also draft a first reply — but only for messages that are safe to answer without a human, and your prompt must define that boundary explicitly rather than leaving it to judgement.',
    tips: [
      'Fix the queues and severities as enumerated values. An open-ended "category" drifts by message three.',
      'Write the no-auto-reply rule as a test the model can apply, not a vibe: money, data loss, legal, safety.',
      'Say what to put in the reply field when the rule says do not reply — an empty string and a reason beats an apology.',
      'Extract identifiers verbatim. A reformatted order number is a wrong order number.',
      'Sort or rank the output, or someone still has to read all forty to find the urgent one.',
    ],
    successCriteria: [
      'Queues and severity levels are enumerated in the prompt with their meanings',
      'A stated, checkable rule decides which messages may be auto-replied to',
      'The output defines what appears in the reply field when auto-reply is withheld',
      'Identifiers are extracted exactly as written, or reported as absent',
      'The output is ordered so the most urgent item is findable without reading all of it',
    ],
    starterPrompt:
      'Sort these support messages by urgency and write replies to them.\n\n<!-- This will happily draft a refund promise. Rebuild it below: fixed queues, a severity scale, an extraction rule, and an explicit test for when NOT to draft a reply. -->\n',
    testInput:
      "OVERNIGHT QUEUE — 8 of 40 shown\n\n[02:14] \"charged twice for order RB-88213, £64 each. need this back today, rent comes out friday\"\n\n[02:51] \"Hi — is there a way to export my data as CSV? Can't find it in settings.\"\n\n[03:07] \"THE APP DELETED MY PROJECT. 4 months of work. I did not delete it. Fix this NOW.\"\n\n[03:22] \"how do i change my password\"\n\n[04:40] \"Your terms say 30 day refunds. It has been 34 days but the product never worked. I have contacted my bank and my solicitor.\"\n\n[05:03] \"the checkout button is grey on safari but works on chrome. order 71-A-9930 if that helps\"\n\n[05:48] \"love the new update! just wanted to say the team did great :)\"\n\n[06:15] \"Account locked after I mistyped my password. I'm the admin for our whole org (14 seats) and nobody can get in.\"",
    evaluatorNotes:
      'The auto-reply boundary is the highest-signal element of this exercise. A prompt with no explicit, checkable rule for withholding a drafted reply caps Prompt Quality at 65 no matter how well specified the schema is — and check the produced output: if it drafted a reply to the double-charge, the deletion, or the legal threat, Execution cannot exceed 50. The message set deliberately contains two that are trivially safe to answer (password, CSV export), one pure compliment, and four that must reach a person. Reward severity scales whose levels are defined by consequence rather than by adjective ("high" defined as money moved or data lost beats "high = very urgent"). Verify identifiers are reproduced exactly: RB-88213 and 71-A-9930.',
  },
  {
    id: 'minutes-to-actions',
    order: 8,
    title: 'Minutes to Actions',
    tagline: 'Separate what was decided from what was said',
    estimatedMinutes: 25,
    pathId: 'domain',
    difficulty: 'core',
    topic: 'Decisions and ownership',
    maxPromptChars: 1800,
    source: 'builtin',
    rubricWeights: { promptQuality: 0.35, understanding: 0.25, execution: 0.3, growth: 0.1 },
    scenario: {
      role: 'Clerk to a town council',
      context:
        'Ninety minutes of recorded discussion has to become a published action register by Friday. Half of what was said was thinking out loud.',
      stakeholder: 'Residents reading the published register, and the officers who have to do the work',
      atStake: 'An action with no named owner is an action that nobody does, in public.',
    },
    brief:
      'Meeting notes are mostly discussion; a register is only decisions. Getting from one to the other means drawing a line the transcript does not draw — someone saying "we should probably look at that" is not a decision, and a model asked for action items will promote it to one, invent an owner, and give it a deadline. This exercise is about designing the test that separates the two, and about making the uncertain case visible instead of resolved.',
    task:
      'Write a prompt that turns the meeting transcript below into an action register. Each entry needs the action, a named owner, a deadline, and the status of the decision behind it. Your prompt must define what counts as a decision as opposed to discussion, and must mark anything the transcript leaves ambiguous as unclear rather than resolving it.',
    tips: [
      'Define "decision" with a test — someone committed, or the chair confirmed it — not as a category name.',
      'Owners must come from names actually spoken. Say what to do when nobody was named.',
      'Deadlines are the same problem: "soon" is not a date, and the model should not turn it into one.',
      'Give the ambiguous case its own place in the output. Anything without one gets quietly resolved.',
      'Separate the register from the discussion summary, or the two will be blended into a narrative.',
    ],
    successCriteria: [
      'The prompt gives a checkable test for what counts as a decision',
      'Owners are drawn from named speakers, with a defined fallback when none was named',
      'Vague timings are preserved as vague rather than converted into dates',
      'Ambiguous items appear in the output marked as unclear',
      'The register is separable from the discussion — a reader can act on it alone',
    ],
    starterPrompt:
      'Summarise this meeting and list the action items.\n\n<!-- This will invent owners and promote musings to decisions. Rebuild it below with a test for what counts as a decision and a home for whatever is unclear. -->\n',
    testInput:
      "TOWN COUNCIL — PLANNING SUBCOMMITTEE, TUESDAY (partial transcript)\n\nCHAIR (Ndiaye): Right, the Mill Lane crossing. Priya, where did we land?\nPRIYA: Highways came back. They'll fund half if we cover the survey. Survey's about £4,000.\nCHAIR: Can we find four thousand?\nTREASURER (Bramwell): Not out of this quarter. Next quarter, maybe, depends on the hall roof.\nPRIYA: Highways need an answer by the end of the month or the offer lapses.\nCHAIR: Then let's write to them and ask for an extension to the end of June. Priya, can you draft that?\nPRIYA: Yes. I'll have it by Friday.\nCHAIR: Good, that's agreed.\n\nCHAIR: The allotment waiting list.\nBRAMWELL: It's at forty-one people. Someone should probably look at whether we can split the larger plots.\nCHAIR: Mm. It has come up before.\nTOMLIN: I looked at that two years ago, it was a nightmare with the tenancy agreements.\nCHAIR: Let's come back to it.\n\nCHAIR: Finally, the hall roof quotes.\nBRAMWELL: Three quotes in, cheapest is £18,200, that one's from the firm that did the library.\nTOMLIN: I'd want references before we go with the cheapest.\nBRAMWELL: Fine, I'll chase references.\nCHAIR: When?\nBRAMWELL: Before the next meeting, whenever that is.\nCHAIR: Third of next month. Agreed, we decide the roof at the next meeting once Bramwell has the references.\nTOMLIN: And someone needs to tell the hall committee we're delayed.\nCHAIR: Yes, someone should.",
    evaluatorNotes:
      'The transcript contains three deliberate traps, and the produced output is where they show. The allotment item is discussion, not a decision — an output that lists it as an action with an owner is a failure of the prompt\'s decision test and caps Execution at 55. "Someone needs to tell the hall committee" has no owner and must surface as unowned or unclear, not be assigned to the chair by inference. Bramwell\'s "before the next meeting, whenever that is" is resolvable to the third of next month from the chair\'s reply — an output that keeps both, or that states the resolution and its source, is stronger than one that silently picks either. Reward prompts whose decision test could be applied by a stranger to a different transcript.',
  },
  {
    id: 'privacy-safe-summary',
    order: 9,
    title: 'Names Out, Signal In',
    tagline: 'Constrain what may leave the room',
    estimatedMinutes: 35,
    pathId: 'domain',
    difficulty: 'advanced',
    topic: 'Constraint design',
    maxPromptChars: 2400,
    source: 'builtin',
    rubricWeights: { promptQuality: 0.35, understanding: 0.25, execution: 0.3, growth: 0.1 },
    scenario: {
      role: 'An analyst in a people team',
      context:
        'Leadership wants the themes from this quarter\'s incident reports. The reports name people, and the summary will be forwarded further than you can follow.',
      stakeholder: 'A leadership team that must not learn who filed what',
      atStake:
        'One identifying detail left in, and the person who reported it is identified — by the people they reported.',
    },
    brief:
      'Most prompting is about getting more out. This one is about getting less: the summary has to carry the pattern and drop the people. It is harder than it sounds, because identity survives redaction. Strike the names and "the night-shift supervisor on the loading bay" still identifies exactly one person. A working prompt has to define what identifying means for this material, say what to do when a theme cannot be reported without exposing someone, and refuse the model its habit of being helpfully specific.',
    task:
      'Write a prompt that turns the incident reports below into a themes summary for a leadership audience. Nobody in the source may be identifiable in the output — not by name, and not by a combination of role, shift, and location that points at one person. Your prompt must define what counts as identifying here, and must say what the output should do with a theme that cannot be reported safely.',
    tips: [
      'Redacting names is the easy half. Say what to do about roles, shifts, dates, and locations that combine.',
      'Give the unreportable case an instruction: suppressed with a reason beats silently dropped.',
      'Aggregate thresholds are a real tool — "only report a theme appearing in two or more reports".',
      'Forbid quoting. A verbatim sentence is a fingerprint even with the name removed.',
      'Check the output against the source yourself. If you can work out who, so can a colleague.',
    ],
    successCriteria: [
      'The prompt defines identifying beyond names — role, location, shift, timing, combinations',
      'A stated rule decides when a theme is reported and when it is withheld',
      'Withheld themes appear as withheld, with a reason, rather than vanishing',
      'The prompt forbids verbatim quotation from the reports',
      'No individual in the source can be identified from the produced summary',
    ],
    starterPrompt:
      'Summarise these incident reports into themes for the leadership team, and remove the names.\n\n<!-- Removing names is not the same as removing identity. Rebuild it below: define what identifying means for this material, and say what happens to a theme that cannot be told safely. -->\n',
    testInput:
      "INTERNAL REPORTS — Q3, Fenwick Distribution (4 of 11)\n\nR-0412 (filed 12 Jul)\nReporter: J. Alvarez, night-shift supervisor, loading bay 2.\nRaised that overtime is being allocated informally by the bay lead rather than through the rota system. Says two colleagues have raised it with her and neither wanted to put it in writing. Notes she is the only supervisor on that shift.\n\nR-0447 (filed 29 Jul)\nReporter: anonymous, warehouse floor.\nDescribes being asked to sign a completed safety check they did not perform. States this has happened \"more than once, always on the late shift\".\n\nR-0463 (filed 04 Aug)\nReporter: T. Okonkwo, forklift operator.\nReports a near miss on 02 Aug involving a pallet stack above the marked line. Says he raised the stack height with the same bay lead in June and was told to \"leave it\".\n\nR-0491 (filed 22 Aug)\nReporter: M. Delacroix, HR coordinator (on behalf of a team member who asked not to be named).\nTeam member reports being scheduled for six consecutive nights, contrary to the shift agreement. Delacroix notes this is the third such report she has taken this quarter, all from the same team.",
    evaluatorNotes:
      'Read the produced summary against the source and try to identify people from it. Any surviving name caps Execution at 35. Beyond names: this material is constructed so that "the night-shift supervisor on loading bay 2" and "the HR coordinator" each identify exactly one person, and a summary that keeps either has not achieved what the prompt claimed — Execution cannot exceed 55 in that case, even with every name stripped. The safety-check theme (R-0447) rests on a single anonymous report and is the one a good aggregate threshold has to make a visible decision about, in either direction. Score Understanding on whether the reflection sees that identity is reconstructed from combinations rather than carried by names alone; a reflection that treats this as a find-and-replace problem cannot exceed 60 there.',
  },
];

/**
 * The built-ins with their Spanish text attached.
 *
 * Translations live in a separate module so this one stays readable, and they
 * are attached rather than inlined so the shape of an exercise record is the
 * same whether it shipped in the bundle or a teacher wrote it.
 */
export const EXERCISES: Exercise[] = BUILT_IN.map((exercise) => {
  const es = ES_EXERCISES[exercise.id];
  return es ? { ...exercise, i18n: { es } } : exercise;
});

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

/**
 * The exercise as the student reads it.
 *
 * Only student-facing text is swapped, and only where a translation exists — a
 * partly translated exercise falls back field by field rather than showing a
 * blank brief.
 *
 * The evaluator is never handed the result of this. It grades against the
 * canonical record, because a translated brief is a subtly different brief, and
 * two students held to two different standards is the exact thing a fixed
 * rubric exists to prevent. Feedback still comes back in the student's
 * language; that is the evaluator's instruction, not a different exercise.
 */
export function localizeExercise(exercise: Exercise, locale: Locale): Exercise {
  const translation = exercise.i18n?.[locale];
  if (!translation) return exercise;

  const overrides: Partial<Exercise> = {};
  for (const [key, value] of Object.entries(translation) as [
    keyof ExerciseTranslation,
    unknown,
  ][]) {
    if (value !== undefined) (overrides as Record<string, unknown>)[key] = value;
  }
  return { ...exercise, ...overrides };
}

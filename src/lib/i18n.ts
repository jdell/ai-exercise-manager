import type { Locale } from '../types';

/**
 * The app's two languages, and every string that is not authored content.
 *
 * There is no i18n dependency here for the same reason there is no charting
 * one: the whole need is lookup plus `{placeholder}` substitution, and a
 * library would bring a loader, a plural engine, and a message syntax to do it.
 *
 * The English dictionary is the source of truth for the *key set*: `ES` is
 * typed as `Record<MessageKey, string>`, so a missing or misspelled Spanish key
 * fails `npm run lint` rather than shipping an English string into a Spanish
 * page. Adding a key means adding both halves, and that is the point.
 *
 * What is deliberately NOT here: exercise text (it lives with the exercise, in
 * `Exercise.i18n`), and anything Claude writes. Feedback is generated in the
 * student's language by the evaluator — see `buildEvaluatorSystemPrompt`.
 */

export const LOCALES: { id: Locale; label: string; english: string }[] = [
  { id: 'en', label: 'English', english: 'English' },
  { id: 'es', label: 'Español', english: 'Spanish' },
];

export const DEFAULT_LOCALE: Locale = 'en';

/** Names the evaluator is told to write feedback in. */
export const LOCALE_ENDONYM: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish (español)',
};

// ---------------------------------------------------------------------------
// English — the key set
// ---------------------------------------------------------------------------

const EN = {
  // App shell -------------------------------------------------------------
  'app.name': 'AI Skills',
  'app.subtitle': 'Exercise Manager',
  'app.fullName': 'AI Skills Exercise Manager',
  'app.tagline': 'Prompt engineering, practised and assessed',

  'nav.exercises': 'My exercises',
  'nav.progress': 'Progress',
  'nav.history': 'History',
  'nav.playground': 'Playground',
  'nav.reviewQueue': 'Review queue',
  'nav.classProgress': 'Class progress',
  'nav.analytics': 'Analytics',
  'nav.manageExercises': 'Exercises',
  'nav.evaluator': 'Evaluator console',
  'nav.settings': 'Settings',
  'nav.signOut': 'Sign out',

  'layout.emulators': 'Emulators',
  'layout.emulatorsTitle': 'Talking to the local Firebase emulator suite, not your real project.',
  'layout.footer':
    'Scored by Claude against a fixed rubric · Every score is reviewed by a teacher before it counts',
  'layout.language': 'Language',
  'layout.checkingSession': 'Checking your session…',

  'role.student': 'Student',
  'role.teacher': 'Teacher',

  // Time ------------------------------------------------------------------
  'time.justNow': 'just now',
  'time.minutes': '{n}m ago',
  'time.hours': '{n}h ago',
  'time.days': '{n}d ago',
  'duration.none': '—',
  'duration.underMinute': 'under a minute',
  'duration.minutes': '{n} min',
  'duration.hours.one': '{n} hour',
  'duration.hours.other': '{n} hours',
  'duration.days.one': '{n} day',
  'duration.days.other': '{n} days',

  // Shared vocabulary -----------------------------------------------------
  'common.show': 'Show',
  'common.hide': 'Hide',
  'common.showChart': 'Show chart',
  'common.showTable': 'Show table',
  'common.back': 'Back',
  'common.chars': '{n} chars',
  'common.charsBudget': '{used} / {limit} chars',
  'common.charsLeft': '{n} left',
  'common.charsOver': '{n} over budget',
  'common.strengths': 'Strengths',
  'common.nextTime': 'Next time',
  'common.teacherComment': 'Teacher comment',
  'common.exercise': 'Exercise',
  'common.attempts': 'Attempts',
  'common.score': 'Score',
  'common.status': 'Status',
  'common.attemptN': 'Attempt {n}',
  'common.clearsBar': 'Clears the bar',
  'common.belowBar': 'Below the bar',
  'common.teacherReviewed': 'Teacher-reviewed',
  'common.pendingReview': 'Claude score, pending review',
  'common.teacherBadge': 'Teacher',
  'common.teacherAdjusted': 'Claude scored {claude}; your teacher adjusted this to {teacher}.',

  // Exercise state and submission status ----------------------------------
  'state.locked': 'Locked',
  'state.available': 'Available',
  'state.in_review': 'In review',
  'state.revision': 'Needs revision',
  'state.approved': 'Approved',
  'state.hint.locked': 'Unlocks when the previous exercise is approved',
  'state.hint.in_review': 'Submitted — waiting on your teacher',
  'state.hint.revision': 'Your teacher asked for another attempt',

  'status.evaluating': 'Evaluating',
  'status.awaiting_review': 'Awaiting review',
  'status.approved': 'Approved',
  'status.needs_revision': 'Revision requested',
  'status.error': 'Failed',

  // Paths and difficulty ---------------------------------------------------
  'path.fundamentals.title': 'Prompt Fundamentals',
  'path.fundamentals.blurb': 'Saying exactly what you want, and to whom.',
  'path.advanced.title': 'Advanced Techniques',
  'path.advanced.blurb': 'Structured output, decomposition, and repair.',
  'path.domain.title': 'Real-World Challenges',
  'path.domain.blurb': 'Applied briefs where the output has somewhere to go.',
  'difficulty.intro': 'Intro',
  'difficulty.core': 'Core',
  'difficulty.advanced': 'Advanced',

  // Rubric -----------------------------------------------------------------
  'rubric.promptQuality.label': 'Prompt Quality',
  'rubric.promptQuality.description':
    'Is the prompt itself well built? Clear task, useful context, stated constraints, defined output shape.',
  'rubric.understanding.label': 'Understanding',
  'rubric.understanding.description':
    'Does the reflection show you know WHY the prompt works, not just that it did?',
  'rubric.execution.label': 'Execution',
  'rubric.execution.description':
    'Did the prompt actually produce what the exercise asked for when it was run?',
  'rubric.growth.label': 'Growth',
  'rubric.growth.description':
    'Compared to your earlier attempts, did this one move forward? First attempts are judged on ambition, not deltas.',

  // Student dashboard ------------------------------------------------------
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.allApproved': 'Every exercise approved. Nicely done.',
  'dashboard.approvedOf': '{approved} of {total} approved — keep going.',
  'dashboard.averageScore': 'Average score',
  'dashboard.progress': 'Progress',
  'dashboard.pathComplete': 'Path complete',
  'dashboard.pathAverage': 'Average {score}',
  'dashboard.notStarted': 'Not started',
  'dashboard.showingInPath.one': 'Showing {n} exercise in this path.',
  'dashboard.showingInPath.other': 'Showing {n} exercises in this path.',
  'dashboard.showAll': 'Show all',
  'dashboard.aboutMinutes': 'About {n} min',
  'dashboard.attemptWhen': 'attempt {n} {when}',
  'dashboard.start': 'Start →',
  'dashboard.tryAgain': 'Try again →',
  'dashboard.howScored': "How you're scored",
  'dashboard.passNote':
    "A weighted total of {passing} or above clears the bar. Your teacher makes the final call and can adjust any score. Some exercises weight the dimensions differently — the workspace shows that exercise's own weights.",
  'dashboard.howProgression': 'How progression works',
  'dashboard.step1':
    'Write and test your prompt as many times as you like — test runs are not graded.',
  'dashboard.step2': 'Submit with a reflection. Claude scores it immediately.',
  'dashboard.step3':
    'Your teacher reviews the score and either approves it or asks for another attempt.',
  'dashboard.step4': 'Approval unlocks the next exercise, whichever path it is in.',

  // Workspace --------------------------------------------------------------
  'workspace.allExercises': '← All exercises',
  'workspace.aboutMinutes': '· about {n} min',
  'workspace.approvedNext': 'This exercise is approved.',
  'workspace.continueTo': 'Continue to {title}',
  'workspace.trackFinished': 'You have finished the whole track.',
  'workspace.inReview':
    'Attempt {n} is submitted and waiting for your teacher. You will be able to submit again if they ask for a revision.',
  'workspace.revisionAsked': 'Your teacher asked for another attempt:',
  'workspace.theExercise': 'The exercise',
  'workspace.yourTask': 'Your task',
  'workspace.requirements': 'Requirements',
  'workspace.closerToIt': 'Closer to it',
  'workspace.notThis': 'Not this',
  'workspace.situation': 'The situation',
  'workspace.scenarioRole': 'You are',
  'workspace.scenarioStakeholder': 'It goes to',
  'workspace.scenarioAtStake': 'If it goes wrong',
  'workspace.yourPrompt': 'Your prompt',
  'workspace.runsAgainstMaterial':
    'Runs against the fixed material shown below, so every attempt is comparable.',
  'workspace.runsAsWritten': 'Runs exactly as written.',
  'workspace.testRun': 'Test run',
  'workspace.stop': 'Stop',
  'workspace.promptPlaceholder': 'Write your prompt here…',
  'workspace.testRunsFree': 'Test runs are unlimited and are never graded.',
  'workspace.material': 'Material your prompt runs against',
  'workspace.whatClaudeProduced': 'What Claude produced',
  'workspace.streaming': 'Streaming…',
  'workspace.fromLatestRun': 'From your latest test run',
  'workspace.noOutput': 'No output yet',
  'workspace.noOutputHint': 'Hit Test run to see what your prompt produces.',
  'workspace.reflection': 'Reflection',
  'workspace.reflectionSubtitle':
    'Explain why your prompt works — this is {percent}% of your score.',
  'workspace.reflectionPlaceholder':
    "What techniques did you use, and why does each one change the output? What did you try that didn't work? Where would this prompt break?",
  'workspace.reflectionShort': 'At least {min} characters — currently {n}.',
  'workspace.reflectionHint': 'Naming the mechanism scores higher than describing the result.',
  'workspace.submitAttempt': 'Submit attempt {n}',
  'workspace.submitting': 'Submitting…',
  'workspace.submitHint': 'Submitting re-runs your prompt on the server, then scores what it produced.',
  'workspace.evaluatingStage': 'Running your prompt and scoring it…',
  'workspace.yourAttempts': 'Your attempts ({n})',
  'workspace.attemptsKept': 'Every attempt is kept, with the feedback it got.',
  'workspace.tips': 'Tips',
  'workspace.attemptScore': 'Attempt {n} score',
  'workspace.openFullFeedback': 'Open the full feedback →',
  'workspace.compareAttempts': 'Compare with your other attempts →',
  'workspace.promptAndOutput': 'Prompt and output from this attempt',
  'workspace.prompt': 'Prompt',
  'workspace.output': 'Output',
  'workspace.noneCaptured': '(none)',
  'workspace.upFromFirst': 'Up {n} points from your first attempt.',
  'workspace.downFromFirst': 'Down {n} points from your first attempt.',
  'workspace.sameAsFirst': 'Same score as your first attempt.',
  'workspace.deltaTitle': 'Change from the previous attempt',

  // History ----------------------------------------------------------------
  'history.title': 'History',
  'history.subtitle': 'Every attempt you have submitted, newest first.',
  'history.empty': 'Nothing submitted yet',
  'history.startFirst': 'Start your first exercise',
  'history.attemptTitle': '{title} — attempt {n}',
  'history.fullFeedback': 'Revision history and full feedback →',
  'history.noEvaluation': 'No evaluation recorded for this attempt.',
  'history.openAttempt': 'Open this attempt →',

  // Submission detail ------------------------------------------------------
  'detail.backToHistory': '← History',
  'detail.attemptOf': 'Attempt {n} of {total} · {when}',
  'detail.revisionHistory': 'Revision history',
  'detail.revisionHistorySubtitle':
    'Every attempt you have made at this exercise, and how the score moved.',
  'detail.whatWasAskedToFix': 'What attempt {n} was asked to fix',
  'detail.whatWasAskedSubtitle':
    "Claude's advice on your previous attempt, next to what you submitted this time.",
  'detail.flaggedOn': 'Flagged on attempt {n}',
  'detail.teacherAskedFor': 'Your teacher asked for',
  'detail.claudeFeedback': "Claude's feedback",
  'detail.promptYouSubmitted': 'The prompt you submitted',
  'detail.whatItProduced': 'What it produced',
  'detail.noOutputCaptured': '(no output captured)',
  'detail.yourReflection': 'Your reflection',
  'detail.leftBlank': '(left blank)',
  'detail.neverScored': 'This attempt was never scored.',
  'detail.claudeVsTeacher': 'Claude scored {claude}; your teacher recorded {teacher}.',
  'detail.theExercise': 'The exercise',
  'detail.openWorkspace': 'Open the workspace →',

  // Progress ---------------------------------------------------------------
  'progress.title': 'Your progress',
  'progress.subtitle': 'How your scores have moved across the track, and where your time has gone.',
  'progress.empty': 'Nothing to chart yet',
  'progress.emptyHint': 'Submit your first exercise and your progress will show up here.',
  'progress.backToExercises': 'Back to your exercises',
  'progress.approved': 'Approved',
  'progress.averageScore': 'Average score',
  'progress.attempts': 'Attempts',
  'progress.turnaround': 'Typical turnaround',
  'progress.scoreAcrossTrack': 'Score across the track',
  'progress.scoreAcrossTrackSubtitle':
    'Your best score on each exercise you have attempted, in order.',
  'progress.best': 'Best',
  'progress.timeToApproval': 'Time to approval',
  'progress.velocity': 'Learning velocity',
  'progress.velocitySubtitle': 'Where each exercise started and where it was approved.',
  'progress.velocityEmpty': 'No approved exercises yet',
  'progress.velocityEmptyHint': 'This fills in once a teacher approves your first submission.',
  'progress.velocityLine.one':
    'Across {n} approved exercise you moved from an average of {first} on the first attempt to {approved} when approved',
  'progress.velocityLine.other':
    'Across {n} approved exercises you moved from an average of {first} on the first attempt to {approved} when approved',
  'progress.velocityGain': ' — a gain of {n} points',
  'progress.velocityPerAttempt': 'That works out at {n} points per revision.',
  'progress.velocityNoRevisions':
    'Every exercise was approved first time, so there is no revision rate to report.',
  'progress.effort': 'Effort per exercise',
  'progress.effortSubtitle': 'Attempts made, and how long each exercise took end to end.',
  'progress.attemptCount.one': '{n} attempt',
  'progress.attemptCount.other': '{n} attempts',
  'progress.effortHint':
    'More attempts is not worse. Revisions are where most of the learning shows up — the velocity chart above is the one to read for that.',
  'progress.dimensions': 'Rubric dimensions',
  'progress.dimensionsSubtitle': 'Your average on each, across every attempt.',
  'progress.strongestWeakest': 'Strongest on {strongest}, weakest on {weakest}.',
  'progress.report': 'Report',
  'progress.reportSubtitle': 'A printable summary to share.',
  'progress.reportBody': 'Generates a one-page summary of your progress that can be saved as a PDF.',
  'progress.openReport': 'Open report',

  // Achievements -----------------------------------------------------------
  'achievements.title': 'Badges',
  'achievements.subtitle': 'Earned from your submitted work — {earned} of {total}.',
  'achievements.empty': 'No badges yet',
  'achievements.emptyHint': 'Your first approved exercise earns your first badge.',
  'achievements.locked': 'Not yet earned',
  'achievements.earnedWhen': 'Earned {when}',
  'achievements.viewAll': 'See all badges →',
  'achievement.first_approval.title': 'On the board',
  'achievement.first_approval.description': 'Your first teacher-approved exercise.',
  'achievement.first_time_right.title': 'First time right',
  'achievement.first_time_right.description': 'An exercise approved on its very first attempt.',
  'achievement.turned_it_around.title': 'Turned it around',
  'achievement.turned_it_around.description':
    'Gained {points} points between two attempts at the same exercise.',
  'achievement.full_marks_dimension.title': 'Nothing left to fix',
  'achievement.full_marks_dimension.description': 'Scored {score} or above on a single dimension.',
  'achievement.shows_the_working.title': 'Shows the working',
  'achievement.shows_the_working.description':
    'Scored {score} or above on Understanding — you explained the mechanism, not the result.',
  'achievement.four_across.title': 'Four across',
  'achievement.four_across.description': 'Every rubric dimension above {score} on one attempt.',
  'achievement.kept_at_it.title': 'Kept at it',
  'achievement.kept_at_it.description':
    'Three or more attempts at one exercise. Revising is the work.',
  'achievement.into_the_field.title': 'Into the field',
  'achievement.into_the_field.description': 'Approved on a real-world challenge.',
  'achievement.path_complete.title': '{path} complete',
  'achievement.path_complete.description': 'Every exercise in this path approved.',
  'achievement.track_complete.title': 'The whole track',
  'achievement.track_complete.description': 'Every exercise in the course approved.',

  // Playground -------------------------------------------------------------
  'playground.title': 'Prompt playground',
  'playground.subtitle':
    'Run two prompts against the same material and read the difference. Nothing here is graded, stored, or seen by your teacher.',
  'playground.material': 'Material (optional)',
  'playground.materialSubtitle': 'Both prompts run against this, so the only variable is the prompt.',
  'playground.materialPlaceholder': 'Paste the text your prompts should work on…',
  'playground.variantA': 'Prompt A',
  'playground.variantB': 'Prompt B',
  'playground.promptPlaceholder': 'Write a prompt…',
  'playground.run': 'Run',
  'playground.runBoth': 'Run both',
  'playground.stop': 'Stop',
  'playground.clear': 'Clear',
  'playground.copyToB': 'Copy A to B →',
  'playground.output': 'Output',
  'playground.noOutput': 'Nothing run yet',
  'playground.noOutputHint': 'Write a prompt and hit Run.',
  'playground.elapsed': '{seconds}s · {chars} chars',
  'playground.running': 'Running…',
  'playground.starters': 'Things worth trying',
  'playground.startersSubtitle': 'Load a pair into A and B and see what moves.',
  'playground.load': 'Load',
  'playground.compare': 'What changed',
  'playground.compareEmpty': 'Run both prompts to compare them.',
  'playground.compareLengths': 'A produced {a} characters, B produced {b}.',
  'playground.compareSameLength': 'Both produced about the same amount of text.',
  'playground.compareHint':
    'Length is the crudest possible comparison — read both outputs. The question is which one you could hand to someone else without explaining it.',
  'playground.limitReached': 'You have run a lot of prompts recently. Wait a moment and try again.',
  'playground.pair.specificity.title': 'Vague vs pinned down',
  'playground.pair.specificity.blurb': 'The same request, with and without anything to check it against.',
  'playground.pair.persona.title': 'No role vs a role with edges',
  'playground.pair.persona.blurb': 'What a persona changes once it is allowed to refuse something.',
  'playground.pair.schema.title': 'Prose vs schema',
  'playground.pair.schema.blurb': 'A summary a person reads, against one a program can consume.',
  'playground.pair.boundary.title': 'Free rein vs a stated boundary',
  'playground.pair.boundary.blurb': 'Watch what gets invented when nothing forbids inventing.',
  'playground.notGraded': 'Not graded',
  'playground.saved': 'Your last playground session is restored from this browser only.',

  // Report -----------------------------------------------------------------
  'report.back': '← Back',
  'report.saveAsPdf': 'Save as PDF',
  'report.empty': 'No work to report yet',
  'report.emptyStudent': 'This report fills in once you have submitted an exercise.',
  'report.emptyTeacher': 'This report fills in once this student has submitted an exercise.',
  'report.kicker': 'Progress report · AI Skills',
  'report.atAGlance': 'At a glance',
  'report.exercisesCompleted': 'Exercises completed',
  'report.averageScore': 'Average score',
  'report.submissions': 'Submissions',
  'report.turnaround': 'Typical turnaround',
  'report.whatThisTeaches': 'What this course teaches',
  'report.whatThisTeachesBody':
    'Students write instructions for an AI model, test them, and reflect on why they worked. Each piece of work is scored against a fixed rubric and then reviewed by a teacher, who has the final say on every score. An exercise only unlocks the next one once a teacher has approved it.',
  'report.scoresAcross': 'Scores across the course',
  'report.passingLabel': 'Passing ({score})',
  'report.improvement': 'Improvement',
  'report.improvementLine.one':
    'Across {n} completed exercise, {name} scored an average of {first} on a first attempt and {approved} on the work that was finally approved',
  'report.improvementLine.other':
    'Across {n} completed exercises, {name} scored an average of {first} on a first attempt and {approved} on the work that was finally approved',
  'report.improvementGain': ' — an improvement of {n} points through revision',
  'report.improvementFirstTime': 'Every exercise was approved on the first attempt.',
  'report.improvementPerAttempt': 'Each revision was worth about {n} points.',
  'report.skills': 'Skills breakdown',
  'report.exerciseByExercise': 'Exercise by exercise',
  'report.completed': 'Completed',
  'report.inProgress': 'In progress',
  'report.footer':
    "Scores are produced by an AI evaluator and reviewed by a teacher, who may adjust any of them. The figures above reflect the teacher's final scores.",
  'report.lastActivity': 'Most recent activity {when}.',

  // Settings ---------------------------------------------------------------
  'settings.title': 'Settings',
  'settings.subtitle': 'Your account and how this app is wired up.',
  'settings.account': 'Account',
  'settings.name': 'Name',
  'settings.email': 'Email',
  'settings.role': 'Role',
  'settings.roleSetAtSignup': 'set at sign-up',
  'settings.userId': 'User ID',
  'settings.roleNote':
    'Your role is stored on your profile record and can only be changed by someone with database access — it is not something this page, or any page, can switch.',
  'settings.language': 'Language',
  'settings.languageSubtitle': 'Applies to this browser, and to the feedback Claude writes you.',
  'settings.languageNote':
    'Your language choice is remembered in this browser. New submissions record it, so Claude writes its feedback in the language you were working in — the rubric and your scores are the same either way.',
  'settings.apiKey': 'Anthropic API key',
  'settings.apiKeySubtitle': 'Held by the server, not by this browser.',
  'settings.apiKeyBody':
    'Nothing to configure here. Prompts and grading run in a Cloud Function that reads ANTHROPIC_API_KEY from Firebase Secret Manager.',
  'settings.apiKeyNote':
    'Earlier versions of this app called the Anthropic API straight from the browser, which meant whatever key was in use could be read out of devtools. That path is gone: the browser now calls runPrompt and evaluateSubmission, and the key never leaves the server.',
  'settings.environment': 'Environment',
  'settings.dataStore': 'Data store',
  'settings.dataStoreValue': 'Firebase Realtime Database',
  'settings.notConfigured': 'Not configured',
  'settings.firebaseConfig': 'Firebase config',
  'settings.present': 'Present',
  'settings.missing': 'Missing — set VITE_FIREBASE_* variables',
  'settings.backend': 'Backend',
  'settings.emulatorSuite': 'Local emulator suite',
  'settings.deployedProject': 'Deployed Firebase project',
  'settings.emulatorNote':
    'Auth, database, and functions are all served from firebase emulators:start on this machine. Nothing here touches your real project.',
  'settings.session': 'Session',

  // Auth -------------------------------------------------------------------
  'auth.pitch':
    'A sequence of exercises that build on each other. You write a prompt, run it, explain your reasoning, and submit. Claude scores the work against a fixed rubric within seconds — then a teacher reviews that score, adjusts it if they disagree, and decides whether you move on.',
  'auth.howScored': 'How work is scored',
  'auth.andMore': 'and {n} more',
  'auth.signInTitle': 'Sign in',
  'auth.newHere': 'New here?',
  'auth.createAccountLink': 'Create an account',
  'auth.notConfiguredSignIn':
    'Firebase is not configured, so there is nothing to sign in to. Set the VITE_FIREBASE_* variables — see the README.',
  'auth.notConfiguredSignUp':
    'Firebase is not configured, so accounts cannot be created. Set the VITE_FIREBASE_* variables — see the README.',
  'auth.googleStudentHint':
    'First time here? Google sign-in creates a student account. Teachers should use',
  'auth.signInWithGoogle': 'Sign in with Google',
  'auth.signInWithEmail': 'Sign in with email',
  'auth.emailLabel': 'Email',
  'auth.emailPlaceholder': 'jordan@school.edu',
  'auth.passwordLabel': 'Password',
  'auth.passwordPlaceholder': 'At least 6 characters',
  'auth.signUpTitle': 'Create an account',
  'auth.alreadyHaveOne': 'Already have one?',
  'auth.signInLink': 'Sign in',
  'auth.iAmA': 'I am a',
  'auth.roleStudentBlurb':
    'Work through the exercises, get scored by Claude, and unlock the next one.',
  'auth.roleTeacherBlurb':
    "Review Claude's scores, override them where you disagree, and approve progression.",
  'auth.teacherCodeLabel': 'Teacher signing code',
  'auth.teacherCodeHint':
    'Checked on the server against the TEACHER_SIGNUP_CODE secret. It is never sent to the browser, so it cannot be read out of the page.',
  'auth.googleAsRole': 'Continue with Google as {role}',
  'auth.needsCode': 'Enter the signing code to continue as a teacher.',
  'auth.orSignUpEmail': 'or sign up with email',
  'auth.nameLabel': 'Your name',
  'auth.namePlaceholderStudent': 'Jordan Mills',
  'auth.namePlaceholderTeacher': 'Ms. Alvarez',
  'auth.nameHint': 'This is the name your teacher sees on your submissions.',
  'auth.createRoleAccount': 'Create {role} account',
  'auth.or': 'or',
} as const;

export type MessageKey = keyof typeof EN;

// ---------------------------------------------------------------------------
// Spanish
// ---------------------------------------------------------------------------

/**
 * Latin American Spanish, addressing the student as "tú" — this is a classroom
 * app for teenagers, and "usted" would read as a bank letter. Teacher-facing
 * strings keep the same register for consistency.
 */
const ES: Record<MessageKey, string> = {
  'app.name': 'Habilidades IA',
  'app.subtitle': 'Gestor de ejercicios',
  'app.fullName': 'Gestor de ejercicios de habilidades con IA',
  'app.tagline': 'Ingeniería de prompts, practicada y evaluada',

  'nav.exercises': 'Mis ejercicios',
  'nav.progress': 'Progreso',
  'nav.history': 'Historial',
  'nav.playground': 'Laboratorio',
  'nav.reviewQueue': 'Cola de revisión',
  'nav.classProgress': 'Progreso del grupo',
  'nav.analytics': 'Analíticas',
  'nav.manageExercises': 'Ejercicios',
  'nav.evaluator': 'Consola del evaluador',
  'nav.settings': 'Ajustes',
  'nav.signOut': 'Cerrar sesión',

  'layout.emulators': 'Emuladores',
  'layout.emulatorsTitle':
    'Conectado al conjunto de emuladores locales de Firebase, no a tu proyecto real.',
  'layout.footer':
    'Calificado por Claude con una rúbrica fija · Cada puntuación la revisa un docente antes de contar',
  'layout.language': 'Idioma',
  'layout.checkingSession': 'Comprobando tu sesión…',

  'role.student': 'Estudiante',
  'role.teacher': 'Docente',

  'time.justNow': 'hace un momento',
  'time.minutes': 'hace {n} min',
  'time.hours': 'hace {n} h',
  'time.days': 'hace {n} d',
  'duration.none': '—',
  'duration.underMinute': 'menos de un minuto',
  'duration.minutes': '{n} min',
  'duration.hours.one': '{n} hora',
  'duration.hours.other': '{n} horas',
  'duration.days.one': '{n} día',
  'duration.days.other': '{n} días',

  'common.show': 'Mostrar',
  'common.hide': 'Ocultar',
  'common.showChart': 'Ver gráfico',
  'common.showTable': 'Ver tabla',
  'common.back': 'Volver',
  'common.chars': '{n} caracteres',
  'common.charsBudget': '{used} / {limit} caracteres',
  'common.charsLeft': 'quedan {n}',
  'common.charsOver': '{n} de más',
  'common.strengths': 'Fortalezas',
  'common.nextTime': 'La próxima vez',
  'common.teacherComment': 'Comentario del docente',
  'common.exercise': 'Ejercicio',
  'common.attempts': 'Intentos',
  'common.score': 'Puntuación',
  'common.status': 'Estado',
  'common.attemptN': 'Intento {n}',
  'common.clearsBar': 'Supera el mínimo',
  'common.belowBar': 'Por debajo del mínimo',
  'common.teacherReviewed': 'Revisado por el docente',
  'common.pendingReview': 'Puntuación de Claude, pendiente de revisión',
  'common.teacherBadge': 'Docente',
  'common.teacherAdjusted': 'Claude puso {claude}; tu docente lo ajustó a {teacher}.',

  'state.locked': 'Bloqueado',
  'state.available': 'Disponible',
  'state.in_review': 'En revisión',
  'state.revision': 'Requiere otro intento',
  'state.approved': 'Aprobado',
  'state.hint.locked': 'Se desbloquea cuando se apruebe el ejercicio anterior',
  'state.hint.in_review': 'Entregado — esperando a tu docente',
  'state.hint.revision': 'Tu docente te pidió otro intento',

  'status.evaluating': 'Evaluando',
  'status.awaiting_review': 'Esperando revisión',
  'status.approved': 'Aprobado',
  'status.needs_revision': 'Revisión solicitada',
  'status.error': 'Falló',

  'path.fundamentals.title': 'Fundamentos del prompt',
  'path.fundamentals.blurb': 'Decir exactamente lo que quieres, y a quién.',
  'path.advanced.title': 'Técnicas avanzadas',
  'path.advanced.blurb': 'Salida estructurada, descomposición y reparación.',
  'path.domain.title': 'Retos del mundo real',
  'path.domain.blurb': 'Encargos aplicados donde el resultado va a manos de alguien.',
  'difficulty.intro': 'Inicial',
  'difficulty.core': 'Central',
  'difficulty.advanced': 'Avanzado',

  'rubric.promptQuality.label': 'Calidad del prompt',
  'rubric.promptQuality.description':
    '¿Está bien construido el prompt en sí? Tarea clara, contexto útil, restricciones explícitas, formato de salida definido.',
  'rubric.understanding.label': 'Comprensión',
  'rubric.understanding.description':
    '¿Muestra tu reflexión que sabes POR QUÉ funciona el prompt, y no solo que funcionó?',
  'rubric.execution.label': 'Ejecución',
  'rubric.execution.description':
    '¿Produjo el prompt lo que pedía el ejercicio cuando se ejecutó?',
  'rubric.growth.label': 'Progreso',
  'rubric.growth.description':
    'Comparado con tus intentos anteriores, ¿avanzó este? Los primeros intentos se juzgan por su ambición, no por la diferencia.',

  'dashboard.welcome': 'Hola de nuevo, {name}',
  'dashboard.allApproved': 'Todos los ejercicios aprobados. Bien hecho.',
  'dashboard.approvedOf': '{approved} de {total} aprobados — sigue así.',
  'dashboard.averageScore': 'Puntuación media',
  'dashboard.progress': 'Progreso',
  'dashboard.pathComplete': 'Ruta completa',
  'dashboard.pathAverage': 'Media {score}',
  'dashboard.notStarted': 'Sin empezar',
  'dashboard.showingInPath.one': 'Mostrando {n} ejercicio de esta ruta.',
  'dashboard.showingInPath.other': 'Mostrando {n} ejercicios de esta ruta.',
  'dashboard.showAll': 'Ver todos',
  'dashboard.aboutMinutes': 'Unos {n} min',
  'dashboard.attemptWhen': 'intento {n} {when}',
  'dashboard.start': 'Empezar →',
  'dashboard.tryAgain': 'Intentar de nuevo →',
  'dashboard.howScored': 'Cómo se te califica',
  'dashboard.passNote':
    'Un total ponderado de {passing} o más supera el mínimo. Tu docente tiene la última palabra y puede ajustar cualquier puntuación. Algunos ejercicios ponderan las dimensiones de otra forma — el espacio de trabajo muestra los pesos de cada ejercicio.',
  'dashboard.howProgression': 'Cómo avanzas',
  'dashboard.step1':
    'Escribe y prueba tu prompt tantas veces como quieras — las pruebas no se califican.',
  'dashboard.step2': 'Entrega con una reflexión. Claude la califica al instante.',
  'dashboard.step3':
    'Tu docente revisa la puntuación y la aprueba o te pide otro intento.',
  'dashboard.step4': 'La aprobación desbloquea el siguiente ejercicio, sea de la ruta que sea.',

  'workspace.allExercises': '← Todos los ejercicios',
  'workspace.aboutMinutes': '· unos {n} min',
  'workspace.approvedNext': 'Este ejercicio está aprobado.',
  'workspace.continueTo': 'Continuar con {title}',
  'workspace.trackFinished': 'Has terminado todo el recorrido.',
  'workspace.inReview':
    'El intento {n} está entregado y esperando a tu docente. Podrás entregar de nuevo si te pide una revisión.',
  'workspace.revisionAsked': 'Tu docente te pidió otro intento:',
  'workspace.theExercise': 'El ejercicio',
  'workspace.yourTask': 'Tu tarea',
  'workspace.requirements': 'Requisitos',
  'workspace.closerToIt': 'Más cerca',
  'workspace.notThis': 'Así no',
  'workspace.situation': 'La situación',
  'workspace.scenarioRole': 'Tú eres',
  'workspace.scenarioStakeholder': 'Va dirigido a',
  'workspace.scenarioAtStake': 'Si sale mal',
  'workspace.yourPrompt': 'Tu prompt',
  'workspace.runsAgainstMaterial':
    'Se ejecuta sobre el material fijo que aparece abajo, para que todos los intentos sean comparables.',
  'workspace.runsAsWritten': 'Se ejecuta tal cual lo escribas.',
  'workspace.testRun': 'Probar',
  'workspace.stop': 'Detener',
  'workspace.promptPlaceholder': 'Escribe tu prompt aquí…',
  'workspace.testRunsFree': 'Las pruebas son ilimitadas y nunca se califican.',
  'workspace.material': 'Material sobre el que corre tu prompt',
  'workspace.whatClaudeProduced': 'Lo que produjo Claude',
  'workspace.streaming': 'Recibiendo…',
  'workspace.fromLatestRun': 'De tu última prueba',
  'workspace.noOutput': 'Todavía no hay salida',
  'workspace.noOutputHint': 'Pulsa Probar para ver qué produce tu prompt.',
  'workspace.reflection': 'Reflexión',
  'workspace.reflectionSubtitle':
    'Explica por qué funciona tu prompt — esto es el {percent}% de tu puntuación.',
  'workspace.reflectionPlaceholder':
    '¿Qué técnicas usaste y por qué cambia cada una la salida? ¿Qué probaste que no funcionó? ¿Dónde fallaría este prompt?',
  'workspace.reflectionShort': 'Al menos {min} caracteres — llevas {n}.',
  'workspace.reflectionHint':
    'Nombrar el mecanismo puntúa más alto que describir el resultado.',
  'workspace.submitAttempt': 'Entregar intento {n}',
  'workspace.submitting': 'Entregando…',
  'workspace.submitHint':
    'Al entregar, el servidor vuelve a ejecutar tu prompt y califica lo que produjo.',
  'workspace.evaluatingStage': 'Ejecutando tu prompt y calificándolo…',
  'workspace.yourAttempts': 'Tus intentos ({n})',
  'workspace.attemptsKept': 'Se guardan todos los intentos, con la retroalimentación que recibieron.',
  'workspace.tips': 'Consejos',
  'workspace.attemptScore': 'Puntuación del intento {n}',
  'workspace.openFullFeedback': 'Ver la retroalimentación completa →',
  'workspace.compareAttempts': 'Comparar con tus otros intentos →',
  'workspace.promptAndOutput': 'Prompt y salida de este intento',
  'workspace.prompt': 'Prompt',
  'workspace.output': 'Salida',
  'workspace.noneCaptured': '(ninguna)',
  'workspace.upFromFirst': 'Subiste {n} puntos desde tu primer intento.',
  'workspace.downFromFirst': 'Bajaste {n} puntos desde tu primer intento.',
  'workspace.sameAsFirst': 'La misma puntuación que tu primer intento.',
  'workspace.deltaTitle': 'Cambio respecto al intento anterior',

  'history.title': 'Historial',
  'history.subtitle': 'Todos los intentos que has entregado, del más reciente al más antiguo.',
  'history.empty': 'Todavía no has entregado nada',
  'history.startFirst': 'Empieza tu primer ejercicio',
  'history.attemptTitle': '{title} — intento {n}',
  'history.fullFeedback': 'Historial de revisiones y retroalimentación completa →',
  'history.noEvaluation': 'No hay evaluación registrada para este intento.',
  'history.openAttempt': 'Abrir este intento →',

  'detail.backToHistory': '← Historial',
  'detail.attemptOf': 'Intento {n} de {total} · {when}',
  'detail.revisionHistory': 'Historial de revisiones',
  'detail.revisionHistorySubtitle':
    'Todos los intentos que has hecho en este ejercicio, y cómo se movió la puntuación.',
  'detail.whatWasAskedToFix': 'Lo que se pidió corregir en el intento {n}',
  'detail.whatWasAskedSubtitle':
    'Los consejos de Claude sobre tu intento anterior, junto a lo que entregaste esta vez.',
  'detail.flaggedOn': 'Señalado en el intento {n}',
  'detail.teacherAskedFor': 'Tu docente pidió',
  'detail.claudeFeedback': 'Retroalimentación de Claude',
  'detail.promptYouSubmitted': 'El prompt que entregaste',
  'detail.whatItProduced': 'Lo que produjo',
  'detail.noOutputCaptured': '(no se registró salida)',
  'detail.yourReflection': 'Tu reflexión',
  'detail.leftBlank': '(en blanco)',
  'detail.neverScored': 'Este intento nunca se calificó.',
  'detail.claudeVsTeacher': 'Claude puso {claude}; tu docente registró {teacher}.',
  'detail.theExercise': 'El ejercicio',
  'detail.openWorkspace': 'Abrir el espacio de trabajo →',

  'progress.title': 'Tu progreso',
  'progress.subtitle':
    'Cómo se han movido tus puntuaciones a lo largo del recorrido, y en qué se ha ido tu tiempo.',
  'progress.empty': 'Todavía no hay nada que graficar',
  'progress.emptyHint': 'Entrega tu primer ejercicio y tu progreso aparecerá aquí.',
  'progress.backToExercises': 'Volver a tus ejercicios',
  'progress.approved': 'Aprobados',
  'progress.averageScore': 'Puntuación media',
  'progress.attempts': 'Intentos',
  'progress.turnaround': 'Tiempo habitual',
  'progress.scoreAcrossTrack': 'Puntuación en el recorrido',
  'progress.scoreAcrossTrackSubtitle':
    'Tu mejor puntuación en cada ejercicio que has intentado, en orden.',
  'progress.best': 'Mejor',
  'progress.timeToApproval': 'Tiempo hasta la aprobación',
  'progress.velocity': 'Velocidad de aprendizaje',
  'progress.velocitySubtitle': 'Dónde empezó cada ejercicio y dónde se aprobó.',
  'progress.velocityEmpty': 'Todavía no hay ejercicios aprobados',
  'progress.velocityEmptyHint':
    'Esto se llena cuando un docente apruebe tu primera entrega.',
  'progress.velocityLine.one':
    'En {n} ejercicio aprobado pasaste de una media de {first} en el primer intento a {approved} al aprobarse',
  'progress.velocityLine.other':
    'En {n} ejercicios aprobados pasaste de una media de {first} en el primer intento a {approved} al aprobarse',
  'progress.velocityGain': ' — una ganancia de {n} puntos',
  'progress.velocityPerAttempt': 'Eso da unos {n} puntos por revisión.',
  'progress.velocityNoRevisions':
    'Todos los ejercicios se aprobaron a la primera, así que no hay tasa de revisión que informar.',
  'progress.effort': 'Esfuerzo por ejercicio',
  'progress.effortSubtitle': 'Intentos hechos, y cuánto duró cada ejercicio de principio a fin.',
  'progress.attemptCount.one': '{n} intento',
  'progress.attemptCount.other': '{n} intentos',
  'progress.effortHint':
    'Más intentos no es peor. En las revisiones es donde se ve casi todo el aprendizaje — para eso el gráfico de velocidad de arriba es el que hay que leer.',
  'progress.dimensions': 'Dimensiones de la rúbrica',
  'progress.dimensionsSubtitle': 'Tu media en cada una, sobre todos los intentos.',
  'progress.strongestWeakest': 'Más fuerte en {strongest}, más débil en {weakest}.',
  'progress.report': 'Informe',
  'progress.reportSubtitle': 'Un resumen imprimible para compartir.',
  'progress.reportBody':
    'Genera un resumen de una página de tu progreso que puede guardarse como PDF.',
  'progress.openReport': 'Abrir informe',

  'achievements.title': 'Insignias',
  'achievements.subtitle': 'Ganadas con el trabajo que has entregado — {earned} de {total}.',
  'achievements.empty': 'Todavía no hay insignias',
  'achievements.emptyHint': 'Tu primer ejercicio aprobado te da tu primera insignia.',
  'achievements.locked': 'Aún no conseguida',
  'achievements.earnedWhen': 'Conseguida {when}',
  'achievements.viewAll': 'Ver todas las insignias →',
  'achievement.first_approval.title': 'En el marcador',
  'achievement.first_approval.description': 'Tu primer ejercicio aprobado por un docente.',
  'achievement.first_time_right.title': 'A la primera',
  'achievement.first_time_right.description': 'Un ejercicio aprobado en su primer intento.',
  'achievement.turned_it_around.title': 'Le diste la vuelta',
  'achievement.turned_it_around.description':
    'Ganaste {points} puntos entre dos intentos del mismo ejercicio.',
  'achievement.full_marks_dimension.title': 'Nada que corregir',
  'achievement.full_marks_dimension.description': 'Sacaste {score} o más en una sola dimensión.',
  'achievement.shows_the_working.title': 'Enseñas el razonamiento',
  'achievement.shows_the_working.description':
    'Sacaste {score} o más en Comprensión — explicaste el mecanismo, no el resultado.',
  'achievement.four_across.title': 'Las cuatro',
  'achievement.four_across.description':
    'Todas las dimensiones de la rúbrica por encima de {score} en un intento.',
  'achievement.kept_at_it.title': 'No lo dejaste',
  'achievement.kept_at_it.description':
    'Tres intentos o más en un ejercicio. Revisar es el trabajo.',
  'achievement.into_the_field.title': 'Al mundo real',
  'achievement.into_the_field.description': 'Aprobado en un reto del mundo real.',
  'achievement.path_complete.title': '{path} completa',
  'achievement.path_complete.description': 'Todos los ejercicios de esta ruta aprobados.',
  'achievement.track_complete.title': 'El recorrido entero',
  'achievement.track_complete.description': 'Todos los ejercicios del curso aprobados.',

  'playground.title': 'Laboratorio de prompts',
  'playground.subtitle':
    'Ejecuta dos prompts sobre el mismo material y lee la diferencia. Nada de esto se califica, se guarda ni lo ve tu docente.',
  'playground.material': 'Material (opcional)',
  'playground.materialSubtitle':
    'Ambos prompts corren sobre esto, así que la única variable es el prompt.',
  'playground.materialPlaceholder': 'Pega aquí el texto sobre el que deben trabajar tus prompts…',
  'playground.variantA': 'Prompt A',
  'playground.variantB': 'Prompt B',
  'playground.promptPlaceholder': 'Escribe un prompt…',
  'playground.run': 'Ejecutar',
  'playground.runBoth': 'Ejecutar ambos',
  'playground.stop': 'Detener',
  'playground.clear': 'Limpiar',
  'playground.copyToB': 'Copiar A en B →',
  'playground.output': 'Salida',
  'playground.noOutput': 'Todavía no has ejecutado nada',
  'playground.noOutputHint': 'Escribe un prompt y pulsa Ejecutar.',
  'playground.elapsed': '{seconds}s · {chars} caracteres',
  'playground.running': 'Ejecutando…',
  'playground.starters': 'Cosas que vale la pena probar',
  'playground.startersSubtitle': 'Carga un par en A y B y observa qué cambia.',
  'playground.load': 'Cargar',
  'playground.compare': 'Qué cambió',
  'playground.compareEmpty': 'Ejecuta ambos prompts para compararlos.',
  'playground.compareLengths': 'A produjo {a} caracteres y B produjo {b}.',
  'playground.compareSameLength': 'Los dos produjeron más o menos la misma cantidad de texto.',
  'playground.compareHint':
    'La longitud es la comparación más burda posible — lee las dos salidas. La pregunta es cuál podrías entregarle a otra persona sin tener que explicársela.',
  'playground.limitReached':
    'Has ejecutado muchos prompts hace poco. Espera un momento e inténtalo de nuevo.',
  'playground.pair.specificity.title': 'Vago frente a concreto',
  'playground.pair.specificity.blurb':
    'La misma petición, con y sin nada con lo que contrastarla.',
  'playground.pair.persona.title': 'Sin rol frente a un rol con límites',
  'playground.pair.persona.blurb': 'Qué cambia un personaje cuando se le permite negarse a algo.',
  'playground.pair.schema.title': 'Prosa frente a esquema',
  'playground.pair.schema.blurb':
    'Un resumen que lee una persona, frente a uno que consume un programa.',
  'playground.pair.boundary.title': 'Vía libre frente a un límite declarado',
  'playground.pair.boundary.blurb': 'Observa qué se inventa cuando nada prohíbe inventar.',
  'playground.notGraded': 'Sin calificar',
  'playground.saved': 'Tu última sesión del laboratorio se restaura solo desde este navegador.',

  'report.back': '← Volver',
  'report.saveAsPdf': 'Guardar como PDF',
  'report.empty': 'Todavía no hay trabajo que informar',
  'report.emptyStudent': 'Este informe se llena cuando entregues un ejercicio.',
  'report.emptyTeacher': 'Este informe se llena cuando este estudiante entregue un ejercicio.',
  'report.kicker': 'Informe de progreso · Habilidades IA',
  'report.atAGlance': 'Un vistazo',
  'report.exercisesCompleted': 'Ejercicios completados',
  'report.averageScore': 'Puntuación media',
  'report.submissions': 'Entregas',
  'report.turnaround': 'Tiempo habitual',
  'report.whatThisTeaches': 'Qué enseña este curso',
  'report.whatThisTeachesBody':
    'Los estudiantes escriben instrucciones para un modelo de IA, las prueban y reflexionan sobre por qué funcionaron. Cada trabajo se califica con una rúbrica fija y después lo revisa un docente, que tiene la última palabra sobre cada puntuación. Un ejercicio solo desbloquea el siguiente cuando un docente lo ha aprobado.',
  'report.scoresAcross': 'Puntuaciones a lo largo del curso',
  'report.passingLabel': 'Mínimo ({score})',
  'report.improvement': 'Mejora',
  'report.improvementLine.one':
    'En {n} ejercicio completado, {name} obtuvo una media de {first} en el primer intento y {approved} en el trabajo finalmente aprobado',
  'report.improvementLine.other':
    'En {n} ejercicios completados, {name} obtuvo una media de {first} en el primer intento y {approved} en el trabajo finalmente aprobado',
  'report.improvementGain': ' — una mejora de {n} puntos gracias a las revisiones',
  'report.improvementFirstTime': 'Todos los ejercicios se aprobaron en el primer intento.',
  'report.improvementPerAttempt': 'Cada revisión valió unos {n} puntos.',
  'report.skills': 'Desglose por habilidad',
  'report.exerciseByExercise': 'Ejercicio por ejercicio',
  'report.completed': 'Completado',
  'report.inProgress': 'En curso',
  'report.footer':
    'Las puntuaciones las produce un evaluador de IA y las revisa un docente, que puede ajustar cualquiera de ellas. Las cifras anteriores reflejan las puntuaciones finales del docente.',
  'report.lastActivity': 'Actividad más reciente {when}.',

  'settings.title': 'Ajustes',
  'settings.subtitle': 'Tu cuenta y cómo está conectada esta aplicación.',
  'settings.account': 'Cuenta',
  'settings.name': 'Nombre',
  'settings.email': 'Correo',
  'settings.role': 'Rol',
  'settings.roleSetAtSignup': 'definido al registrarte',
  'settings.userId': 'ID de usuario',
  'settings.roleNote':
    'Tu rol se guarda en tu perfil y solo puede cambiarlo alguien con acceso a la base de datos — no es algo que esta página, ni ninguna otra, pueda cambiar.',
  'settings.language': 'Idioma',
  'settings.languageSubtitle':
    'Se aplica a este navegador y a la retroalimentación que te escribe Claude.',
  'settings.languageNote':
    'Tu idioma se recuerda en este navegador. Las entregas nuevas lo registran, así que Claude escribe su retroalimentación en el idioma en el que trabajaste — la rúbrica y tus puntuaciones son las mismas en cualquier caso.',
  'settings.apiKey': 'Clave de la API de Anthropic',
  'settings.apiKeySubtitle': 'La guarda el servidor, no este navegador.',
  'settings.apiKeyBody':
    'Aquí no hay nada que configurar. Los prompts y la calificación corren en una Cloud Function que lee ANTHROPIC_API_KEY desde Firebase Secret Manager.',
  'settings.apiKeyNote':
    'Versiones anteriores de esta app llamaban a la API de Anthropic desde el navegador, así que la clave en uso podía leerse desde las herramientas de desarrollo. Ese camino ya no existe: el navegador llama a runPrompt y evaluateSubmission, y la clave nunca sale del servidor.',
  'settings.environment': 'Entorno',
  'settings.dataStore': 'Almacén de datos',
  'settings.dataStoreValue': 'Firebase Realtime Database',
  'settings.notConfigured': 'Sin configurar',
  'settings.firebaseConfig': 'Configuración de Firebase',
  'settings.present': 'Presente',
  'settings.missing': 'Falta — define las variables VITE_FIREBASE_*',
  'settings.backend': 'Backend',
  'settings.emulatorSuite': 'Emuladores locales',
  'settings.deployedProject': 'Proyecto de Firebase desplegado',
  'settings.emulatorNote':
    'La autenticación, la base de datos y las funciones vienen de firebase emulators:start en esta máquina. Nada de esto toca tu proyecto real.',
  'settings.session': 'Sesión',

  'auth.pitch':
    'Una secuencia de ejercicios que se apoyan unos en otros. Escribes un prompt, lo ejecutas, explicas tu razonamiento y lo entregas. Claude califica el trabajo con una rúbrica fija en segundos — luego un docente revisa esa puntuación, la ajusta si no está de acuerdo y decide si avanzas.',
  'auth.howScored': 'Cómo se califica el trabajo',
  'auth.andMore': 'y {n} más',
  'auth.signInTitle': 'Iniciar sesión',
  'auth.newHere': '¿Eres nuevo?',
  'auth.createAccountLink': 'Crea una cuenta',
  'auth.notConfiguredSignIn':
    'Firebase no está configurado, así que no hay dónde iniciar sesión. Define las variables VITE_FIREBASE_* — consulta el README.',
  'auth.notConfiguredSignUp':
    'Firebase no está configurado, así que no se pueden crear cuentas. Define las variables VITE_FIREBASE_* — consulta el README.',
  'auth.googleStudentHint':
    '¿Primera vez? Entrar con Google crea una cuenta de estudiante. El profesorado debe usar',
  'auth.signInWithGoogle': 'Entrar con Google',
  'auth.signInWithEmail': 'Entrar con correo',
  'auth.emailLabel': 'Correo',
  'auth.emailPlaceholder': 'jordan@escuela.edu',
  'auth.passwordLabel': 'Contraseña',
  'auth.passwordPlaceholder': 'Al menos 6 caracteres',
  'auth.signUpTitle': 'Crear una cuenta',
  'auth.alreadyHaveOne': '¿Ya tienes una?',
  'auth.signInLink': 'Inicia sesión',
  'auth.iAmA': 'Soy',
  'auth.roleStudentBlurb':
    'Avanza por los ejercicios, recibe la puntuación de Claude y desbloquea el siguiente.',
  'auth.roleTeacherBlurb':
    'Revisa las puntuaciones de Claude, corrígelas cuando no estés de acuerdo y aprueba el avance.',
  'auth.teacherCodeLabel': 'Código de registro docente',
  'auth.teacherCodeHint':
    'Se comprueba en el servidor contra el secreto TEACHER_SIGNUP_CODE. Nunca se envía al navegador, así que no puede leerse desde la página.',
  'auth.googleAsRole': 'Continuar con Google como {role}',
  'auth.needsCode': 'Introduce el código de registro para continuar como docente.',
  'auth.orSignUpEmail': 'o regístrate con correo',
  'auth.nameLabel': 'Tu nombre',
  'auth.namePlaceholderStudent': 'Jordan Mills',
  'auth.namePlaceholderTeacher': 'Sra. Álvarez',
  'auth.nameHint': 'Este es el nombre que tu docente ve en tus entregas.',
  'auth.createRoleAccount': 'Crear cuenta de {role}',
  'auth.or': 'o',
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en: EN, es: ES };

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export type Vars = Record<string, string | number>;

/**
 * A message in `locale`, with `{placeholder}` substitution.
 *
 * A key missing from Spanish cannot reach here — the type on ES forbids it —
 * so the English fallback is for the runtime case only: a stored locale from a
 * future version of the app that this bundle does not know.
 */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const template = DICTIONARIES[locale]?.[key] ?? EN[key];
  if (!template) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Picks the `.one` or `.other` variant of `key` by count.
 *
 * Both languages here have exactly two forms and agree on where the boundary
 * sits, so this stays a two-way branch rather than a plural-rules engine. A
 * third language with a few/many distinction would need one — that is the point
 * at which this should grow, not before.
 */
export function plural(locale: Locale, key: string, count: number, vars?: Vars): string {
  const variant = `${key}.${count === 1 ? 'one' : 'other'}` as MessageKey;
  return translate(locale, variant, { n: count, ...vars });
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es';
}

/**
 * The locale to start in: what was chosen last, else the browser's language,
 * else English.
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private browsing can throw on localStorage access; fall through.
  }
  const preferred = window.navigator?.languages ?? [window.navigator?.language ?? ''];
  return preferred.some((tag) => tag?.toLowerCase().startsWith('es')) ? 'es' : DEFAULT_LOCALE;
}

export const LOCALE_STORAGE_KEY = 'aiskills.locale';

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Not being able to remember the choice is not worth failing the switch.
  }
}

// ---------------------------------------------------------------------------
// The active locale, for formatters that are not components
// ---------------------------------------------------------------------------

/**
 * `relativeTime()` and `formatDuration()` are plain functions called from
 * dozens of places, including inside chart data built during render. Threading
 * a translator through every call site would be noise, so they read the locale
 * the provider last set here.
 *
 * This is the only mutable module state in the app, and it exists for exactly
 * those two formatters. Components must use `useLocale()` — a component that
 * read this instead would not re-render when the language changed.
 */
let active: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale): void {
  active = locale;
}

export function activeLocale(): Locale {
  return active;
}

/** Translate in the active locale. For formatters only — see above. */
export function tActive(key: MessageKey, vars?: Vars): string {
  return translate(active, key, vars);
}

export function pluralActive(key: string, count: number, vars?: Vars): string {
  return plural(active, key, count, vars);
}

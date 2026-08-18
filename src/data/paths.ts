import type { Exercise, LearningPath, PathId } from '../types';

/**
 * Learning paths group the exercise board into tracks.
 *
 * Grouping only: the unlock chain still runs across every exercise in `order`,
 * so a path is a lens on the same progression rather than a parallel one. One
 * chain keeps computeProgress() the single source of truth for locking.
 */
export const PATHS: LearningPath[] = [
  {
    id: 'fundamentals',
    title: 'Prompt Fundamentals',
    blurb: 'Saying exactly what you want, and to whom.',
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'advanced',
    title: 'Advanced Techniques',
    blurb: 'Structured output, decomposition, and repair.',
    accent: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    id: 'domain',
    title: 'Domain-Specific',
    blurb: 'Prompts built for one subject or workflow.',
    accent: 'bg-teal-50 text-teal-700 border-teal-200',
  },
];

export const PATH_BY_ID: Record<PathId, LearningPath> = Object.fromEntries(
  PATHS.map((p) => [p.id, p]),
) as Record<PathId, LearningPath>;

export const DIFFICULTY_LABEL: Record<Exercise['difficulty'], string> = {
  intro: 'Intro',
  core: 'Core',
  advanced: 'Advanced',
};

export const DIFFICULTY_STYLE: Record<Exercise['difficulty'], string> = {
  intro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  core: 'bg-sky-50 text-sky-700 border-sky-200',
  advanced: 'bg-amber-50 text-amber-700 border-amber-200',
};

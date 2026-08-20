import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useClasses } from '../hooks/useData';
import type { ClassGroup, Submission, UserProfile } from '../types';

/**
 * Which class a teacher is looking at.
 *
 * A class is a **lens on the teacher's own screens** and nothing more. It does
 * not fork the curriculum, it does not change the rubric, and it does not
 * appear anywhere on the student side — `computeProgress()` is still the only
 * place locking is decided, and it still runs over one ordered exercise list
 * for everyone. Every filter in this file removes rows from a teacher's view;
 * none of them changes a number.
 *
 * That constraint is what keeps multi-class cheap. The moment a class carries
 * its own exercise set or its own passing score, three derived modules
 * (analytics, achievements, progress) each grow a "which class" parameter and
 * the single source of truth becomes several.
 *
 * The selection lives in localStorage rather than on the profile, like the
 * language and the theme: a teacher covering someone else's period on a shared
 * staffroom machine should not have their own default follow them there.
 */

export const CLASS_STORAGE_KEY = 'aiskills.class';

/** Sentinel selections that are not a class id. */
export const ALL_CLASSES = '';
export const UNASSIGNED = 'unassigned';

interface ClassContextValue {
  classes: ClassGroup[];
  loading: boolean;
  /** A class id, ALL_CLASSES, or UNASSIGNED. */
  selectedId: string;
  setSelectedId: (id: string) => void;
  /** The selected class, when the selection is one. */
  selected?: ClassGroup;
  /** True when every student is in view. */
  showingAll: boolean;
  /** Whether this student is inside the current selection. */
  includes: (uid: string) => boolean;
  filterStudents: (students: UserProfile[]) => UserProfile[];
  filterSubmissions: (submissions: Submission[]) => Submission[];
}

const ClassContext = createContext<ClassContextValue | null>(null);

function readStored(): string {
  try {
    return window.localStorage.getItem(CLASS_STORAGE_KEY) ?? ALL_CLASSES;
  } catch {
    return ALL_CLASSES;
  }
}

export function ClassProvider({ children }: { children: ReactNode }) {
  const { classes, loading } = useClasses();
  const [selectedId, setSelectedIdState] = useState<string>(readStored);

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
    try {
      window.localStorage.setItem(CLASS_STORAGE_KEY, id);
    } catch {
      // Not remembering the choice is not worth failing the switch.
    }
  }, []);

  const selected = classes.find((group) => group.id === selectedId);

  // A class deleted in another tab would otherwise leave this one filtering
  // against an id nothing matches, which reads as "the class is empty".
  useEffect(() => {
    if (loading) return;
    if (selectedId === ALL_CLASSES || selectedId === UNASSIGNED) return;
    if (!classes.some((group) => group.id === selectedId)) setSelectedId(ALL_CLASSES);
  }, [classes, loading, selectedId, setSelectedId]);

  const value = useMemo<ClassContextValue>(() => {
    /** Everyone who is in some class. Only needed for the UNASSIGNED lens. */
    const assigned = new Set(classes.flatMap((group) => Object.keys(group.students ?? {})));

    const includes = (uid: string): boolean => {
      if (selectedId === ALL_CLASSES) return true;
      if (selectedId === UNASSIGNED) return !assigned.has(uid);
      return Boolean(selected?.students?.[uid]);
    };

    return {
      classes,
      loading,
      selectedId,
      setSelectedId,
      selected,
      showingAll: selectedId === ALL_CLASSES,
      includes,
      filterStudents: (students) =>
        selectedId === ALL_CLASSES ? students : students.filter((s) => includes(s.uid)),
      filterSubmissions: (submissions) =>
        selectedId === ALL_CLASSES ? submissions : submissions.filter((s) => includes(s.studentId)),
    };
  }, [classes, loading, selectedId, selected, setSelectedId]);

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClassFilter(): ClassContextValue {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClassFilter must be used inside a ClassProvider');
  return ctx;
}

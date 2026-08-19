import { useMemo, useState } from 'react';
import { useClassFilter } from '../context/ClassContext';
import { useSession } from '../context/SessionContext';
import { computeProgress, useExercises, useStudents, useSubmissions } from '../hooks/useData';
import { deleteClass, newId, saveClass, setClassMembership } from '../lib/store';
import { Alert, EmptyState, Panel, relativeTime, scoreTone } from '../components/ui';
import type { ClassGroup, UserProfile } from '../types';

/**
 * Classes: the roster, cut into groups.
 *
 * A teacher screen, so English — see rule 9 in CLAUDE.md. Nothing here is
 * visible to a student, and nothing here changes a score, a lock, or a rubric.
 * A class is a filter over the teacher's own views and that is the whole of it;
 * the header picker is what actually applies it.
 *
 * Every teacher can edit every class, matching how reviews already work. The
 * alternative — classes owned by whoever made them — means a covering teacher
 * cannot mark, which is the situation the feature exists to help with.
 */
export default function TeacherClasses() {
  const { session } = useSession();
  const { students, loading: studentsLoading } = useStudents();
  const { submissions } = useSubmissions();
  const { exercises } = useExercises();
  const { classes, loading, setSelectedId } = useClassFilter();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /** Everyone in some class, so the leftovers can be counted honestly. */
  const assigned = useMemo(
    () => new Set(classes.flatMap((group) => Object.keys(group.students ?? {}))),
    [classes],
  );
  const unassigned = students.filter((s) => !assigned.has(s.uid));

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || !session) return;
    setBusy(true);
    setError('');
    const now = Date.now();
    const group: ClassGroup = {
      id: newId('class'),
      name: trimmed.slice(0, 80),
      note: note.trim().slice(0, 200) || undefined,
      teacherId: session.id,
      teacherName: session.name,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveClass(group);
      setName('');
      setNote('');
      setOpenId(group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that class.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(group: ClassGroup, next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === group.name) return;
    try {
      await saveClass({ ...group, name: trimmed.slice(0, 80), updatedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename that class.');
    }
  }

  async function handleDelete(group: ClassGroup) {
    // Deleting a class deletes a grouping, never a student and never their
    // work — say so, because "delete" next to a list of names reads worse
    // than it is.
    const ok = window.confirm(
      `Delete "${group.name}"? Its students and all of their work are untouched — only the grouping goes.`,
    );
    if (!ok) return;
    try {
      await deleteClass(group.id);
      if (openId === group.id) setOpenId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that class.');
    }
  }

  async function handleToggleMember(group: ClassGroup, uid: string, member: boolean) {
    try {
      await setClassMembership(group.id, uid, member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that roster.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Classes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Group the roster so the review queue, class progress, and analytics can be narrowed to one
          set of students. Students never see a class, and grouping changes nothing about how anyone
          is scored or what unlocks next.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <Panel title="New class" subtitle="A name is enough. The note is for you — a period, a room, a term.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="label" htmlFor="class-name">
              Name
            </label>
            <input
              id="class-name"
              className="input"
              value={name}
              maxLength={80}
              placeholder="Period 3 — Digital Literacy"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="label" htmlFor="class-note">
              Note <span className="font-normal text-ink-400">optional</span>
            </label>
            <input
              id="class-note"
              className="input"
              value={note}
              maxLength={200}
              placeholder="Tues/Thurs, Room 204"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={!name.trim() || busy}
            className="btn-primary"
          >
            Create class
          </button>
        </div>
      </Panel>

      {loading && <div className="h-40 animate-pulse rounded-xl bg-ink-100" />}

      {!loading && classes.length === 0 && (
        <EmptyState title="No classes yet">
          Everyone signed in is one roster until you make one. That is a perfectly good way to run a
          single group.
        </EmptyState>
      )}

      <div className="space-y-4">
        {classes.map((group) => {
          const members = students.filter((s) => group.students?.[s.uid]);
          const open = openId === group.id;
          return (
            <Panel
              key={group.id}
              title={group.name}
              subtitle={
                [group.note, `${members.length} of ${students.length} students`, `set up by ${group.teacherName}`]
                  .filter(Boolean)
                  .join(' · ')
              }
              action={
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setSelectedId(group.id)}
                    className="btn-ghost px-2 py-1 text-xs"
                    title="Filter every teacher screen to this class"
                  >
                    View class
                  </button>
                  <button
                    onClick={() => setOpenId(open ? null : group.id)}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {open ? 'Done' : 'Edit roster'}
                  </button>
                </div>
              }
            >
              {open ? (
                <RosterEditor
                  group={group}
                  students={students}
                  loading={studentsLoading}
                  onRename={(next) => void handleRename(group, next)}
                  onToggle={(uid, member) => void handleToggleMember(group, uid, member)}
                  onDelete={() => void handleDelete(group)}
                />
              ) : members.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No students yet. Edit the roster to add them.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((student) => {
                    const progress = computeProgress(student.uid, submissions, exercises);
                    const approved = exercises.filter(
                      (e) => progress.get(e.id)?.state === 'approved',
                    ).length;
                    const scores = exercises
                      .map((e) => progress.get(e.id)?.best ?? 0)
                      .filter((s) => s > 0);
                    const average = scores.length
                      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                      : 0;
                    return (
                      <li
                        key={student.uid}
                        className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink-800">
                            {student.displayName}
                          </span>
                          <span className="text-xs text-ink-400">
                            {approved}/{exercises.length} approved
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            average ? scoreTone(average) : 'text-ink-300'
                          }`}
                        >
                          {average || '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <Panel
          title="Not in any class"
          subtitle="They still appear everywhere the filter is set to all students."
        >
          <ul className="flex flex-wrap gap-2">
            {unassigned.map((student) => (
              <li
                key={student.uid}
                className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs text-ink-600"
                title={`Last seen ${relativeTime(student.lastSeenAt ?? student.createdAt)}`}
              >
                {student.displayName}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function RosterEditor({
  group,
  students,
  loading,
  onRename,
  onToggle,
  onDelete,
}: {
  group: ClassGroup;
  students: UserProfile[];
  loading: boolean;
  onRename: (next: string) => void;
  onToggle: (uid: string, member: boolean) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [query, setQuery] = useState('');

  const shown = students.filter((s) =>
    s.displayName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor={`rename-${group.id}`}>
            Class name
          </label>
          <input
            id={`rename-${group.id}`}
            className="input"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => onRename(name)}
          />
        </div>
        <input
          className="input min-w-[10rem] flex-1"
          value={query}
          placeholder="Filter students…"
          aria-label="Filter students"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="h-24 animate-pulse rounded-lg bg-ink-100" />}

      {!loading && students.length === 0 && (
        <p className="text-sm text-ink-500">No students have signed in yet.</p>
      )}

      {shown.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((student) => {
            const member = Boolean(group.students?.[student.uid]);
            return (
              <li key={student.uid}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={member}
                    onChange={(e) => onToggle(student.uid, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1 truncate">{student.displayName}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ink-200 pt-4">
        <button onClick={onDelete} className="btn-danger px-3 py-1.5 text-xs">
          Delete class
        </button>
        <p className="hint mt-2">
          Deletes the grouping only. Every student, submission, score, and review survives it.
        </p>
      </div>
    </div>
  );
}

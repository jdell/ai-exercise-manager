import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * The two keyboard shortcuts the app has, and the rules that keep them from
 * doing damage.
 *
 * Both are bound at the window, because the useful case is exactly the one
 * where focus is somewhere else — a student who has just finished typing a
 * reflection should be able to submit without reaching for the mouse.
 */

/** True when the key event came from somewhere text is being entered. */
function inTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * ⌘/Ctrl + Enter submits.
 *
 * Deliberately *not* plain Enter, even outside a text field: this app's submit
 * is irreversible in the way that matters — it writes an attempt, spends tokens
 * grading it, and puts the result in a teacher's queue. A shortcut that fires on
 * a stray Enter would produce attempts nobody meant to make.
 *
 * `enabled` mirrors the button's own disabled state so the shortcut can never do
 * something the button would refuse.
 */
export function useSubmitHotkey(handler: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (!event.metaKey && !event.ctrlKey) return;
      // Let a composing IME finish. On a Japanese or Korean keyboard, Enter
      // during composition means "accept this candidate", not "submit".
      if (event.isComposing) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}

/**
 * Escape goes back — but only when going back costs nothing.
 *
 * Two guards, in order:
 *
 *   1. **In a text field, Escape blurs and stops there.** Navigating away from
 *      under someone's cursor is how you lose a half-written prompt to a
 *      keystroke that, in every other app, means "dismiss this".
 *   2. **`when` is the page's own answer to "is there unsaved work?"** A
 *      workspace holding a typed prompt, or a review holding a typed comment,
 *      passes false and Escape does nothing. None of this state survives
 *      unmounting, so a shortcut that discarded it would be a data-loss bug
 *      wearing a convenience hat.
 *
 * The result is that Escape is a real shortcut on the pages that are views, and
 * inert on the pages that are editors. That asymmetry is intentional; a hint in
 * the UI names the keys so it is discoverable either way.
 */
export function useEscapeToGoBack(to: string, when = true): void {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (inTextField(event.target)) {
        (event.target as HTMLElement).blur();
        return;
      }
      if (!when) return;

      event.preventDefault();
      navigate(to);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, to, when]);
}

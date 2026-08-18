import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { describeError, runPlaygroundPrompt } from '../lib/claude';
import { PLAYGROUND_PAIRS } from '../data/playground-pairs';
import { Alert, EmptyState, Panel, Spinner } from '../components/ui';

/**
 * A scratch space for prompts.
 *
 * The exercise workspace answers "is my prompt good enough to submit". This
 * answers a different and earlier question — "what does this instruction
 * actually do" — and it answers it by difference: two prompts, one body of
 * material, both outputs side by side. A single output tells a student what
 * Claude said; a pair tells them what their change did, which is the only thing
 * that generalises.
 *
 * Nothing here is graded, written to the database, or visible to a teacher.
 * That is what makes it a playground rather than an ungraded exercise: an
 * experiment that might be marked is not an experiment. The only trace a run
 * leaves is on the per-user quota counter the function keeps.
 */

type Slot = 'a' | 'b';

interface Variant {
  prompt: string;
  output: string;
  running: boolean;
  /** Wall-clock seconds of the last completed run. */
  seconds: number | null;
}

const EMPTY_VARIANT: Variant = { prompt: '', output: '', running: false, seconds: null };

/**
 * The last session, restored from this browser only.
 *
 * localStorage rather than the database on purpose: a playground run is not
 * work, and putting it under /submissions or anywhere else a teacher can read
 * would quietly make it work.
 */
const STORAGE_KEY = 'aiskills.playground';

interface StoredSession {
  material: string;
  a: string;
  b: string;
}

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return {
      material: typeof parsed.material === 'string' ? parsed.material : '',
      a: typeof parsed.a === 'string' ? parsed.a : '',
      b: typeof parsed.b === 'string' ? parsed.b : '',
    };
  } catch {
    return null;
  }
}

export default function Playground() {
  const { t, locale } = useLocale();
  const [material, setMaterial] = useState('');
  const [variants, setVariants] = useState<Record<Slot, Variant>>({
    a: EMPTY_VARIANT,
    b: EMPTY_VARIANT,
  });
  const [error, setError] = useState('');
  const abortRef = useRef<Record<Slot, AbortController | null>>({ a: null, b: null });
  const restored = useRef(false);

  // Restore once, on mount. Re-running this on every render would fight the
  // user's typing.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStored();
    if (!stored) return;
    setMaterial(stored.material);
    setVariants({
      a: { ...EMPTY_VARIANT, prompt: stored.a },
      b: { ...EMPTY_VARIANT, prompt: stored.b },
    });
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ material, a: variants.a.prompt, b: variants.b.prompt }),
      );
    } catch {
      // Losing the draft is not worth failing a keystroke over.
    }
  }, [material, variants.a.prompt, variants.b.prompt]);

  useEffect(
    () => () => {
      abortRef.current.a?.abort();
      abortRef.current.b?.abort();
    },
    [],
  );

  function patch(slot: Slot, next: Partial<Variant>) {
    setVariants((prev) => ({ ...prev, [slot]: { ...prev[slot], ...next } }));
  }

  async function run(slot: Slot) {
    const prompt = variants[slot].prompt.trim();
    if (!prompt) return;

    setError('');
    patch(slot, { output: '', running: true, seconds: null });

    const controller = new AbortController();
    abortRef.current[slot] = controller;
    const startedAt = Date.now();

    try {
      const result = await runPlaygroundPrompt(
        prompt,
        material,
        (chunk) =>
          setVariants((prev) => ({
            ...prev,
            [slot]: { ...prev[slot], output: prev[slot].output + chunk },
          })),
        controller.signal,
      );
      patch(slot, {
        output: result.output,
        running: false,
        seconds: Math.round((Date.now() - startedAt) / 100) / 10,
      });
    } catch (err) {
      if (!controller.signal.aborted) setError(describeError(err));
      patch(slot, { running: false });
    } finally {
      abortRef.current[slot] = null;
    }
  }

  function runBoth() {
    // Deliberately concurrent. Sequential runs would leave the second waiting
    // on the first, and the comparison is the point of the page.
    void run('a');
    void run('b');
  }

  function loadPair(index: number) {
    const pair = PLAYGROUND_PAIRS[index];
    setMaterial(pair.material[locale]);
    setVariants({
      a: { ...EMPTY_VARIANT, prompt: pair.a[locale] },
      b: { ...EMPTY_VARIANT, prompt: pair.b[locale] },
    });
    setError('');
  }

  const anyRunning = variants.a.running || variants.b.running;
  const bothDone = Boolean(variants.a.output && variants.b.output) && !anyRunning;
  const lengthGap = Math.abs(variants.a.output.length - variants.b.output.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t('playground.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{t('playground.subtitle')}</p>
        </div>
        <span className="rounded-full border border-ink-300 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
          {t('playground.notGraded')}
        </span>
      </div>

      {error && <Alert>{error}</Alert>}

      <Panel
        title={t('playground.material')}
        subtitle={t('playground.materialSubtitle')}
        action={
          <button
            onClick={runBoth}
            disabled={anyRunning || (!variants.a.prompt.trim() && !variants.b.prompt.trim())}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {anyRunning && <Spinner className="h-3.5 w-3.5" />}
            {t('playground.runBoth')}
          </button>
        }
      >
        <textarea
          className="textarea min-h-[7rem]"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder={t('playground.materialPlaceholder')}
          aria-label={t('playground.material')}
          spellCheck={false}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <VariantPanel
          slot="a"
          title={t('playground.variantA')}
          variant={variants.a}
          onChange={(prompt) => patch('a', { prompt })}
          onRun={() => void run('a')}
          onStop={() => abortRef.current.a?.abort()}
          extraAction={
            <button
              onClick={() => patch('b', { prompt: variants.a.prompt })}
              disabled={!variants.a.prompt.trim() || anyRunning}
              className="btn-ghost px-2 py-1 text-xs"
            >
              {t('playground.copyToB')}
            </button>
          }
        />
        <VariantPanel
          slot="b"
          title={t('playground.variantB')}
          variant={variants.b}
          onChange={(prompt) => patch('b', { prompt })}
          onRun={() => void run('b')}
          onStop={() => abortRef.current.b?.abort()}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel title={t('playground.compare')}>
          {bothDone ? (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-ink-700">
                {lengthGap < 40
                  ? t('playground.compareSameLength')
                  : t('playground.compareLengths', {
                      a: variants.a.output.length,
                      b: variants.b.output.length,
                    })}
              </p>
              <p className="hint">{t('playground.compareHint')}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">{t('playground.compareEmpty')}</p>
          )}
        </Panel>

        <Panel title={t('playground.starters')} subtitle={t('playground.startersSubtitle')}>
          <ul className="space-y-2.5">
            {PLAYGROUND_PAIRS.map((pair, i) => (
              <li key={pair.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">
                    {t(`playground.pair.${pair.id}.title`)}
                  </p>
                  <p className="text-xs leading-relaxed text-ink-500">
                    {t(`playground.pair.${pair.id}.blurb`)}
                  </p>
                </div>
                <button
                  onClick={() => loadPair(i)}
                  disabled={anyRunning}
                  className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                >
                  {t('playground.load')}
                </button>
              </li>
            ))}
          </ul>
          <p className="hint mt-4 border-t border-ink-200 pt-3">{t('playground.saved')}</p>
        </Panel>
      </div>
    </div>
  );
}

function VariantPanel({
  slot,
  title,
  variant,
  onChange,
  onRun,
  onStop,
  extraAction,
}: {
  slot: Slot;
  title: string;
  variant: Variant;
  onChange: (prompt: string) => void;
  onRun: () => void;
  onStop: () => void;
  extraAction?: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <Panel
      title={title}
      action={
        <div className="flex items-center gap-1">
          {extraAction}
          {variant.running ? (
            <button onClick={onStop} className="btn-secondary px-3 py-1.5 text-xs">
              {t('playground.stop')}
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!variant.prompt.trim()}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {t('playground.run')}
            </button>
          )}
        </div>
      }
    >
      <textarea
        className="textarea min-h-[10rem]"
        value={variant.prompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('playground.promptPlaceholder')}
        aria-label={`${title} — ${slot.toUpperCase()}`}
        spellCheck={false}
        disabled={variant.running}
      />

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
            {t('playground.output')}
          </h3>
          {variant.running ? (
            <span className="text-xs text-ink-500">{t('playground.running')}</span>
          ) : (
            variant.seconds !== null && (
              <span className="text-xs tabular-nums text-ink-400">
                {t('playground.elapsed', {
                  seconds: variant.seconds,
                  chars: variant.output.length,
                })}
              </span>
            )
          )}
        </div>

        {variant.output || variant.running ? (
          <pre className="scroll-slim prose-output max-h-[24rem] overflow-auto rounded-lg bg-ink-50 p-4 text-ink-800">
            {variant.output}
            {variant.running && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-indigo-500 align-text-bottom" />
            )}
          </pre>
        ) : (
          <EmptyState title={t('playground.noOutput')}>{t('playground.noOutputHint')}</EmptyState>
        )}
      </div>
    </Panel>
  );
}

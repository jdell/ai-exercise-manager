import { useId, useState } from 'react';

/**
 * Chart primitives, as inline SVG.
 *
 * No charting library on purpose: these are four simple forms, the bundle
 * already carries React and Firebase, and inline SVG is the only thing that
 * survives the print path intact — a canvas-based library renders blank or
 * pixelated in a PDF export, which is one of this feature's two outputs.
 *
 * Colour follows the form's job rather than taste:
 *
 *   - magnitude comparison → one hue, length carries the value (SERIES)
 *   - polarity (above/below zero) → a warm/cool diverging pair with a neutral
 *     midpoint, never a single hue at two saturations
 *   - "this one matters, the rest are context" → emphasis: accent + grey
 *
 * There are deliberately no categorical palettes here. Nothing in this app
 * plots four independent series against each other, so the colourblind-safety
 * risk that comes with a categorical ramp is avoided by construction rather
 * than mitigated.
 *
 * Every chart pairs with a value the reader can see without decoding colour:
 * direct labels on the marks, or the table view the pages render alongside.
 * `WARM` is below 3:1 against white, so a mark in it always carries its number.
 */

/*
 * Two kinds of colour here, and the difference is load-bearing.
 *
 * The *data* colours are fixed hex. A score of 82 is the same green in light
 * mode, in dark mode, and in the printed PDF, because the reader is meant to
 * learn what those bands mean once. They are mid-saturation and read on either
 * canvas.
 *
 * The *furniture* — gridlines, axis text, the halo behind a label, the ring
 * around a marker — is theme tokens, because its whole job is to sit quietly
 * against whatever surface it is drawn on. `--color-white` is the card the
 * chart is on, which is why it is the right halo in both themes.
 */

/** Single-hue magnitude, and the emphasis accent. */
const SERIES = '#4f46e5';
/** Diverging warm pole. Sub-3:1 on white — always label a mark drawn in it. */
const WARM = '#f59e0b';
/** Diverging cool pole. */
const COOL = '#4f46e5';
const NEUTRAL = 'var(--color-ink-300)';
const GRID = 'var(--color-ink-200)';
const AXIS = 'var(--color-ink-300)';
const MUTED = 'var(--color-ink-500)';
/** The surface a chart is drawn on: haloes and marker rings, not data. */
const SURFACE = 'var(--color-white)';

function scoreColour(score: number): string {
  if (score >= 75) return '#059669';
  if (score >= 60) return WARM;
  return '#f43f5e';
}

// ---------------------------------------------------------------------------
// Trend line
// ---------------------------------------------------------------------------

export interface TrendPoint {
  label: string;
  sublabel?: string;
  value: number;
}

/**
 * Score across the ordered exercises. One series, so no legend — the panel
 * title names it. Hovering a point reveals its exercise and score.
 */
export function TrendLine({
  points,
  height = 180,
  bar = 75,
  barLabel = 'Passing',
}: {
  points: TrendPoint[];
  height?: number;
  /** Reference line, e.g. the passing score. */
  bar?: number;
  barLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  if (points.length === 0) return null;

  const width = 560;
  const pad = { top: 16, right: 20, bottom: 30, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const x = (i: number) =>
    pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (Math.min(100, Math.max(0, v)) / 100) * plotH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = `${path} L ${x(points.length - 1)} ${pad.top + plotH} L ${x(0)} ${pad.top + plotH} Z`;
  const hovered = active !== null ? points[active] : null;

  return (
    <figure className="m-0">
      {/*
        The readout sits above the plot in a fixed-height row rather than
        floating over it: a tooltip anchored inside the chart covers the marks
        it is describing, and one that follows the cursor covers whichever
        neighbour the reader is trying to compare against.
      */}
      <figcaption className="mb-1 flex h-6 items-center text-xs">
        {hovered ? (
          <>
            <span className="font-medium text-ink-800">{hovered.sublabel ?? hovered.label}</span>
            <span className="ml-2 font-semibold tabular-nums text-ink-900">{hovered.value}</span>
          </>
        ) : (
          <span className="text-ink-400">Hover a point for its exercise and score</span>
        )}
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Score across ${points.length} exercises, from ${points[0].value} to ${points[points.length - 1].value}`}
        >
          <defs>
            <linearGradient id={clipId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity="0.16" />
              <stop offset="100%" stopColor={SERIES} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={GRID}
                strokeWidth="1"
              />
              <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="10" fill={MUTED}>
                {tick}
              </text>
            </g>
          ))}

          {/* The bar the work is measured against, distinct from the gridlines. */}
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(bar)}
            y2={y(bar)}
            stroke="#059669"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/*
            Left-anchored and haloed. The right edge is where a rising series
            ends up, so a label there lands on the line; the halo covers the
            remaining case of a first score sitting near the bar itself.
          */}
          <text
            x={pad.left + 3}
            y={y(bar) - 6}
            textAnchor="start"
            fontSize="10"
            fill="#059669"
            stroke={SURFACE}
            strokeWidth="3"
            paintOrder="stroke"
          >
            {barLabel}
          </text>

          <path d={area} fill={`url(#${clipId})`} />
          <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={`${p.label}-${i}`}>
              {/* A 2px surface ring keeps a marker legible where it sits on the line. */}
              <circle cx={x(i)} cy={y(p.value)} r="5" fill={SURFACE} />
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={active === i ? 5 : 4}
                fill={scoreColour(p.value)}
              />
              <text x={x(i)} y={height - 10} textAnchor="middle" fontSize="10" fill={MUTED}>
                {p.label}
              </text>
              {/* Hit target deliberately larger than the mark. */}
              <rect
                x={x(i) - 18}
                y={pad.top}
                width="36"
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Magnitude bars
// ---------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  /** Shown at the end of the row instead of the raw value. */
  display?: string;
  /** Colour by score band rather than the single series hue. */
  tone?: 'series' | 'score';
}

/**
 * Horizontal magnitude comparison. Length carries the value; every row is
 * directly labelled, so nothing depends on reading the colour.
 */
export function BarChart({
  data,
  max = 100,
  labelWidth = 'w-40',
}: {
  data: BarDatum[];
  max?: number;
  labelWidth?: string;
}) {
  if (!data.length) return null;
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = max > 0 ? Math.min(100, Math.max(0, (d.value / max) * 100)) : 0;
        const fill = d.tone === 'score' ? scoreColour(d.value) : SERIES;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className={`${labelWidth} shrink-0 truncate text-sm text-ink-700`}>{d.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: fill }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums text-ink-700">
              {d.display ?? d.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diverging bars
// ---------------------------------------------------------------------------

/**
 * Signed values around a zero baseline — a warm/cool pair with a neutral
 * midpoint, because the reader's job here is polarity, not magnitude. Both
 * arms are labelled with their number: the warm pole is below 3:1 on white and
 * must not be the only thing carrying the sign.
 */
export function DivergingBars({
  data,
  scale,
  positiveLabel,
  negativeLabel,
}: {
  data: { label: string; value: number; note?: string }[];
  /** Half-width of the axis in data units. Defaults to the largest magnitude. */
  scale?: number;
  positiveLabel: string;
  negativeLabel: string;
}) {
  if (!data.length) return null;
  const bound = scale ?? Math.max(1, ...data.map((d) => Math.abs(d.value)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
        <span>← {negativeLabel}</span>
        <span>{positiveLabel} →</span>
      </div>
      <div className="space-y-2.5">
        {data.map((d) => {
          const pct = Math.min(50, (Math.abs(d.value) / bound) * 50);
          const positive = d.value >= 0;
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm text-ink-700">{d.label}</span>
              <div className="relative h-2.5 flex-1 rounded-full bg-ink-100">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-1/2 w-px"
                  style={{ backgroundColor: NEUTRAL }}
                />
                {Math.abs(d.value) > 0.05 && (
                  <div
                    className="absolute inset-y-0 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: positive ? WARM : COOL,
                      width: `${pct}%`,
                      left: positive ? '50%' : `${50 - pct}%`,
                    }}
                  />
                )}
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-ink-700">
                {d.value > 0 ? '+' : ''}
                {d.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dumbbell
// ---------------------------------------------------------------------------

/**
 * Before → after per item. One hue at two weights: the pale dot is where the
 * student started, the solid one where they were approved, and the connector
 * carries the distance. Both ends are labelled.
 */
export function Dumbbell({
  data,
}: {
  data: { label: string; from: number; to: number }[];
}) {
  if (!data.length) return null;
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const from = Math.min(100, Math.max(0, d.from));
        const to = Math.min(100, Math.max(0, d.to));
        const left = Math.min(from, to);
        const width = Math.abs(to - from);
        const gained = to >= from;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm text-ink-700">{d.label}</span>
            <div className="relative h-4 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-100" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: gained ? SERIES : NEUTRAL,
                }}
              />
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${from}%`, backgroundColor: '#a5b4fc' }}
                title={`First attempt: ${d.from}`}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${to}%`, backgroundColor: SERIES }}
                title={`Approved: ${d.to}`}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-600">
              {d.from} → <span className="font-semibold text-ink-800">{d.to}</span>
            </span>
          </div>
        );
      })}
      <p className="hint flex items-center gap-3 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#a5b4fc' }} />
          First attempt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES }} />
          Approved
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/** A trend inside a stat tile. Decorative by design — the tile carries the number. */
export function Sparkline({ values, width = 88, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <path d={path} fill="none" stroke={SERIES} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export { AXIS, MUTED, SERIES };

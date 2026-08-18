import type { Locale } from '../types';

/**
 * Starter pairs for the playground: two prompts that differ in exactly one
 * decision, over the same material.
 *
 * Each pair is an argument, not a demo. A student who runs both sees what the
 * change bought — and sometimes that it bought less than they expected, which
 * is the more useful lesson. They are deliberately short: a pair that takes a
 * paragraph to read is one nobody runs twice.
 *
 * The copy that names them lives in the i18n dictionary under
 * `playground.pair.<id>.*`. The prompts themselves are here, per language,
 * because a Spanish prompt is not a translation of an English one so much as
 * the same instruction written natively.
 *
 * Nothing in this file may import from `lib/i18n` — everything under `src/data`
 * is compiled into the Cloud Function, whose tsconfig has no DOM lib, and the
 * i18n module reaches for `window`.
 */

export type PlaygroundPairId = 'specificity' | 'persona' | 'schema' | 'boundary';

export interface PlaygroundPair {
  id: PlaygroundPairId;
  /** Shared input for both prompts. Empty when the prompts stand alone. */
  material: Record<Locale, string>;
  a: Record<Locale, string>;
  b: Record<Locale, string>;
}

export const PLAYGROUND_PAIRS: PlaygroundPair[] = [
  {
    id: 'specificity',
    material: { en: '', es: '' },
    a: {
      en: 'Write something about recycling.',
      es: 'Escribe algo sobre el reciclaje.',
    },
    b: {
      en: 'Write 3 bullet points explaining why glass recycling saves energy, for a 12-year-old who has never heard of a furnace. Under 25 words per bullet. No introduction, no conclusion.',
      es: 'Escribe 3 viñetas que expliquen por qué reciclar vidrio ahorra energía, para alguien de 12 años que nunca ha oído hablar de un horno industrial. Menos de 25 palabras por viñeta. Sin introducción ni conclusión.',
    },
  },
  {
    id: 'persona',
    material: {
      en: 'I am writing to apply for the assistant role. I am a hard worker and a fast learner and I think I would be a great fit for your team. I have attached my CV for your consideration.',
      es: 'Escribo para postularme al puesto de asistente. Soy trabajador y aprendo rápido, y creo que encajaría muy bien en su equipo. Adjunto mi currículum para su consideración.',
    },
    a: {
      en: 'Give feedback on this cover letter.',
      es: 'Da retroalimentación sobre esta carta de presentación.',
    },
    b: {
      en: 'You are a hiring manager who reads 200 of these a week and stops reading at the second sentence if nothing specific has appeared. Say exactly where you would have stopped reading and why. Do not rewrite it for them.',
      es: 'Eres la persona que contrata y lee 200 de estas por semana; dejas de leer en la segunda frase si no ha aparecido nada concreto. Di exactamente dónde habrías dejado de leer y por qué. No la reescribas por quien la envía.',
    },
  },
  {
    id: 'schema',
    material: {
      en: '1. "Battery lasts two days now, love it." 2. "Screen cracked after one drop, very disappointed." 3. "arrived late but works fine" 4. "Third one that has failed. Never again."',
      es: '1. "La batería ahora dura dos días, me encanta." 2. "La pantalla se rompió con una sola caída, muy decepcionado." 3. "llegó tarde pero funciona bien" 4. "Es el tercero que falla. Nunca más."',
    },
    a: {
      en: 'Summarise these reviews.',
      es: 'Resume estas reseñas.',
    },
    b: {
      en: 'Return a JSON array. Each element: {"id": integer, "sentiment": "positive"|"negative"|"mixed", "topic": "battery"|"build"|"delivery"|"reliability", "quote": string}. Use only the listed topic values. No text outside the JSON.',
      es: 'Devuelve un array JSON. Cada elemento: {"id": entero, "sentimiento": "positivo"|"negativo"|"mixto", "tema": "batería"|"fabricación"|"envío"|"fiabilidad", "cita": texto}. Usa únicamente los valores de tema listados. Nada de texto fuera del JSON.',
    },
  },
  {
    id: 'boundary',
    material: {
      en: 'Meeting notes: Sam to look at the vendor contract. Renewal is coming up. Priya raised the pricing question again. Budget owner unclear. Decision deferred.',
      es: 'Notas de la reunión: Sam revisará el contrato del proveedor. La renovación se acerca. Priya volvió a plantear la cuestión del precio. No está claro quién controla el presupuesto. Decisión aplazada.',
    },
    a: {
      en: 'Turn these notes into a clear summary for the team.',
      es: 'Convierte estas notas en un resumen claro para el equipo.',
    },
    b: {
      en: 'Turn these notes into a summary for the team. Use only what the notes state. Do not infer dates, owners, or amounts that are not written down. End with a list headed "Not stated in the notes" naming each thing a reader might expect to find and would not.',
      es: 'Convierte estas notas en un resumen para el equipo. Usa únicamente lo que dicen las notas. No deduzcas fechas, responsables ni cantidades que no estén escritas. Termina con una lista titulada "No consta en las notas" que nombre cada cosa que quien lea esperaría encontrar y no está.',
    },
  },
];

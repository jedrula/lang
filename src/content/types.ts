export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

/** One thing to learn: a word, phrase or full sentence (English target, Polish meaning). */
export interface Item {
  /** Globally unique, stable id (progress is keyed by it). e.g. "a1-greet-hello" */
  id: string;
  kind: 'word' | 'phrase' | 'sentence';
  /** Canonical English answer. */
  en: string;
  /** Other accepted English answers (contractions, synonyms). */
  enAlt?: string[];
  /** Polish meaning shown as the prompt. */
  pl: string;
  /** Other accepted Polish answers. */
  plAlt?: string[];
  /** Example sentence using the item (strongly recommended for words). The English must contain `en` verbatim (case-insensitive) so we can make a fill-in-the-blank. */
  example?: { en: string; pl: string };
  /** Short tip in English, e.g. a false friend or irregular form. */
  note?: string;
  /** The same tip in Polish, for the trickier points. */
  notePl?: string;
}

export interface Unit {
  /** e.g. "a1-01-greetings" — ordered by this id within a level */
  id: string;
  level: Level;
  title: string;
  titlePl: string;
  /** Short explanation (English, 1-4 sentences, may use simple markdown **bold**). */
  intro?: string;
  /** The same explanation in Polish — always give it for grammar-heavy units. */
  introPl?: string;
  items: Item[];
}

/** Placement test question. */
export interface PlacementQuestion {
  id: string;
  level: Level;
  skill: 'vocab' | 'grammar' | 'reading';
  /** 'choice' = pick one of options; 'type' = free text answer */
  type: 'choice' | 'type';
  /** English instruction/sentence. Use "___" for a gap. */
  prompt: string;
  /** Optional Polish helper text (e.g. sentence to translate). */
  promptPl?: string;
  options?: string[];
  /** Accepted answers (first one is canonical). For 'choice' it must be one of options. */
  answers: string[];
}

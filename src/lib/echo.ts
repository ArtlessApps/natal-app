// Echo (PRD §4.2 / Build Phase 9): resurface a past journal entry when a
// similar transit recurs. Match priority:
//   1. exact — same transit_planet + natal_planet + aspect
//   2. fallback — same transit_planet + aspect (natal may differ)
// Max one Echo per day; never the entry written today.
//
// Free tier (MONETIZATION §4.1): first Echo is full text; later Echoes blur
// until Natal Plus. We remember which entry was the free one so reopening
// Today the same day doesn't suddenly lock it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { DailyDriver } from '@/lib/api';
import type { JournalEntry } from '@/types/journal';

const FREE_ECHO_ENTRY_KEY = 'natal_free_echo_entry_id';

/**
 * Decide whether this Echo is full or a blurred tease.
 * Plus users always get full. Free users get one lifetime free entry id.
 */
export async function resolveEchoAccess(
  entryId: string,
  isPlus: boolean,
): Promise<'full' | 'tease'> {
  if (isPlus) return 'full';
  const stored = await AsyncStorage.getItem(FREE_ECHO_ENTRY_KEY);
  if (!stored) {
    await AsyncStorage.setItem(FREE_ECHO_ENTRY_KEY, entryId);
    return 'full';
  }
  return stored === entryId ? 'full' : 'tease';
}

export type EchoMatch = {
  entry: JournalEntry;
  // true = exact triple match; false = transit_planet + aspect only
  exact: boolean;
};

function matchesExact(entry: JournalEntry, driver: DailyDriver): boolean {
  return (
    entry.transit_planet === driver.transit_planet &&
    entry.natal_planet === driver.natal_planet &&
    entry.aspect === driver.aspect
  );
}

function matchesFallback(entry: JournalEntry, driver: DailyDriver): boolean {
  // Fallback only applies when today's reading has an aspect to match on
  // (WALKING days have null aspect — exact match already covers those).
  if (!driver.aspect) return false;
  return (
    entry.transit_planet === driver.transit_planet &&
    entry.aspect === driver.aspect
  );
}

// Past-tense verbs for the "Last time Mars squared your Sun…" lead-in.
const ASPECT_PAST: Record<string, string> = {
  conjunction: 'conjunct',
  sextile: 'sextiled',
  square: 'squared',
  trine: 'trined',
  opposition: 'opposed',
};

/** Lead-in copy naming the recurring transit, e.g. "Last time Mars squared your Sun". */
export function echoLeadIn(driver: DailyDriver): string {
  const planet = driver.transit_planet;
  if (driver.aspect && driver.natal_planet) {
    const verb = ASPECT_PAST[driver.aspect] ?? driver.aspect;
    return `Last time ${planet} ${verb} your ${driver.natal_planet}`;
  }
  return `Last time ${planet} was in focus`;
}

/** Find the single best past entry matching today's driver, or null. */
export async function findEcho(
  userId: string,
  entryDate: string,
  driver: DailyDriver,
): Promise<EchoMatch | null> {
  // Narrow by transit planet server-side; rank exact vs fallback in JS so
  // null natal/aspect (WALKING) compares cleanly without PostgREST .is() chains.
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('transit_planet', driver.transit_planet)
    .lt('entry_date', entryDate)
    .order('entry_date', { ascending: false })
    .limit(40);

  if (error || !data?.length) return null;

  const entries = data as JournalEntry[];
  const exact = entries.find((e) => matchesExact(e, driver));
  if (exact) return { entry: exact, exact: true };

  const fallback = entries.find((e) => matchesFallback(e, driver));
  if (fallback) return { entry: fallback, exact: false };

  return null;
}

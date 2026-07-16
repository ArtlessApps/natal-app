// Friends data layer (PRD §4.5). Friends are guest charts the owner adds;
// every row is owner-scoped by RLS (see migration 0004_friends.sql).
import { supabase } from '@/lib/supabase';
import type { Chart } from '@/lib/learn';
import type { Friend } from '@/types/friend';

// MONETIZATION.md §3/§4: free users get 1 Connection; Plus = unlimited up to
// the hard ceiling. (Internal table/props still say "friends" for now —
// user-facing copy renames in the Connections pass.)
export const FREE_CONNECTION_LIMIT = 1;
/** @deprecated Use FREE_CONNECTION_LIMIT — kept for older call sites. */
export const FREE_FRIEND_LIMIT = FREE_CONNECTION_LIMIT;
export const MAX_FRIENDS = 20;

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Friend[]) ?? [];
}

export async function getFriend(id: string): Promise<Friend | null> {
  const { data, error } = await supabase.from('friends').select('*').eq('id', id).single();
  if (error) return null;
  return data as Friend;
}

export type NewFriend = {
  name: string;
  chart: Chart;
  birthDate: string;
  birthTime: string | null;
  placeLabel: string;
};

export async function addFriend(f: NewFriend): Promise<Friend> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('friends')
    .insert({
      owner_id: user.id,
      guest_name: f.name,
      guest_chart_json: f.chart,
      birth_date: f.birthDate,
      birth_time: f.birthTime,
      birth_place_label: f.placeLabel,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Friend;
}

// Create a pending invite row. Postgres generates the token (migration 0005);
// .select().single() returns it so the caller can build the link.
export async function createInvite(): Promise<Friend> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('friends')
    .insert({ owner_id: user.id, status: 'pending', source: 'invite' })
    .select()
    .single();
  if (error) throw error;
  return data as Friend;
}

export async function deleteFriend(id: string): Promise<void> {
  const { error } = await supabase.from('friends').delete().eq('id', id);
  if (error) throw error;
}

// The owner's own name + chart, needed as side A of any comparison.
export async function getOwnerCompareData(): Promise<{ name: string; chart: Chart } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('name, chart_json')
    .eq('id', user.id)
    .single();
  if (!data?.chart_json) return null;
  return { name: data.name ?? 'You', chart: data.chart_json as Chart };
}

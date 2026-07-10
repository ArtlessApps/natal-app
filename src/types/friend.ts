import type { Chart } from '@/lib/learn';

export type FriendStatus = 'pending' | 'complete';

// A friend is a guest chart for comparison (PRD §4.5 / §7). Since Step 8.6
// a row can also be a PENDING invite: name/chart are null until the guest
// completes the web flow.
export type Friend = {
  id: string;
  owner_id: string;
  guest_name: string | null;        // null while pending
  guest_chart_json: Chart | null;   // null while pending
  birth_date: string | null;
  birth_time: string | null;
  birth_place_label: string | null;
  token: string;
  status: FriendStatus;
  source: 'manual' | 'invite';
  created_at: string;
};

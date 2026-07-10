import type { Chart } from '@/lib/learn';

// A friend is a guest chart the owner added for comparison (PRD §4.5 / §7).
export type Friend = {
  id: string;
  owner_id: string;
  guest_name: string;
  guest_chart_json: Chart;
  birth_date: string | null;
  birth_time: string | null;
  birth_place_label: string | null;
  created_at: string;
};

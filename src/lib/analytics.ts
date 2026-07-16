// Lightweight analytics sink (MONETIZATION.md §5).
// Swap the body for PostHog/Amplitude later — call sites stay the same.
export type PaywallAnalyticsEvent =
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'trial_started'
  | 'purchase_completed';

export type AnalyticsEvent = PaywallAnalyticsEvent | string;

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (__DEV__) {
    console.log('[analytics]', event, props ?? {});
  }
  // TODO: wire to a real analytics provider before App Store launch.
}

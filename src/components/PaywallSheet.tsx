// Shared Natal Plus paywall (MONETIZATION.md §4–§6).
// Every placement opens THIS component with a `source` for analytics.
// Prices always come from RevenueCat offerings — never hardcoded.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { Body, Button, Caption, Eyebrow, Heading, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import {
  fetchPlusPackages,
  packageHasFreeTrial,
  purchasePlusPackage,
  restorePlusPurchases,
} from '@/lib/subscription';

/** Analytics `source` values — keep these stable; dashboards key off them. */
export type PaywallSource =
  | 'echo_tease'
  | 'onboarding'
  | 'connection_limit'
  | 'learn_level'
  | 'transit_calendar'
  | 'pattern_insights'
  | 'chart_interpretation';

type Props = {
  visible: boolean;
  source: PaywallSource;
  onClose: () => void;
  /** Fires after a successful purchase or restore that grants Plus. */
  onPurchased?: () => void;
};

// Lead with value (MONETIZATION §6). Same list every placement.
const PERKS = [
  'Echo — past journal entries when a transit returns',
  'Unlimited Connections',
  'Full Learn path (Levels 3–5)',
  'Transit calendar + pattern insights',
];

// Optional placement-specific lead-in. Body pitch stays shared.
const SOURCE_LEAD: Record<PaywallSource, { title: string; subtitle: string }> = {
  echo_tease: {
    title: 'Unlock Echo with Natal Plus',
    subtitle: 'You felt the first one. Plus keeps the mirror going every time a transit returns.',
  },
  onboarding: {
    title: 'Try Natal Plus',
    subtitle: 'Echo, unlimited Connections, and the full Learn path — one subscription, no add-ons.',
  },
  connection_limit: {
    title: "You've used your free Connection",
    subtitle: 'Unlock unlimited Connections with Natal Plus.',
  },
  learn_level: {
    title: 'Continue the Learn path',
    subtitle: 'Levels 3–5 unlock houses, aspects, and transits — using your own chart as the example.',
  },
  transit_calendar: {
    title: 'See what’s coming',
    subtitle: 'The transit calendar is part of Natal Plus, alongside Echo and the full Learn path.',
  },
  pattern_insights: {
    title: 'See your patterns',
    subtitle: 'Journal pattern insights unlock with Natal Plus. Your entries stay private.',
  },
  chart_interpretation: {
    title: 'Read beyond the Big 3',
    subtitle: 'Full chart interpretations unlock with Natal Plus — still grounded in your real placements.',
  },
};

type PlanKey = 'annual' | 'monthly';

export default function PaywallSheet({ visible, source, onClose, onPurchased }: Props) {
  const lead = SOURCE_LEAD[source];
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<PlanKey>('annual'); // default = annual w/ trial
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(''); // restore / soft messages

  // Load offerings whenever the sheet opens; fire paywall_shown once per open.
  useEffect(() => {
    if (!visible) return;

    track('paywall_shown', { source });
    let cancelled = false;
    setLoading(true);
    setError('');
    setStatus('');
    setSelected('annual');

    fetchPlusPackages()
      .then(({ annual: a, monthly: m }) => {
        if (cancelled) return;
        setAnnual(a);
        setMonthly(m);
        // If annual isn't in the offering, fall back so the CTA still works.
        if (!a && m) setSelected('monthly');
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Couldn’t load plans.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, source]);

  function dismiss() {
    track('paywall_dismissed', { source });
    onClose();
  }

  const selectedPkg = selected === 'annual' ? annual : monthly;

  async function handlePurchase() {
    if (!selectedPkg || busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    const outcome = await purchasePlusPackage(selectedPkg);
    setBusy(false);

    if (outcome === 'cancelled') return;
    if (outcome === 'error') {
      setError('Purchase didn’t go through. Try again, or restore if you already subscribed.');
      return;
    }

    // Annual ships with a 7-day trial — that's a trial_started, not a charge yet.
    if (packageHasFreeTrial(selectedPkg)) {
      track('trial_started', { source });
    } else {
      track('purchase_completed', { source });
    }
    onPurchased?.();
    onClose();
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    const ok = await restorePlusPurchases();
    setBusy(false);
    if (ok) {
      // Keep `source` as the placement; `restored` marks the path.
      track('purchase_completed', { source, restored: true });
      onPurchased?.();
      onClose();
    } else {
      setStatus('No prior purchase found for this Apple ID.');
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={dismiss}
    >
      <View style={styles.root}>
        {/* Clearly visible dismiss — not delayed, not tiny (MONETIZATION §4.2). */}
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.closeBtn}
        >
          <Text style={styles.closeX}>✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Eyebrow>Natal Plus</Eyebrow>
          <Title style={styles.title}>{lead.title}</Title>
          <Body style={styles.subtitle}>{lead.subtitle}</Body>

          <View style={styles.perkList}>
            {PERKS.map((perk) => (
              <Text key={perk} style={styles.perk}>
                ·  {perk}
              </Text>
            ))}
          </View>

          <Caption style={styles.privacy}>
            Your journal stays private. Never sold, never shared.
          </Caption>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : (
            <>
              <View style={styles.plans}>
                {annual && (
                  <PlanRow
                    label="Annual"
                    priceLabel={`${annual.product.priceString}/yr`}
                    detail={trialDetail(annual, 'yr')}
                    selected={selected === 'annual'}
                    onPress={() => setSelected('annual')}
                  />
                )}
                {monthly && (
                  <PlanRow
                    label="Monthly"
                    priceLabel={`${monthly.product.priceString}/mo`}
                    detail={trialDetail(monthly, 'mo')}
                    selected={selected === 'monthly'}
                    onPress={() => setSelected('monthly')}
                  />
                )}
                {!annual && !monthly && (
                  <Caption style={styles.center}>
                    Plans aren’t available right now. Check your connection and try again.
                  </Caption>
                )}
              </View>

              <Button
                label={ctaLabel(selectedPkg)}
                onPress={handlePurchase}
                disabled={!selectedPkg || busy}
                variant="terracotta"
                style={styles.cta}
              />

              <Pressable onPress={handleRestore} disabled={busy} style={styles.restore}>
                <Text style={styles.restoreText}>Restore Purchases</Text>
              </Pressable>

              {!!error && <Caption style={styles.error}>{error}</Caption>}
              {!!status && <Caption style={styles.center}>{status}</Caption>}

              <Caption style={styles.finePrint}>
                Cancel anytime in your Apple ID subscriptions. No custom cancel screens — by design.
              </Caption>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PlanRow({
  label,
  priceLabel,
  detail,
  selected,
  onPress,
}: {
  label: string;
  priceLabel: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={{ flex: 1 }}>
        <Heading style={styles.planLabel}>{label}</Heading>
        <Caption>{detail}</Caption>
      </View>
      <Text style={styles.planPrice}>{priceLabel}</Text>
    </Pressable>
  );
}

/** Trial line built from StoreKit intro metadata + localized price string. */
function trialDetail(pkg: PurchasesPackage, period: 'yr' | 'mo'): string {
  const intro = pkg.product.introPrice;
  if (intro && intro.price === 0) {
    const unit = intro.periodUnit.toLowerCase();
    const n = intro.periodNumberOfUnits;
    const unitLabel = n === 1 ? unit : `${unit}s`;
    // e.g. "7 days free, then $39.99/yr. Cancel anytime."
    return `${n} ${unitLabel} free, then ${pkg.product.priceString}/${period}. Cancel anytime.`;
  }
  return `${pkg.product.priceString}/${period}. Cancel anytime.`;
}

function ctaLabel(pkg: PurchasesPackage | null): string {
  if (!pkg) return 'Continue';
  if (packageHasFreeTrial(pkg)) return 'Start free trial';
  return 'Subscribe';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    marginRight: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  closeX: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.text,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  perkList: { gap: spacing.sm, marginBottom: spacing.md },
  perk: {
    fontFamily: fonts.body,
    fontSize: type.body,
    color: colors.inkSoft,
    lineHeight: 24,
  },
  privacy: {
    marginBottom: spacing.lg,
    color: colors.goldDeep,
  },
  spinner: { marginTop: spacing.xl },
  plans: { gap: spacing.sm, marginBottom: spacing.lg },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planSelected: { borderColor: colors.terracotta },
  planLabel: { fontSize: type.body + 2 },
  planPrice: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.body,
    color: colors.text,
  },
  cta: { marginBottom: spacing.md },
  restore: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: {
    fontFamily: fonts.bodyMedium,
    fontSize: type.small,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.sm },
  center: { textAlign: 'center', marginTop: spacing.sm },
  finePrint: { textAlign: 'center', marginTop: spacing.lg },
});

// Legacy route shim — older links used `/learn/paywall?reason=…`.
// Everything now opens the shared PaywallSheet (MONETIZATION §4).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import PaywallSheet, { type PaywallSource } from '@/components/PaywallSheet';
import { colors } from '@/constants/theme';

function sourceFromReason(reason?: string): PaywallSource {
  if (reason === 'friends') return 'connection_limit';
  if (reason === 'houses' || reason === 'aspects' || reason === 'transits') {
    return reason === 'houses' ? 'chart_interpretation' : 'learn_level';
  }
  return 'learn_level';
}

export default function PaywallRoute() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PaywallSheet
        visible
        source={sourceFromReason(reason)}
        onClose={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/learn');
        }}
      />
    </View>
  );
}

// One-time soft paywall after Big 3 reveal (MONETIZATION.md §4.2).
// Once dismissed (or purchased), never auto-show again — only contextual gates.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'natal_onboarding_paywall_seen';

export async function hasSeenOnboardingPaywall(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function markOnboardingPaywallSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

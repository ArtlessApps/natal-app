// Natal Plus subscription gate (MONETIZATION.md §5).
// One hook — useIsPlus() — backs every free/paid feature check.
// Entitlement id must match the RevenueCat dashboard: "plus".
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/** RevenueCat entitlement identifier — do not rename without updating the dashboard. */
export const PLUS_ENTITLEMENT = 'plus';

export type PlusPackages = {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
};

function hasPlusEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[PLUS_ENTITLEMENT] !== 'undefined';
}

/** True when the package includes a free intro / trial period. */
export function packageHasFreeTrial(pkg: PurchasesPackage): boolean {
  const intro = pkg.product.introPrice;
  return !!intro && intro.price === 0;
}

/**
 * Call once at app startup (root layout). iOS only — Android is out of MVP;
 * web invite pages never purchase.
 */
export function configurePurchases(): void {
  if (Platform.OS !== 'ios') return;

  const apiKey =
    Constants.expoConfig?.extra?.revenueCatAppleApiKey ??
    process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;

  if (!apiKey || typeof apiKey !== 'string') {
    console.warn('[purchases] Missing EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY');
    return;
  }

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey });
}

/**
 * Tie RevenueCat to the Supabase user so a purchase follows the account
 * across reinstalls. Pass null on sign-out to return to an anonymous RC user.
 */
export async function syncPurchasesUser(userId: string | null): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    if (!(await Purchases.isConfigured())) return;
    if (userId) {
      await Purchases.logIn(userId);
    } else if (!(await Purchases.isAnonymous())) {
      // RevenueCat throws if logOut() is called while already anonymous
      // (the default state on first boot / before sign-in).
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn('[purchases] syncPurchasesUser failed', e);
  }
}

/** Load monthly + annual packages from the current RevenueCat offering. */
export async function fetchPlusPackages(): Promise<PlusPackages> {
  if (Platform.OS !== 'ios') return { annual: null, monthly: null };
  if (!(await Purchases.isConfigured())) return { annual: null, monthly: null };

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return {
    annual: current?.annual ?? null,
    monthly: current?.monthly ?? null,
  };
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'error';

/** Buy a package. Returns a simple outcome so UI can stay dumb. */
export async function purchasePlusPackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPlusEntitlement(customerInfo) ? 'purchased' : 'error';
  } catch (e: unknown) {
    // User tapped Cancel on the Apple sheet — not an error to surface.
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code: string }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return 'cancelled';
    }
    console.warn('[purchases] purchase failed', e);
    return 'error';
  }
}

/** Restore prior App Store purchases. Returns whether Plus is now active. */
export async function restorePlusPurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return hasPlusEntitlement(info);
  } catch (e) {
    console.warn('[purchases] restore failed', e);
    return false;
  }
}

/**
 * True when the current user has the active "plus" entitlement.
 * Defaults to false while loading / on web / if the SDK isn't ready —
 * never unlock paid features by accident.
 */
export function useIsPlus(): boolean {
  const [isPlus, setIsPlus] = useState(false);

  useEffect(() => {
    // Non-iOS: always free-tier gating (no StoreKit / no Android MVP).
    if (Platform.OS !== 'ios') return;

    let mounted = true;

    const apply = (info: CustomerInfo) => {
      if (mounted) setIsPlus(hasPlusEntitlement(info));
    };

    (async () => {
      try {
        if (!(await Purchases.isConfigured())) return;
        apply(await Purchases.getCustomerInfo());
      } catch (e) {
        console.warn('[purchases] getCustomerInfo failed', e);
      }
    })();

    // Fires on purchase, restore, renew, expire, and after logIn merges identity.
    Purchases.addCustomerInfoUpdateListener(apply);
    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(apply);
    };
  }, []);

  return isPlus;
}

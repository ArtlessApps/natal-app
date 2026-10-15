// Lets onboarding tell the root layout "the profile row now exists" before it
// navigates. The layout only re-checks profiles on navigation, so without
// this, skipping straight to the tabs would hit the routing effect with a
// stale hasProfile=false and bounce right back to onboarding.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onProfileCreated(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyProfileCreated(): void {
  listeners.forEach((l) => l());
}

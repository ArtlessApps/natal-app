// Reusable share logic: capture a component ref as a PNG, open the share sheet.
import { useRef, useState } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Story format. captureRef's width/height are LOGICAL points, so divide the
// target PHYSICAL pixels by PixelRatio.get() to land on a consistent
// 1080×1920 file on every device. (The older `pixelRatio` option is
// undocumented and device-dependent — use width/height per the Expo docs.)
const TARGET_W = 1080;
const TARGET_H = 1920;

// captureRef's width/height force a *resize* of the capture to those exact
// pixels — great for the purpose-built 9:16 ShareCard component, but it'll
// stretch/squash anything that isn't already laid out at that aspect ratio
// (e.g. the on-screen Big3CompareCard). Pass `null` to capture a component
// at its own natural size instead of forcing it into the story format.
type CardSize = { width: number; height: number } | null;

export function useShareCard(size: CardSize = { width: TARGET_W, height: TARGET_H }) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (Platform.OS === 'web') {
      console.log('Share cards: test on device — capture is unreliable on web.');
      return;
    }
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const pr = PixelRatio.get();
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        ...(size ? { width: size.width / pr, height: size.height / pr } : null),
      });
      // Some simulators report false here — test the sheet on a real device.
      if (!(await Sharing.isAvailableAsync())) {
        console.log('Sharing not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your card',
      });
      // TODO (analytics): log a "share_completed" event here with the card
      // variant — the data that settles the share vs. compare growth bet.
    } finally {
      setSharing(false);
    }
  }

  return { cardRef, share, sharing };
}

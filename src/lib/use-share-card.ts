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

export function useShareCard() {
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
        width: TARGET_W / pr,
        height: TARGET_H / pr,
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

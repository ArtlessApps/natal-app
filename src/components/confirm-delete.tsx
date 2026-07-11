// Inline delete confirmation card — used wherever a destructive action
// needs a "are you sure?" step (journal entries, friends, etc).
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Body, Button, Card } from '@/components/ui';

export default function ConfirmDelete({
  message, confirmLabel, busy, onConfirm, onCancel,
}: {
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Card style={styles.card}>
      <Body>{message}</Body>
      <View style={styles.row}>
        <Button label={confirmLabel} onPress={onConfirm} disabled={busy} style={styles.danger} />
        <Button variant="ghost" label="Cancel" onPress={onCancel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  danger: { backgroundColor: colors.error },
});

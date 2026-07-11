// "That day's reading" recap shown on a journal entry's detail screen.
import { StyleSheet } from 'react-native';
import { spacing, type } from '@/constants/theme';
import { Card, Caption, Eyebrow, Heading } from '@/components/ui';

export default function ReadingSnapshot({ headline, body }: { headline?: string | null; body?: string | null }) {
  return (
    <Card style={styles.snapshot}>
      <Eyebrow style={styles.label}>That Day&apos;s Reading</Eyebrow>
      {!!headline && <Heading style={styles.headline}>{headline}</Heading>}
      {!!body && <Caption style={styles.body}>{body}</Caption>}
    </Card>
  );
}

const styles = StyleSheet.create({
  snapshot: { marginTop: spacing.xl },
  label: { marginBottom: spacing.sm },
  headline: { fontSize: type.body + 2, marginBottom: spacing.sm },
  body: { lineHeight: 21 },
});

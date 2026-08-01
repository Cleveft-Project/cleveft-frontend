import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

/**
 * Renders the markdown the model writes, as actual formatting.
 *
 * <p>The answers were being drawn with a single {@code <Text>}, so a student
 * read literal `### 2. Layer 2 Bridging` and `**IEEE 802.11**` down the screen.
 * The model was formatting its answers well the whole time; nothing was
 * interpreting it.
 *
 * <p>Written rather than installed, for two reasons that both show up on screen.
 * A general library renders `[1]` as the characters `[1]`, where here it becomes
 * a marker the eye can pick out and match against the citation list underneath.
 * And the fallback line — "Your lectures don't cover this part" — is the one
 * sentence in an answer that changes how much a student should trust what
 * follows, so it is set apart rather than left as another paragraph.
 *
 * <p>Deliberately not a full CommonMark implementation. It covers what this
 * model actually emits — headings, bold, italic, inline code, bullet and
 * numbered lists, code fences, blockquotes and rules — and treats anything else
 * as text, which is the failure mode that still reads fine.
 */

/** The sentence the query service emits when it leaves grounded material. */
const FALLBACK_MARKERS = [
  "Your lectures don't cover this part",
  "I couldn't find this in your uploaded lectures",
];

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; index: string; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'fallback'; text: string }
  | { kind: 'rule' };

/**
 * Splits the source into blocks in one pass.
 *
 * <p>Line-based rather than a parse tree: every construct this model emits is
 * decidable from the start of a line, apart from fenced code, which is why the
 * fence is the only piece of state carried between lines.
 */
function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  let paragraph: string[] = [];
  let fence: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    const text = paragraph.join(' ').trim();
    paragraph = [];
    if (!text) {
      return;
    }
    blocks.push(
      FALLBACK_MARKERS.some((marker) => text.startsWith(marker))
        ? { kind: 'fallback', text }
        : { kind: 'paragraph', text },
    );
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      if (fence === null) {
        flushParagraph();
        fence = [];
      } else {
        blocks.push({ kind: 'code', text: fence.join('\n') });
        fence = null;
      }
      continue;
    }

    if (fence !== null) {
      fence.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: 'bullet', text: bullet[1] });
      continue;
    }

    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      flushParagraph();
      blocks.push({ kind: 'numbered', index: numbered[1], text: numbered[2] });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: 'quote', text: quote[1] });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  if (fence !== null && fence.length > 0) {
    // An unterminated fence still holds real content; dropping it would lose
    // the end of the answer over a missing three characters.
    blocks.push({ kind: 'code', text: fence.join('\n') });
  }

  return blocks;
}

type Span =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'citation'; text: string };

/**
 * Inline formatting, in priority order.
 *
 * <p>Code first, so `**` inside a code span stays literal — otherwise a
 * lecturer's pointer arithmetic turns half an answer bold.
 */
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(\[\d+(?:\]\[\d+)*\])/;

function inline(text: string): Span[] {
  const spans: Span[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = INLINE.exec(rest);
    if (!match || match.index === undefined) {
      spans.push({ kind: 'text', text: rest });
      break;
    }

    if (match.index > 0) {
      spans.push({ kind: 'text', text: rest.slice(0, match.index) });
    }

    const token = match[0];
    if (token.startsWith('`')) {
      spans.push({ kind: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**') || token.startsWith('__')) {
      spans.push({ kind: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('[')) {
      spans.push({ kind: 'citation', text: token });
    } else {
      spans.push({ kind: 'italic', text: token.slice(1, -1) });
    }

    rest = rest.slice(match.index + token.length);
  }

  return spans;
}

function Inline({ text, style }: { text: string; style?: object }) {
  const styles = useThemedStyles(createStyles);
  const spans = useMemo(() => inline(text), [text]);

  return (
    <>
      {spans.map((span, index) => {
        const key = `${span.kind}-${index}`;
        switch (span.kind) {
          case 'bold':
            return (
              <Text key={key} style={[style, styles.bold]}>
                {span.text}
              </Text>
            );
          case 'italic':
            return (
              <Text key={key} style={[style, styles.italic]}>
                {span.text}
              </Text>
            );
          case 'code':
            return (
              <Text key={key} style={[style, styles.inlineCode]}>
                {span.text}
              </Text>
            );
          case 'citation':
            // Tinted and tabular so a run of them reads as references rather
            // than as part of the sentence, and matches the list below.
            return (
              <Text key={key} style={[style, styles.citationMark]}>
                {span.text}
              </Text>
            );
          default:
            return (
              <Text key={key} style={style}>
                {span.text}
              </Text>
            );
        }
      })}
    </>
  );
}

export function Markdown({ source }: { source: string }) {
  const styles = useThemedStyles(createStyles);
  const blocks = useMemo(() => parse(source ?? ''), [source]);

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case 'heading': {
            // Three levels, not six. An answer is a few hundred words, and a
            // sixth-level heading at that length is a distinction without a
            // difference — h4 and beyond render as the smallest.
            const style =
              block.level === 1
                ? styles.h1
                : block.level === 2
                  ? styles.h2
                  : styles.h3;
            return (
              <Text key={key} style={[style, index === 0 && styles.firstBlock]}>
                <Inline text={block.text} style={style} />
              </Text>
            );
          }

          case 'bullet':
            return (
              <View key={key} style={styles.listRow}>
                <Text style={styles.bulletGlyph}>•</Text>
                <Text style={styles.listText}>
                  <Inline text={block.text} style={styles.listText} />
                </Text>
              </View>
            );

          case 'numbered':
            return (
              <View key={key} style={styles.listRow}>
                <Text style={styles.numberGlyph}>{block.index}.</Text>
                <Text style={styles.listText}>
                  <Inline text={block.text} style={styles.listText} />
                </Text>
              </View>
            );

          case 'code':
            return (
              <View key={key} style={styles.codeBlock}>
                <Text style={styles.codeText}>{block.text}</Text>
              </View>
            );

          case 'quote':
            return (
              <View key={key} style={styles.quote}>
                <Text style={styles.quoteText}>
                  <Inline text={block.text} style={styles.quoteText} />
                </Text>
              </View>
            );

          case 'fallback':
            // The one sentence that changes how far an answer can be trusted.
            // Set apart, because a student skimming needs to see where their
            // lecturer stopped and general knowledge began.
            return (
              <View key={key} style={styles.fallback}>
                <Text style={styles.fallbackText}>
                  <Inline text={block.text} style={styles.fallbackText} />
                </Text>
              </View>
            );

          case 'rule':
            return <View key={key} style={styles.rule} />;

          default:
            return (
              <Text
                key={key}
                style={[styles.paragraph, index === 0 && styles.firstBlock]}
              >
                <Inline text={block.text} style={styles.paragraph} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  // Blocks carry their own top margin so spacing between a heading and the
  // paragraph under it differs from spacing between two paragraphs. The first
  // block never gets one, or every answer starts with a gap.
  firstBlock: {
    marginTop: 0,
  },
  h1: {
    ...typography.subheading,
    fontSize: 18,
    color: c.text,
    marginTop: spacing.md,
  },
  h2: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: c.text,
    marginTop: spacing.md,
  },
  h3: {
    ...typography.bodyStrong,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: c.text,
    lineHeight: 23,
  },
  bold: {
    fontWeight: '700',
    color: c.text,
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: c.accent,
  },
  citationMark: {
    color: c.accent,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  bulletGlyph: {
    ...typography.body,
    color: c.accent,
    lineHeight: 23,
  },
  numberGlyph: {
    ...typography.body,
    color: c.accent,
    fontWeight: '700',
    lineHeight: 23,
    minWidth: 18,
  },
  listText: {
    ...typography.body,
    color: c.text,
    lineHeight: 23,
    flex: 1,
  },
  codeBlock: {
    backgroundColor: c.surfaceSunken,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: c.accent,
    paddingLeft: spacing.md,
    paddingVertical: 2,
  },
  quoteText: {
    ...typography.body,
    color: c.textSecondary,
    fontStyle: 'italic',
    lineHeight: 23,
  },
  fallback: {
    backgroundColor: c.surfaceSunken,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: c.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  fallbackText: {
    ...typography.caption,
    color: c.textSecondary,
    lineHeight: 19,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderMuted,
    marginVertical: spacing.sm,
  },
});

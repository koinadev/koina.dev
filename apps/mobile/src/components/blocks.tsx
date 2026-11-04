import { describeSlot, type RhythmItem } from '@koina/web/calendar';
import type { Block, EmbedBlock } from '@koina/web/content/types';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { content, photos } from '@/lib/content';
import { locale, t } from '@/lib/i18n';
import { openTarget } from '@/lib/open';
import { colors, font, radius } from '@/lib/theme';
import { Button } from './button';
import { Card } from './card';
import { Icon, type IconName } from './icon';
import { SeasonCard } from './season-card';
import { Text } from './text';

/** Sitedeki InfoPage.astro'nun blok şemasını yerel bileşenlerle çizer. */
export function Blocks({ blocks }: { blocks: (Block | EmbedBlock)[] }) {
  return (
    <View style={{ gap: 32 }}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </View>
  );
}

function Heading({ title, intro }: { title?: string; intro?: string }) {
  if (!title && !intro) return null;
  return (
    <View style={{ gap: 6 }}>
      {title && <Text variant="heading" style={{ fontSize: 22, lineHeight: 27 }}>{title}</Text>}
      {intro && <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{intro}</Text>}
    </View>
  );
}

function Paragraphs({ body }: { body: string[] }) {
  return (
    <View style={{ gap: 12 }}>
      {body.map((p, i) => (
        <Text key={i}>{p}</Text>
      ))}
    </View>
  );
}

function BlockView({ block }: { block: Block | EmbedBlock }) {
  switch (block.type) {
    case 'season':
      return <SeasonCard now={new Date()} />;
    case 'stages':
      // shortcut: mobil Aşama 6'da açılır; o zamana kadar yol haritası gösterilmez, açılınca bu bloğu yaz.
      return null;
    case 'rhythm':
      return <RhythmList />;
    case 'formats':
      return <Formats />;
    case 'prose':
      return (
        <View style={{ gap: 12 }}>
          <Heading title={block.title} />
          <Paragraphs body={block.body} />
          {block.aside && <Text variant="hand" style={{ color: colors.primaryText }}>{block.aside}</Text>}
        </View>
      );
    case 'split':
      return (
        <View style={{ gap: 14 }}>
          <Image source={photos[block.photo]} accessibilityLabel={block.photoAlt} style={styles.photo} contentFit="cover" />
          <Heading title={block.title} />
          <Paragraphs body={block.body} />
        </View>
      );
    case 'cards':
      return (
        <View style={{ gap: 12 }}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((item) => (
            <Card key={item.title} style={{ gap: 8 }} onPress={item.link ? () => openTarget(item.link!) : undefined}>
              <View style={styles.iconTile}>
                <Icon name={item.icon} color={colors.primaryText} />
              </View>
              <Text variant="heading">{item.title}</Text>
              <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{item.text}</Text>
              {item.link && <Text style={styles.link}>{item.link.label}</Text>}
            </Card>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={{ gap: 12 }}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((item, i) => (
            <View key={item.title} style={styles.step}>
              <View style={styles.stepNo}>
                <Text style={{ fontFamily: font.bold, color: colors.fg }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="heading" style={{ fontSize: 17 }}>{item.title}</Text>
                <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case 'list':
      return (
        <View style={{ gap: 10 }}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((item) => (
            <View key={item} style={styles.listRow}>
              <Icon
                name={block.tone === 'dont' ? 'Cancel01Icon' : 'CheckmarkCircle02Icon'}
                size={20}
                color={block.tone === 'dont' ? colors.live : colors.primaryText}
              />
              <Text style={{ flex: 1 }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 29, letterSpacing: -0.4 }}>{block.text}</Text>
          {block.by && <Text variant="label">{block.by}</Text>}
        </View>
      );
    case 'faq':
      return (
        <View style={{ gap: 10 }}>
          <Heading title={block.title} />
          {block.items.map((item) => (
            <Faq key={item.question} {...item} />
          ))}
        </View>
      );
    case 'tiny':
      return (
        <View style={{ gap: 10 }}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((item) => (
            <Card key={item.title} style={styles.tiny} onPress={item.link ? () => openTarget(item.link!) : undefined}>
              <Icon name={item.icon} color={colors.primaryText} />
              <Text style={{ flex: 1, fontFamily: font.medium }}>{item.title}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </Card>
          ))}
        </View>
      );
    case 'tiers':
      return (
        <View style={{ gap: 12 }}>
          <Heading title={block.title} intro={block.intro} />
          {block.items.map((tier) => (
            <Card key={tier.name} style={[{ gap: 8 }, tier.featured && { borderColor: colors.primary, borderWidth: 2 }]}>
              <Text variant="heading">{tier.name}</Text>
              <Text variant="small">{tier.who}</Text>
              {tier.perks.map((perk) => (
                <View key={perk} style={styles.listRow}>
                  <Icon name="CheckmarkCircle02Icon" size={18} color={colors.primaryText} />
                  <Text style={{ flex: 1, fontSize: 15 }}>{perk}</Text>
                </View>
              ))}
            </Card>
          ))}
        </View>
      );
    case 'sponsors':
      return (
        <View style={{ gap: 12 }}>
          <Heading title={block.title} intro={block.intro} />
          <Card style={{ gap: 12, borderStyle: 'dashed', borderWidth: 2, alignItems: 'flex-start' }}>
            <Text variant="small" style={{ fontSize: 15 }}>{block.empty}</Text>
            <Button small label={block.emptyAction.label} onPress={() => openTarget(block.emptyAction)} />
          </Card>
        </View>
      );
    case 'rows':
      return (
        <View style={{ gap: 10 }}>
          <Heading title={block.title} intro={block.intro} />
          <Card style={{ paddingVertical: 4 }}>
            {block.items.map((row, i) => (
              <View key={row.label} style={[styles.row, i > 0 && styles.rowLine]}>
                <Text style={{ fontFamily: font.semibold }}>{row.label}</Text>
                <Text>{row.value}</Text>
                {row.note && <Text variant="small">{row.note}</Text>}
              </View>
            ))}
          </Card>
        </View>
      );
  }
}

const lang = locale === 'tr' ? 'tr-TR' : 'en-US';
const { rhythm, events } = content;
const rhythmItems = rhythm.items as RhythmItem[];
const slot = (item: RhythmItem) => describeSlot(item, lang, { weekly: events.weekly, monthly: rhythm.monthly });

/** Sitedeki haftalık takvimin özeti; ayrıntısı ve geri sayımı Takvim sekmesinde. */
function RhythmList() {
  return (
    <View style={{ gap: 10 }}>
      <Heading title={rhythm.title} intro={rhythm.description} />
      <Card style={{ paddingVertical: 4 }}>
        {rhythmItems.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowLine]}>
            <Text variant="small" style={{ fontSize: 13, lineHeight: 18 }}>{slot(item)}</Text>
            <Text style={{ fontFamily: font.semibold }}>{item.title}</Text>
            <Text variant="small">{item.where}</Text>
          </View>
        ))}
      </Card>
      <Button small variant="outline" icon="Calendar03Icon" label={t.events.openCalendar} onPress={() => router.push('/events')} />
    </View>
  );
}

/** Yayın formatları; süre çubuğu en uzun formata oranlı (sitedeki EventFormats.astro gibi). */
function Formats() {
  const longest = Math.max(...events.formats.map((f) => f.minutes));
  return (
    <View style={{ gap: 10 }}>
      <Heading title={events.formatsTitle} intro={events.formatsLead} />
      {events.formats.map((f, i) => {
        const item = 'rhythm' in f ? rhythmItems.find((r) => r.id === f.rhythm) : undefined;
        const when = item ? slot(item) : 'when' in f ? f.when : '';
        const peak = i === events.formats.length - 1;
        return (
          <Card key={f.name} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={[styles.iconTile, peak && { backgroundColor: colors.primary }]}>
                <Icon name={f.icon as IconName} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, lineHeight: 22 }}>{f.name}</Text>
                <Text variant="small" style={{ fontSize: 13, lineHeight: 18 }}>{when}</Text>
              </View>
            </View>
            <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{f.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.round((f.minutes / longest) * 100)}%` }, peak && { backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 18 }}>
                {events.minutes.replace('{n}', String(f.minutes))}
              </Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ paddingVertical: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((v) => !v);
        }}
        style={styles.faqHead}>
        <Text style={{ flex: 1, fontFamily: font.semibold }}>{question}</Text>
        <Icon name={open ? 'MinusSignIcon' : 'PlusSignIcon'} size={20} />
      </Pressable>
      {open && <Text variant="small" style={{ marginTop: 10, fontSize: 15, lineHeight: 22 }}>{answer}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { flex: 1, maxWidth: 160, height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.fg },
  link: { fontFamily: font.semibold, color: colors.primaryText, marginTop: 4 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  quote: { borderLeftWidth: 4, borderLeftColor: colors.accent, paddingLeft: 16, gap: 8 },
  tiny: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  time: { fontFamily: font.hand, fontSize: 20, color: colors.primaryText },
  row: { paddingVertical: 12, gap: 2 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

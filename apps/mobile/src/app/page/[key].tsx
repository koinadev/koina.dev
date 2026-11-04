import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { Blocks } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { content, photos, type InfoPageKey } from '@/lib/content';
import { openTarget } from '@/lib/open';
import { colors, radius } from '@/lib/theme';

/** Sitedeki bilgi sayfasının (InfoPage) uygulama karşılığı; içerik aynı kaynaktan. */
export default function InfoPage() {
  const { key } = useLocalSearchParams<{ key: InfoPageKey }>();
  const page = content.pages[key];
  if (!page) return null;
  const { hero, cta } = page;

  return (
    <Screen inset={false}>
      <Stack.Screen options={{ title: page.meta.title }} />
      {hero.note && <Text variant="hand" style={{ color: colors.primaryText }}>{hero.note}</Text>}
      <Text variant="title">{hero.title}</Text>
      <Text variant="small" style={{ fontSize: 16, lineHeight: 24 }}>{hero.lead}</Text>
      {hero.photo && (
        <Image
          source={photos[hero.photo]}
          accessibilityLabel={hero.photoAlt}
          contentFit="cover"
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, marginVertical: 8 }}
        />
      )}
      <View style={{ marginTop: 8 }}>
        <Blocks blocks={page.blocks} />
      </View>
      {cta && (
        <Card style={{ gap: 10, marginTop: 24, backgroundColor: colors.tint, borderColor: colors.tint }}>
          <Text variant="heading" style={{ fontSize: 21 }}>{cta.title}</Text>
          <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{cta.text}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <Button small label={cta.primary.label} onPress={() => openTarget(cta.primary)} />
            {cta.secondary && <Button small variant="outline" label={cta.secondary.label} onPress={() => openTarget(cta.secondary!)} />}
          </View>
        </Card>
      )}
    </Screen>
  );
}

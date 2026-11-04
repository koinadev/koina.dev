import { linkCategories, type LinkCategory, type LinkDraft } from '@koina/shared/api';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Chip, ErrorNote } from '@/components/misc';
import { Text } from '@/components/text';
import { ApiError } from '@/lib/api';
import { errorText, t } from '@/lib/i18n';
import { useCreateLink, useLinkPreview } from '@/lib/queries';
import { colors, font, radius } from '@/lib/theme';

const toLink = (id: string) => router.replace({ pathname: '/link/[id]', params: { id } });

/**
 * Bağlantı ekleme: adres yapıştırılır, sunucu sayfadan başlık ve açıklamayı okur, üye düzeltip kategori ve etiket seçer.
 * Aynı adres daha önce eklenmişse var olan bağlantıya gidilir.
 */
export default function NewLink() {
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LinkCategory | null>(null);
  const [tags, setTags] = useState('');
  const preview = useLinkPreview();
  const create = useCreateLink();

  const existing = (id: string) =>
    Alert.alert(t.links.exists, undefined, [{ text: t.links.existsOpen, onPress: () => toLink(id) }], { cancelable: false });

  const fetchPreview = () => {
    const address = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    preview.mutate(address, {
      onSuccess: (d) => {
        if (d.existing) return existing(d.existing);
        setDraft(d);
        setTitle(d.title);
        setDescription(d.description);
      },
    });
  };

  const tagList = tags
    .split(',')
    .map((s) => s.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 3);
  const ok = !!draft && title.trim().length >= 3 && !!category;

  const submit = () =>
    draft &&
    category &&
    create.mutate(
      { url: draft.url, title: title.trim(), description: description.trim(), category, tags: tagList },
      {
        onSuccess: (link) => toLink(link.id),
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'CONFLICT' && typeof err.extra.id === 'string') existing(err.extra.id);
        },
      },
    );

  const createError = create.error instanceof ApiError && create.error.code === 'CONFLICT' ? null : create.error;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: t.links.add,
          headerRight: draft ? () => <Button small label={t.links.submit} loading={create.isPending} disabled={!ok} onPress={submit} /> : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text variant="small" style={{ fontSize: 15, lineHeight: 22 }}>{t.links.hint}</Text>
        <Field
          label={t.links.url}
          value={url}
          onChangeText={(v) => {
            setUrl(v);
            if (draft) setDraft(null);
          }}
          placeholder={t.links.urlPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={fetchPreview}
          autoFocus
        />
        {!draft && <Button label={t.links.preview} icon="Search01Icon" loading={preview.isPending} disabled={url.trim().length < 4} onPress={fetchPreview} />}
        {preview.isError && <ErrorNote text={errorText(preview.error)} />}

        {draft && (
          <>
            <View style={styles.preview}>
              {draft.image && <Image source={{ uri: draft.image }} style={styles.image} contentFit="cover" />}
              <Text style={styles.host} numberOfLines={1}>{draft.siteName || draft.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</Text>
            </View>
            <Field label={t.links.titleLabel} value={title} onChangeText={setTitle} maxLength={120} />
            <Field label={t.links.description} value={description} onChangeText={setDescription} maxLength={400} multiline />
            <View style={{ gap: 8 }}>
              <Text variant="label">{t.links.category}</Text>
              <View style={styles.chips}>
                {linkCategories.map((c) => (
                  <Chip key={c} label={t.links.categories[c]} active={category === c} onPress={() => setCategory(c)} />
                ))}
              </View>
            </View>
            <Field label={t.links.tags} value={tags} onChangeText={setTags} autoCapitalize="none" autoCorrect={false} />
            {createError && <ErrorNote text={errorText(createError)} />}
            <Button label={t.links.submit} loading={create.isPending} disabled={!ok} onPress={submit} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  preview: { gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  image: { width: '100%', aspectRatio: 1.91, borderRadius: radius.sm, backgroundColor: colors.tint },
  host: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

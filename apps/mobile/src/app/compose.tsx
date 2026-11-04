import { ALT_MAX, MEDIA_BYTES, MEDIA_MAX, POST_MAX } from '@koina/shared/api';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Avatar, Chip, ErrorNote } from '@/components/misc';
import { QuoteEmbed } from '@/components/post-item';
import { Text } from '@/components/text';
import { errorText, t } from '@/lib/i18n';
import { uploadMedia, useCreatePost, useProjects, useThread, type LocalImage } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, font, radius } from '@/lib/theme';

/** Kalan karakter halkası: sınıra 40 karakter kala sayı görünür, aşınca kırmızıya döner. */
function Ring({ used }: { used: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(used / POST_MAX, 1);
  const left = POST_MAX - used;
  const color = left < 0 ? colors.live : left <= 40 ? '#E5A100' : colors.primaryText;
  return (
    <View style={styles.ring}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={r} stroke={colors.line} strokeWidth={2.5} fill="none" />
        <Circle
          cx={13}
          cy={13}
          r={r}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray={`${c * ratio} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 13 13)"
        />
      </Svg>
      {left <= 40 && <Text style={[styles.left, { color }]}>{left}</Text>}
    </View>
  );
}

const MAX_SIDE = 2048;

/**
 * Seçilen görseli yüklemeye hazırlar: en uzun kenar 2048 piksele indirilir ve piksel verisi yönüyle birlikte yeniden yazılır.
 * Sunucu EXIF'i (yön bilgisi dahil) sildiği için yön piksellere işlenmezse fotoğraf ters görünür. GIF canlı kalsın diye
 * olduğu gibi gönderilir.
 */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<LocalImage> {
  const base = { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType, fileName: asset.fileName, alt: '' };
  if (asset.mimeType === 'image/gif') return base;
  try {
    const png = asset.mimeType === 'image/png';
    const ref = await ImageManipulator.manipulate(asset.uri, { maxWidth: MAX_SIDE, maxHeight: MAX_SIDE }).renderAsync();
    const out = await ref.saveAsync({ compress: 0.82, format: png ? SaveFormat.PNG : SaveFormat.JPEG });
    return { ...base, uri: out.uri, width: out.width, height: out.height, mimeType: png ? 'image/png' : 'image/jpeg', fileName: null };
  } catch {
    return base;
  }
}

/** Seçilen görsel: küçük önizleme, kaldırma düğmesi ve altında alt metin alanı. */
function Attachment({ image, onRemove, onAlt }: { image: LocalImage; onRemove: () => void; onAlt: (alt: string) => void }) {
  return (
    <View style={styles.attachment}>
      <View>
        <Image source={{ uri: image.uri }} style={styles.thumb} contentFit="cover" />
        <Pressable onPress={onRemove} style={styles.remove} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.compose.removeImage}>
          <Icon name="Cancel01Icon" size={16} color="#fff" strokeWidth={2} />
        </Pressable>
      </View>
      <TextInput
        value={image.alt}
        onChangeText={onAlt}
        placeholder={t.compose.altPlaceholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={t.compose.alt}
        maxLength={ALT_MAX}
        multiline
        style={styles.alt}
      />
    </View>
  );
}

export default function Compose() {
  const params = useLocalSearchParams<{ project?: string; parent?: string; quote?: string }>();
  const { user } = useSession();
  const [body, setBody] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [project, setProject] = useState<string | undefined>(params.project);
  const create = useCreatePost();
  const isReply = !!params.parent;
  const isQuote = !!params.quote;
  const parent = useThread(params.parent);
  const quoted = useThread(params.quote);
  // Yanıtta proje seçilmez: yanıt, üst gönderinin projesinde kalır.
  const mine = useProjects({ member: user?.handle }, !isReply && !!user);
  const projects = isReply ? [] : (mine.data?.pages.flatMap((p) => p.items) ?? []);
  const busy = uploading || create.isPending;
  const ok = (body.trim().length > 0 || images.length > 0) && body.length <= POST_MAX && !busy;

  const pick = async () => {
    if (images.length >= MEDIA_MAX) return Alert.alert(t.compose.maxImages);
    // Sistem seçicisi (PHPicker) fotoğraf izni istemez; üye yalnız seçtiği görselleri paylaşır.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MEDIA_MAX - images.length,
      quality: 0.8,
      exif: false,
      // HEIC gibi sunucunun kabul etmediği biçimler JPEG'e çevrilir.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled) return;
    // Küçültme yalnız GIF dışındakilere yapılır; büyük GIF baştan elenir.
    const tooBig = res.assets.some((a) => a.mimeType === 'image/gif' && (a.fileSize ?? 0) > MEDIA_BYTES);
    if (tooBig) Alert.alert(t.compose.tooBig);
    const picked = await Promise.all(
      res.assets.filter((a) => !(a.mimeType === 'image/gif' && (a.fileSize ?? 0) > MEDIA_BYTES)).map(prepare),
    );
    setImages((prev) => [...prev, ...picked].slice(0, MEDIA_MAX));
  };

  // Görseller önce tek tek yüklenir, gönderi onların kimlikleriyle açılır. Yükleme yarıda kalırsa gönderi açılmaz.
  const send = async () => {
    setUploadError(null);
    let media: string[] = [];
    if (images.length > 0) {
      setUploading(true);
      try {
        media = (await Promise.all(images.map(uploadMedia))).map((m) => m.id);
      } catch (err) {
        setUploadError(err);
        return;
      } finally {
        setUploading(false);
      }
    }
    create.mutate(
      {
        body: body.trim(),
        media,
        ...(isReply ? { parentId: params.parent } : project ? { projectSlug: project } : {}),
        ...(isQuote ? { quoteId: params.quote } : {}),
      },
      { onSuccess: () => router.back() },
    );
  };

  const title = isReply ? t.compose.reply : isQuote ? t.compose.quote : t.compose.title;
  const error = uploadError ?? (create.isError ? create.error : null);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => <Button small label={isReply ? t.compose.reply : t.compose.send} loading={busy} disabled={!ok} onPress={send} />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {isReply && parent.data && (
          <View style={styles.parent}>
            <Avatar name={parent.data.post.author.name} seed={parent.data.post.author.handle} size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 19 }}>{parent.data.post.author.name}</Text>
              <Text variant="small" numberOfLines={3}>{parent.data.post.body}</Text>
              <Text style={styles.replying}>{t.feed.replyingTo(parent.data.post.author.handle)}</Text>
            </View>
          </View>
        )}
        <View style={styles.editor}>
          {user && <Avatar name={user.name} seed={user.handle} size={40} />}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={isReply ? t.feed.replyPlaceholder : isQuote ? t.compose.quotePlaceholder : t.compose.placeholder}
            placeholderTextColor={colors.muted}
            multiline
            autoFocus
            accessibilityLabel={t.compose.placeholder}
            style={styles.input}
          />
        </View>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            {images.map((img, i) => (
              <Attachment
                key={img.uri}
                image={img}
                onRemove={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                onAlt={(alt) => setImages((prev) => prev.map((p, j) => (j === i ? { ...p, alt } : p)))}
              />
            ))}
          </ScrollView>
        )}
        {isQuote && quoted.data && <QuoteEmbed quote={quoted.data.post} disabled />}
        {projects.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text variant="label">{t.compose.project}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              <Chip label={t.compose.noProject} active={!project} onPress={() => setProject(undefined)} />
              {projects.map((p) => (
                <Chip key={p.slug} icon="SourceCodeIcon" label={p.name} active={project === p.slug} onPress={() => setProject(p.slug)} />
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.tools}>
          <Pressable
            onPress={pick}
            disabled={images.length >= MEDIA_MAX || busy}
            accessibilityRole="button"
            accessibilityLabel={t.compose.addImage}
            hitSlop={8}
            style={({ pressed }) => [styles.tool, (pressed || images.length >= MEDIA_MAX) && { opacity: 0.5 }]}>
            <Icon name="ImageAdd02Icon" size={22} color={colors.primaryText} />
            <Text style={styles.toolText}>{images.length > 0 ? `${images.length}/${MEDIA_MAX}` : t.compose.addImage}</Text>
          </Pressable>
          <Ring used={body.length} />
        </View>
        {!!error && <ErrorNote text={errorText(error)} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  parent: { flexDirection: 'row', gap: 10, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D9D7E0' },
  replying: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: colors.primaryText, marginTop: 4 },
  editor: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  input: { flex: 1, minHeight: 120, fontFamily: font.regular, fontSize: 18, lineHeight: 26, color: colors.fg, paddingTop: 8, textAlignVertical: 'top' },
  attachment: { width: 150, gap: 6 },
  thumb: { width: 150, height: 150, borderRadius: radius.sm, backgroundColor: colors.tint },
  remove: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  alt: {
    minHeight: 40,
    maxHeight: 80,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 17,
    color: colors.fg,
    backgroundColor: colors.surface,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9D7E0',
  },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.tint },
  toolText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: colors.primaryText },
  ring: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  left: { fontFamily: font.medium, fontSize: 13, lineHeight: 17 },
});

import { roles, type Role } from '@koina/shared/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Chip, ErrorNote } from '@/components/misc';
import { Text } from '@/components/text';
import { errorText, t } from '@/lib/i18n';
import { useUpdateProfile } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function EditProfile() {
  const { user, setUser } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [mine, setMine] = useState<Role[]>(user?.roles ?? []);
  const [interests, setInterests] = useState((user?.interests ?? []).join(', '));
  const [github, setGithub] = useState(user?.github ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const update = useUpdateProfile();
  if (!user) return null;
  const toggle = (r: Role) => setMine((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]));

  const save = () =>
    update.mutate(
      {
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        bio: bio.trim(),
        roles: mine,
        interests: interests.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10),
        github: github.trim().replace(/^@/, '') || null,
        // Şema `https://` ister; "site.dev" yazana önek eklenir.
        website: website.trim() ? (/^https?:\/\//.test(website.trim()) ? website.trim().replace(/^http:/, 'https:') : `https://${website.trim()}`) : null,
        location: location.trim() || null,
      },
      {
        onSuccess: (member) => {
          setUser(member);
          router.back();
        },
      },
    );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Field label={t.edit.name} value={name} onChangeText={setName} maxLength={80} />
      <Field label={t.edit.handle} value={handle} onChangeText={setHandle} autoCapitalize="none" maxLength={30} />
      <Field label={t.edit.bio} value={bio} onChangeText={setBio} multiline maxLength={280} />
      <Text variant="label">{t.edit.roles}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {roles.map((r) => (
          <Chip key={r} label={t.roles[r]} active={mine.includes(r)} onPress={() => toggle(r)} />
        ))}
      </View>
      <Field label={t.edit.interests} value={interests} onChangeText={setInterests} autoCapitalize="none" />
      <Field label={t.edit.location} value={location} onChangeText={setLocation} maxLength={60} />
      <Field label={t.edit.website} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" maxLength={200} />
      <Field label={t.edit.github} value={github} onChangeText={setGithub} autoCapitalize="none" />
      <Button label={t.edit.save} loading={update.isPending} disabled={!name.trim()} onPress={save} />
      {update.isError && <ErrorNote text={errorText(update.error)} />}
    </ScrollView>
  );
}

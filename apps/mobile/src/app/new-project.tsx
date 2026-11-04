import { roles, type Role } from '@koina/shared/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Chip, ErrorNote } from '@/components/misc';
import { Text } from '@/components/text';
import { errorText, t } from '@/lib/i18n';
import { useCreateProject } from '@/lib/queries';
import { colors } from '@/lib/theme';

export default function NewProject() {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [repo, setRepo] = useState('');
  const [lookingFor, setLookingFor] = useState<Role[]>([]);
  const create = useCreateProject();
  const toggle = (r: Role) => setLookingFor((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Field label={t.newProject.name} value={name} onChangeText={setName} maxLength={60} autoFocus />
      <Field label={t.newProject.summary} value={summary} onChangeText={setSummary} maxLength={280} multiline />
      <Field
        label={t.newProject.repo}
        value={repo}
        onChangeText={setRepo}
        placeholder="https://github.com/koinadev/…"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Text variant="label">{t.newProject.lookingFor}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {roles.map((r) => (
          <Chip key={r} label={t.roles[r]} active={lookingFor.includes(r)} onPress={() => toggle(r)} />
        ))}
      </View>
      <Button
        label={t.newProject.create}
        icon="Rocket01Icon"
        loading={create.isPending}
        disabled={name.trim().length < 2 || summary.trim().length < 10}
        onPress={() =>
          create.mutate(
            { name: name.trim(), summary: summary.trim(), repoUrl: repo.trim() || null, lookingFor },
            {
              onSuccess: (p) => {
                router.back();
                router.push({ pathname: '/project/[slug]', params: { slug: p.slug } });
              },
            },
          )
        }
      />
      {create.isError && <ErrorNote text={errorText(create.error)} />}
    </ScrollView>
  );
}

import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ErrorNote, Loading } from '@/components/misc';
import { ProfileView } from '@/components/profile-view';
import { errorText, t } from '@/lib/i18n';
import { useMember } from '@/lib/queries';
import { useSession } from '@/lib/session';

export default function MemberScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { user } = useSession();
  const member = useMember(handle);
  if (member.isPending) return <Loading />;
  return (
    <>
      <Stack.Screen options={{ title: `@${handle}` }} />
      {member.isError ? (
        <View style={{ padding: 16 }}>
          <ErrorNote text={errorText(member.error)} retryLabel={t.common.retry} onRetry={() => member.refetch()} />
        </View>
      ) : (
        <ProfileView member={member.data} mine={user?.handle === handle} />
      )}
    </>
  );
}

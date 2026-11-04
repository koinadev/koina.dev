import { AUTH_PATHS } from '@koina/shared/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { inputStyle } from '@/components/field';
import { Wordmark } from '@/components/wordmark';
import { ErrorNote } from '@/components/misc';
import { Text } from '@/components/text';
import { api, apiWithHeaders } from '@/lib/api';
import { errorText, t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { colors, font } from '@/lib/theme';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const address = email.trim().toLowerCase();
      await api('POST', AUTH_PATHS.sendCode, { email: address, type: 'sign-in' });
      setCode('');
      setStep('code');
      // Yalnız geliştirmede: e-posta servisi yokken son gönderilen kod API'den okunur ve ekranda gösterilir.
      setDevCode(null);
      if (__DEV__) {
        const dev = await api<{ code: string }>('GET', `${AUTH_PATHS.devCode}?email=${encodeURIComponent(address)}`).catch(() => null);
        setDevCode(dev?.code ?? null);
      }
    });

  const verify = () =>
    run(async () => {
      const { data, headers } = await apiWithHeaders<{ token?: string }>('POST', AUTH_PATHS.verify, {
        email: email.trim().toLowerCase(),
        otp: code,
      });
      // Bearer eklentisi kalıcı belirteci `set-auth-token` başlığında verir; gövdedeki `token` yalnız yedek.
      const token = headers.get('set-auth-token') ?? data.token;
      if (!token) throw new Error('token');
      await signIn(token);
      router.back();
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Wordmark size={30} />
        {step === 'email' ? (
          <>
            <Text variant="small" style={{ fontSize: 16, lineHeight: 24 }}>{t.login.lead}</Text>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder={t.login.email}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={send}
              autoFocus
            />
            <Button label={t.login.send} loading={busy} disabled={!email.includes('@')} onPress={send} />
          </>
        ) : (
          <>
            <Text variant="small" style={{ fontSize: 16 }}>{t.login.sentTo(email.trim())}</Text>
            {devCode && <Text variant="hand" style={{ color: colors.primaryText }}>{t.login.devCode(devCode)}</Text>}
            <TextInput
              style={[inputStyle, code ? styles.code : styles.codeEmpty]}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder={t.login.code}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button label={t.login.verify} loading={busy} disabled={code.length !== 6} onPress={verify} />
            <View style={{ alignItems: 'center' }}>
              <Button variant="ghost" small label={t.login.change} onPress={() => setStep('email')} />
            </View>
          </>
        )}
        {error && <ErrorNote text={error} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  // Harf aralığı yalnız rakamlara: yer tutucu metne uygulanınca harfler dağılıyordu.
  code: { fontFamily: font.bold, fontSize: 26, letterSpacing: 8, textAlign: 'center' },
  codeEmpty: { textAlign: 'center' },
});

import type { ReportReason } from '@koina/shared/api';
import { reportReasons } from '@koina/shared/api';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { errorText, t } from './i18n';

export interface SheetOption {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

/** Eylem menüsü: iOS'ta sistemin alttan açılan sayfası, Android'de düğmeli uyarı. "Vazgeç" kendiliğinden eklenir. */
export function showSheet(options: SheetOption[], title?: string) {
  if (Platform.OS === 'ios') {
    const labels = [...options.map((o) => o.label), t.feed.cancel];
    const destructive = options.flatMap((o, i) => (o.destructive ? [i] : []));
    ActionSheetIOS.showActionSheetWithOptions(
      { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive, title },
      (i) => options[i]?.onPress(),
    );
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...options.map((o) => ({ text: o.label, style: o.destructive ? ('destructive' as const) : ('default' as const), onPress: o.onPress })),
    { text: t.feed.cancel, style: 'cancel' as const },
  ]);
}

/** Şikâyet: önce gerekçe seçilir, sonra gönderilir; sonuç kısa bir uyarıyla bildirilir. */
export function pickReportReason(send: (reason: ReportReason) => Promise<unknown>) {
  showSheet(
    reportReasons.map((reason) => ({
      label: t.report.reasons[reason],
      onPress: () =>
        send(reason).then(
          () => Alert.alert(t.report.done),
          (err) => Alert.alert(errorText(err)),
        ),
    })),
    t.report.title,
  );
}

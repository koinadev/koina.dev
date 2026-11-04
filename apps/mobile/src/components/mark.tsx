import { MARK_COLORS, MARK_SHAPES } from '@koina/shared/brand';
import Svg, { Circle, Rect } from 'react-native-svg';

/** Koina işareti; geometri ve renkler sitedekiyle aynı kaynaktan. */
export function Mark({ size = 32 }: { size?: number }) {
  const { stem, joint, top, bottom } = MARK_SHAPES;
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessibilityLabel="Koina">
      <Rect {...stem} fill={MARK_COLORS.stem} />
      <Circle {...joint} fill={MARK_COLORS.joint} />
      <Circle {...top} fill={MARK_COLORS.top} />
      <Circle {...bottom} fill={MARK_COLORS.bottom} />
    </Svg>
  );
}

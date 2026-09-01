import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

/**
 * A single settings row used inside grouped SettingsSection cards.
 *
 * type:
 *  - 'chevron'  → navigates / opens something on tap. Shows a forward chevron.
 *  - 'toggle'   → boolean preference. Shows a Switch, calls onToggle(nextValue).
 *  - 'value'    → read-only info row (e.g. App Version). Shows rightText, no chevron.
 *  - 'disabled' → not implemented yet. Dimmed, shows a small "Soon" pill, not pressable.
 */
export default function SettingsRow({
  icon,
  title,
  description,
  type = 'chevron',
  value,
  rightText,
  onPress,
  onToggle,
  isLast,
}) {
  const disabled = type === 'disabled';
  const content = (
    <View style={[styles.row, !isLast && styles.rowBorder, disabled && styles.rowDisabled]}>
      <View style={styles.left}>
        <View style={[styles.iconWrap, disabled && styles.iconWrapDisabled]}>
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? theme.colors.textDim : theme.colors.primaryLight}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, disabled && styles.titleDisabled]}>{title}</Text>
          {!!description && (
            <Text style={styles.description} numberOfLines={1}>{description}</Text>
          )}
        </View>
      </View>

      {type === 'toggle' && (
        <Switch
          value={!!value}
          onValueChange={onToggle}
          trackColor={{ false: theme.colors.surface, true: theme.colors.primaryDim }}
          thumbColor={value ? theme.colors.primary : theme.colors.textDim}
          ios_backgroundColor={theme.colors.surface}
        />
      )}

      {type === 'value' && !!rightText && (
        <Text style={styles.rightText}>{rightText}</Text>
      )}

      {type === 'chevron' && (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
      )}

      {disabled && (
        <View style={styles.soonPill}>
          <Text style={styles.soonPillText}>Soon</Text>
        </View>
      )}
    </View>
  );

  if (type === 'toggle' || disabled) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  rowDisabled: { opacity: 0.5 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm, paddingRight: theme.spacing.sm },
  iconWrap: {
    width: 32, height: 32, borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapDisabled: { backgroundColor: theme.colors.surface },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  titleDisabled: { color: theme.colors.textSecondary },
  description: { fontSize: 11.5, color: theme.colors.textDim, marginTop: 2 },
  rightText: { fontSize: 12.5, color: theme.colors.textDim, fontWeight: '500' },
  soonPill: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  soonPillText: { fontSize: 10, color: theme.colors.textDim, fontWeight: '600' },
});
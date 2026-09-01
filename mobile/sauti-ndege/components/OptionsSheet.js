import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

/**
 * Simple cross-platform option picker (works on native + react-native-web,
 * unlike multi-button Alert.alert which react-native-web doesn't render properly).
 */
export default function OptionsSheet({ visible, title, options, selectedValue, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {options.map((opt, index) => {
            const isSelected = opt.value === selectedValue;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.option,
                  index < options.length - 1 && styles.optionBorder,
                ]}
                onPress={() => { onSelect(opt.value); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  sheetTitle: {
    fontSize: 13,
    color: theme.colors.textDim,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  optionLabel: { fontSize: 15, color: theme.colors.text },
  optionLabelSelected: { color: theme.colors.primary, fontWeight: '600' },
  cancel: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
});
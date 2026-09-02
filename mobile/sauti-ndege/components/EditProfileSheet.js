import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet
} from 'react-native';
import { theme } from '../constants/theme';

/**
 * Generic single-field text sheet — local-only, no account system yet.
 * Same visual family as OptionsSheet. Used for both "Edit Profile"
 * (birding name) and "Birder Bio", each with their own copy/limits.
 */
export default function EditProfileSheet({
  visible,
  title = 'Edit Profile',
  label = 'Birding name',
  placeholder = 'e.g. Benedict',
  hint = "Stored on this device only.",
  maxLength = 30,
  multiline = false,
  currentValue,
  onSave,
  onClose,
}) {
  const [draft, setDraft] = useState(currentValue || '');

  // Reset the draft to the saved value each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(currentValue || '');
  }, [visible, currentValue]);

  const handleSave = () => {
    onSave(draft.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textDim}
            maxLength={maxLength}
            multiline={multiline}
            autoFocus
            style={[styles.input, multiline && styles.inputMultiline]}
          />
          <Text style={styles.hint}>{hint}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.lg,
  },
  sheetTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { fontSize: 11.5, color: theme.colors.textDim, marginTop: 8, marginBottom: theme.spacing.lg, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  button: { flex: 1, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: 'center' },
  cancelButton: { backgroundColor: theme.colors.surface },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  saveButton: { backgroundColor: theme.colors.primary },
  saveText: { fontSize: 14, fontWeight: '600', color: theme.colors.background },
});
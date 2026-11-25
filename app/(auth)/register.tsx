import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { CONTENT_MAX_WIDTH, colors, radius, spacing, theme } from '../../src/styles/theme';
import type { UserRole } from '../../src/types/models';
import { normalizeMainClass } from '../../src/utils/classUtils';

const CLASS_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useApp();

  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nim, setNim] = useState('');
  const [className, setClassName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email wajib diisi.');
      return;
    }
    if (role === 'student' && !nim.trim()) {
      setErrorMsg('NIM wajib diisi untuk akun praktikan.');
      return;
    }
    if (role === 'student' && !className.trim()) {
      setErrorMsg('Pilih kelas praktikum Anda (A, B, C, D, E, atau F).');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        nim: nim.trim(),
        className: role === 'student' ? normalizeMainClass(className) || className.trim().toUpperCase() : '',
      });
      if (!res.ok) {
        setErrorMsg(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + spacing.sm, spacing.lg),
            paddingBottom: Math.max(insets.bottom + 140, spacing.xxl * 3),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="flask" size={24} color={colors.primaryText} />
            </View>
            <Text style={styles.brandTitle}>Daftar Akun LabSync</Text>
            <Text style={styles.brandSubtitle}>
              Pilih peran Anda dan lengkapi data profil untuk memulai
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMsg ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={17} color={colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Role Selector */}
            <Text style={styles.label}>Peran Pengguna</Text>
            <View style={styles.roleRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: role === 'student' }}
                disabled={submitting}
                onPress={() => setRole('student')}
                style={[
                  styles.roleChip,
                  role === 'student' && styles.roleChipActiveStudent,
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={16}
                  color={role === 'student' ? colors.primaryText : colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    role === 'student' && styles.roleChipTextActive,
                  ]}
                >
                  Praktikan
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: role === 'assistant' }}
                disabled={submitting}
                onPress={() => setRole('assistant')}
                style={[
                  styles.roleChip,
                  role === 'assistant' && styles.roleChipActiveAssistant,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={role === 'assistant' ? colors.text : colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    role === 'assistant' && styles.roleChipTextActive,
                  ]}
                >
                  Asisten Lab
                </Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Institusi</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="nama@students.undip.ac.id"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                NIM {role === 'assistant' ? '(Opsional untuk Asisten)' : ''}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="card-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="2406012414001"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={nim}
                  onChangeText={setNim}
                  editable={!submitting}
                />
              </View>
            </View>

            {role === 'student' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Pilih Kelas Utama</Text>
                <View style={styles.classGrid}>
                  {CLASS_OPTIONS.map((cls) => {
                    const isSelected = className === cls;
                    return (
                      <Pressable
                        key={cls}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        disabled={submitting}
                        onPress={() => {
                          setClassName(cls);
                          setErrorMsg(null);
                        }}
                        style={[
                          styles.classChip,
                          isSelected && styles.classChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.classChipText,
                            isSelected && styles.classChipTextSelected,
                          ]}
                        >
                          {cls}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.classHint}>
                  Pilih kelas akademik Anda: A, B, C, D, E, atau F.
                </Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kata Sandi</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                  onSubmitEditing={handleRegister}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                submitting && styles.primaryBtnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.primaryBtnText}>Daftar & Masuk</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Sudah memiliki akun? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>Masuk di sini</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: Math.min(CONTENT_MAX_WIDTH, 440),
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...theme.shadows.card,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...theme.shadows.card,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 17,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    gap: 6,
  },
  roleChipActiveStudent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipActiveAssistant: {
    backgroundColor: '#EDF5EE',
    borderColor: '#C6DEC8',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  roleChipTextActive: {
    fontWeight: '800',
    color: colors.text,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  classChip: {
    flex: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  classChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  classChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  classChipTextSelected: {
    fontWeight: '800',
    color: colors.primaryText,
  },
  classHint: {
    marginTop: 6,
    fontSize: 11,
    color: colors.textMuted,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryText,
  },
  footerRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
});

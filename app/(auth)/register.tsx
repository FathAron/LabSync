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
      setErrorMsg('NIM wajib diisi untuk praktikan.');
      return;
    }
    if (role === 'student' && !className.trim()) {
      setErrorMsg('Kelas wajib diisi untuk praktikan (contoh: IF-26-A).');
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
        className: role === 'student' ? className.trim().toUpperCase() : '',
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
          { paddingTop: Math.max(insets.top, spacing.lg), paddingBottom: spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="flask" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>Daftar Akun LabSync</Text>
            <Text style={styles.brandSubtitle}>
              Pilih peran Anda dan lengkapi data untuk mulai menggunakan aplikasi
            </Text>
          </View>

          <View style={styles.card}>
            {errorMsg ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={colors.dangerDark} />
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
                style={[styles.roleChip, role === 'student' && styles.roleChipActiveStudent]}
              >
                <Ionicons
                  name="school"
                  size={16}
                  color={role === 'student' ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    role === 'student' && styles.roleChipTextStudent,
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
                style={[styles.roleChip, role === 'assistant' && styles.roleChipActiveAssistant]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={role === 'assistant' ? colors.assistantTagDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    role === 'assistant' && styles.roleChipTextAssistant,
                  ]}
                >
                  Asisten
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
              <Text style={styles.label}>Email</Text>
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
                <Text style={styles.label}>Kelas Praktikum</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="people-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: IF-26-A"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    value={className}
                    onChangeText={setClassName}
                    editable={!submitting}
                  />
                </View>
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Daftar & Masuk</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: Math.min(CONTENT_MAX_WIDTH, 460),
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  brandSubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...theme.shadows.card,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerDark,
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
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleChipActiveStudent: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  roleChipActiveAssistant: {
    backgroundColor: colors.assistantTagBg,
    borderColor: colors.assistantTag,
  },
  roleChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  roleChipTextStudent: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  roleChipTextAssistant: {
    fontWeight: '700',
    color: colors.assistantTagDark,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
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
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
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
    color: '#FFFFFF',
  },
  footerRow: {
    marginTop: spacing.lg,
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
    color: colors.primary,
  },
});


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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setErrorMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Email wajib diisi.');
      return;
    }
    if (!password) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(trimmedEmail, password);
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
          { paddingTop: Math.max(insets.top, spacing.xl), paddingBottom: spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="flask" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>LabSync</Text>
            <Text style={styles.brandSubtitle}>
              Masuk untuk mengakses jadwal, presensi, dan perizinan praktikum
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>

            {errorMsg ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={colors.dangerDark} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

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
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kata Sandi</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                submitting && styles.primaryBtnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Masuk</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.footerLink}>Daftar Sekarang</Text>
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
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontSize: 26,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
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


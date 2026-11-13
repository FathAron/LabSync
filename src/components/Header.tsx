import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CONTENT_MAX_WIDTH, colors, radius, spacing } from '../styles/theme';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export const Header = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, currentRole, syncError, setSyncError, logout } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!currentUser || !currentRole) {
    return null;
  }

  const isAssistant = currentRole === 'assistant';
  const avatarText = currentUser.avatar || getInitials(currentUser.name);

  const subtitle = isAssistant
    ? currentUser.assistantRole || 'Asisten Laboratorium'
    : `NIM ${currentUser.nim || '-'} • Kelas ${currentUser.className || '-'}`;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={[styles.outerContainer, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.innerContainer}>
        {/* Baris Atas: Brand Identitas & Tombol Logout */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="flask" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.brandTextWrap}>
              <View style={styles.titleRow}>
                <Text style={styles.brandTitle}>LabSync</Text>
                <View
                  style={[
                    styles.roleBadge,
                    isAssistant ? styles.roleBadgeAssistant : styles.roleBadgeStudent,
                  ]}
                >
                  <Ionicons
                    name={isAssistant ? 'shield-checkmark' : 'school'}
                    size={12}
                    color={isAssistant ? colors.assistantTagDark : colors.primaryDark}
                  />
                  <Text
                    style={[
                      styles.roleBadgeText,
                      isAssistant ? styles.roleBadgeTextAssistant : styles.roleBadgeTextStudent,
                    ]}
                  >
                    {isAssistant ? 'Asisten' : 'Praktikan'}
                  </Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>Sistem Presensi & Perizinan Praktikum</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            disabled={loggingOut}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.logoutBtnPressed,
              loggingOut && styles.logoutBtnDisabled,
            ]}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={colors.dangerDark} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={15} color={colors.dangerDark} />
                <Text style={styles.logoutBtnText}>Keluar</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Bar Identitas Pengguna Login */}
        <View style={styles.profileBar}>
          <View style={styles.profileLeft}>
            <View
              style={[
                styles.avatarCircle,
                isAssistant ? styles.avatarAssistant : styles.avatarStudent,
              ]}
            >
              <Text style={styles.avatarText}>{avatarText}</Text>
            </View>
            <View style={styles.profileTextWrap}>
              <Text style={styles.profileName} numberOfLines={1}>
                {currentUser.name}
              </Text>
              <Text style={styles.profileSub} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              syncError ? styles.statusPillError : styles.statusPillOnline,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                syncError ? styles.statusDotError : styles.statusDotOnline,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                syncError ? styles.statusTextError : styles.statusTextOnline,
              ]}
            >
              {syncError ? 'Gangguan' : 'Terhubung'}
            </Text>
          </View>
        </View>

        {/* Global Sync Error Banner (SRS-04) */}
        {syncError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={16} color={colors.dangerDark} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {syncError}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup pesan gangguan"
              onPress={() => setSyncError(null)}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.dangerDark} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  innerContainer: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrap: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginRight: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  roleBadgeAssistant: {
    backgroundColor: colors.assistantTagBg,
  },
  roleBadgeStudent: {
    backgroundColor: colors.primarySoft,
  },
  roleBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadgeTextAssistant: {
    color: colors.assistantTagDark,
  },
  roleBadgeTextStudent: {
    color: colors.primaryDark,
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
    minWidth: 78,
    justifyContent: 'center',
  },
  logoutBtnPressed: {
    opacity: 0.75,
  },
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutBtnText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAssistant: {
    backgroundColor: colors.assistantTag,
  },
  avatarStudent: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  profileTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  profileSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillOnline: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  statusPillError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    marginRight: 5,
  },
  statusDotOnline: {
    backgroundColor: colors.success,
  },
  statusDotError: {
    backgroundColor: colors.danger,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOnline: {
    color: colors.successDark,
  },
  statusTextError: {
    color: colors.dangerDark,
  },
  errorBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    marginHorizontal: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerDark,
  },
});

export default Header;

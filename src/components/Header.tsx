import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { usePracticum } from '../hooks/usePracticum';
import { CONTENT_MAX_WIDTH, colors, radius, spacing, theme } from '../styles/theme';
import { formatDisplayClass } from '../utils/classUtils';
import { NotificationModal } from './NotificationModal';
import { ProfileModal } from './ProfileModal';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export const Header = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, currentRole, syncError, setSyncError } = useApp();
  const { sessions } = usePracticum();

  const [notificationVisible, setNotificationVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  if (!currentUser || !currentRole) {
    return null;
  }

  const isAssistant = currentRole === 'assistant';
  const initials = currentUser.avatar || getInitials(currentUser.name);

  // Cari sesi aktif untuk penghitungan notifikasi
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const activeCount = activeSessions.length;

  const firstName = currentUser.name.split(' ')[0] || currentUser.name;
  const subtitle = isAssistant
    ? currentUser.assistantRole || 'Asisten Laboratorium'
    : `NIM ${currentUser.nim || '-'} • ${formatDisplayClass(currentUser.className) || '-'}`;

  return (
    <>
      <View
        style={[
          styles.outerContainer,
          { paddingTop: Math.max(insets.top, spacing.xs) },
        ]}
      >
        <View style={styles.innerContainer}>
          {/* Main Top Header Row */}
          <View style={styles.topRow}>
            {/* Brand Logo & App Name */}
            <View style={styles.brandGroup}>
              <View style={styles.logoBadge}>
                <Ionicons name="flask" size={17} color="#FFFFFF" />
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandTitle}>LabSync</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      isAssistant
                        ? styles.roleBadgeAssistant
                        : styles.roleBadgeStudent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        isAssistant
                          ? styles.roleBadgeTextAssistant
                          : styles.roleBadgeTextStudent,
                      ]}
                    >
                      {isAssistant ? 'Asisten' : 'Praktikan'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.brandSubtitle}>
                  Sistem Presensi & Perizinan Lab
                </Text>
              </View>
            </View>

            {/* Action Buttons: Notification Bell & Profile Avatar */}
            <View style={styles.actionsGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka notifikasi"
                onPress={() => setNotificationVisible(true)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="notifications-outline"
                  size={19}
                  color={colors.mochaDark}
                />
                {activeCount > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {activeCount > 9 ? '9+' : activeCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka profil pengguna"
                onPress={() => setProfileVisible(true)}
                style={({ pressed }) => [
                  styles.avatarBtn,
                  isAssistant ? styles.avatarAssistant : styles.avatarStudent,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </Pressable>
            </View>
          </View>

          {/* User Banner Row: Warm Sand Surface */}
          <View style={styles.userBanner}>
            <View style={styles.userInfoLeft}>
              <Text style={styles.greetingText} numberOfLines={1}>
                Hai, <Text style={styles.boldText}>{firstName}</Text>
              </Text>
              <Text style={styles.metaSubText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>

            <View style={styles.userBannerRight}>
              {activeCount > 0 && !isAssistant ? (
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>
                    {activeCount} Sesi Aktif
                  </Text>
                </View>
              ) : (
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
                      syncError
                        ? styles.statusTextError
                        : styles.statusTextOnline,
                    ]}
                  >
                    {syncError ? 'Gangguan' : 'Online'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Global Sync Error Warning Banner */}
          {syncError ? (
            <View style={styles.errorBanner} accessibilityLiveRegion="polite">
              <Ionicons
                name={
                  syncError.toLowerCase().includes('koneksi') ||
                  syncError.toLowerCase().includes('internet') ||
                  syncError.toLowerCase().includes('jaringan')
                    ? 'cloud-offline-outline'
                    : syncError.toLowerCase().includes('akses') ||
                      syncError.toLowerCase().includes('ditolak') ||
                      syncError.toLowerCase().includes('izin')
                    ? 'shield-outline'
                    : syncError.toLowerCase().includes('sesi') ||
                      syncError.toLowerCase().includes('login')
                    ? 'person-circle-outline'
                    : 'alert-circle-outline'
                }
                size={16}
                color={colors.dangerDark}
              />
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

      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Modals */}
      <NotificationModal
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
        activeSessions={activeSessions}
      />

      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  innerContainer: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  roleBadgeAssistant: {
    backgroundColor: colors.assistantTagBg,
  },
  roleBadgeStudent: {
    backgroundColor: colors.studentTagBg,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleBadgeTextAssistant: {
    color: colors.assistantTagDark,
  },
  roleBadgeTextStudent: {
    color: colors.studentTagDark,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...theme.shadows.card,
  },
  avatarAssistant: {
    backgroundColor: colors.assistantTag,
  },
  avatarStudent: {
    backgroundColor: colors.mocha,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  userInfoLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greetingText: {
    fontSize: 14,
    color: colors.mochaDark,
  },
  boldText: {
    fontWeight: '800',
  },
  metaSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successDark,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillOnline: {
    backgroundColor: colors.sageSoft,
  },
  statusPillError: {
    backgroundColor: colors.dangerSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
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
  pressed: {
    opacity: 0.75,
  },
});

export default Header;

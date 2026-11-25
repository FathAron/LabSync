import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, theme } from '../styles/theme';
import { normalizeMainClass } from '../utils/classUtils';
import {
  checkNotificationPermission,
  openDeviceSettings,
} from '../services/permissionService';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const { currentUser, currentRole, logout } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      void checkNotificationPermission().then((res) => {
        setNotifGranted(res.granted);
      });
    }
  }, [visible]);

  if (!currentUser) return null;

  const isAssistant = currentRole === 'assistant';
  const initials = currentUser.avatar || getInitials(currentUser.name);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Profil Pengguna</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup profil"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.mochaDark} />
            </Pressable>
          </View>

          {/* Avatar & Main Identity */}
          <View style={styles.identityHero}>
            <View
              style={[
                styles.avatarCircle,
                isAssistant ? styles.avatarAssistant : styles.avatarStudent,
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Text style={styles.userEmail}>{currentUser.email}</Text>

            <View
              style={[
                styles.roleBadge,
                isAssistant ? styles.roleAssistant : styles.roleStudent,
              ]}
            >
              <Ionicons
                name={isAssistant ? 'shield-checkmark' : 'school'}
                size={13}
                color={isAssistant ? colors.assistantTagDark : colors.studentTagDark}
              />
              <Text
                style={[
                  styles.roleText,
                  isAssistant ? styles.roleTextAssistant : styles.roleTextStudent,
                ]}
              >
                {isAssistant
                  ? currentUser.assistantRole || 'Asisten Laboratorium'
                  : 'Praktikan'}
              </Text>
            </View>
          </View>

          {/* Data Details List */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>NIM / Identitas</Text>
              <Text style={styles.detailValue}>{currentUser.nim || '-'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kelas</Text>
              <Text style={styles.detailValue}>
                {isAssistant
                  ? 'Semua Kelas'
                  : currentUser.className
                  ? normalizeMainClass(currentUser.className)
                  : '-'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tahun Ajaran</Text>
              <Text style={styles.detailValue}>Semester Gasal 2026/2027</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notifikasi</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Atur notifikasi perangkat"
                onPress={() => void openDeviceSettings()}
                style={styles.notifStatusBtn}
              >
                <Ionicons
                  name={notifGranted ? 'checkmark-circle' : 'notifications-off-outline'}
                  size={14}
                  color={notifGranted ? colors.sageDark : colors.primary}
                />
                <Text
                  style={[
                    styles.notifStatusText,
                    notifGranted && styles.notifStatusTextActive,
                  ]}
                >
                  {notifGranted ? 'Aktif' : 'Atur di Pengaturan'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Logout Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            disabled={loggingOut}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.pressed,
              loggingOut && styles.disabled,
            ]}
          >
            {loggingOut ? (
              <ActivityIndicator color={colors.dangerDark} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={17} color={colors.dangerDark} />
                <Text style={styles.logoutText}>Keluar dari Akun</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityHero: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...theme.shadows.card,
  },
  avatarAssistant: {
    backgroundColor: colors.assistantTag,
  },
  avatarStudent: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.mochaDark,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  roleAssistant: {
    backgroundColor: colors.assistantTagBg,
  },
  roleStudent: {
    backgroundColor: colors.studentTagBg,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleTextAssistant: {
    color: colors.assistantTagDark,
  },
  roleTextStudent: {
    color: colors.studentTagDark,
  },
  detailsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  notifStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  notifStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  notifStatusTextActive: {
    color: colors.sageDark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    minHeight: 46,
    marginTop: spacing.lg,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dangerDark,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default ProfileModal;

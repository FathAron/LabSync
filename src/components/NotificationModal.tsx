import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../styles/theme';
import type { Session } from '../types/models';

export interface AppNotificationItem {
  id: string;
  type: 'SESSION_OPENED' | 'SCHEDULE_CHANGED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';
  title: string;
  subtitle: string;
  time: string;
  url?: string;
  sessionId?: string;
  read?: boolean;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  activeSessions?: Session[];
  notificationList?: AppNotificationItem[];
}

const STORAGE_KEY_CLEARED = 'labsync:notifications:cleared_v1';
const STORAGE_KEY_READ = 'labsync:notifications:read_v1';

// ==========================================
// SWIPEABLE NOTIFICATION ITEM (GESER KE KANAN)
// ==========================================

interface SwipeableItemProps {
  item: AppNotificationItem;
  isRead: boolean;
  onPress: (item: AppNotificationItem) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onBlockedDelete: (item: AppNotificationItem) => void;
}

const SwipeableNotificationItem: React.FC<SwipeableItemProps> = ({
  item,
  isRead,
  onPress,
  onMarkRead,
  onDelete,
  onBlockedDelete,
}) => {
  const [pan] = useState(() => new Animated.Value(0));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Hanya aktifkan saat digeser ke kanan secara horizontal
          return gestureState.dx > 12 && Math.abs(gestureState.dy) < 16;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx > 0) {
            // Batasi perpindahan agar tidak melompat terlalu jauh
            pan.setValue(Math.min(gestureState.dx, 260));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 110) {
            // Melewati batas gesture geser kanan
            if (!isRead) {
              // CONSTRAINT: Belum dibaca, tolak penghapusan dan pantulkan kembali
              Animated.spring(pan, {
                toValue: 0,
                bounciness: 12,
                useNativeDriver: true,
              }).start();
              onBlockedDelete(item);
            } else {
              // SUDAH DIBACA: Geser keluar ke kanan lalu hapus
              Animated.timing(pan, {
                toValue: 450,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                onDelete(item.id);
              });
            }
          } else {
            // Kurang dari threshold, kembalikan posisi ke awal
            Animated.spring(pan, {
              toValue: 0,
              bounciness: 8,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [pan, isRead, item, onBlockedDelete, onDelete]
  );

  const bgOpacity = useMemo(
    () =>
      pan.interpolate({
        inputRange: [0, 40, 120],
        outputRange: [0, 0.7, 1],
        extrapolate: 'clamp',
      }),
    [pan]
  );

  return (
    <View style={styles.swipeContainer}>
      {/* Background yang tersingkap saat digeser ke kanan */}
      <Animated.View
        style={[
          styles.swipeBackground,
          {
            opacity: bgOpacity,
            backgroundColor: isRead ? colors.dangerSoft : colors.warningSoft,
            borderColor: isRead ? '#F8CCD4' : '#FFE082',
          },
        ]}
      >
        <View style={styles.swipeBackdropContent}>
          <Ionicons
            name={isRead ? 'trash-outline' : 'lock-closed-outline'}
            size={18}
            color={isRead ? colors.danger : colors.warningDark}
          />
          <Text
            style={[
              styles.swipeBackdropText,
              { color: isRead ? colors.danger : colors.warningDark },
            ]}
          >
            {isRead ? 'Lepas untuk Menghapus' : 'Baca dulu untuk menghapus'}
          </Text>
        </View>
      </Animated.View>

      {/* Kartu Notifikasi Utama yang Bergerak */}
      <Animated.View
        style={[
          styles.itemWrapper,
          {
            transform: [{ translateX: pan }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => onPress(item)}
          style={({ pressed }) => [
            styles.itemCard,
            !isRead && styles.itemCardUnread,
            pressed && styles.pressed,
          ]}
        >
          {/* Status Dot */}
          <View
            style={[
              styles.itemDot,
              {
                backgroundColor:
                  item.type === 'SESSION_OPENED'
                    ? colors.primary
                    : item.type === 'LEAVE_APPROVED'
                    ? colors.success
                    : item.type === 'LEAVE_REJECTED'
                    ? colors.danger
                    : colors.warning,
              },
            ]}
          />

          <View style={styles.itemTextWrap}>
            <View style={styles.itemHeaderRow}>
              <Text
                style={[
                  styles.itemTitle,
                  !isRead && styles.itemTitleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isRead ? (
                <View style={styles.readBadge}>
                  <Ionicons name="checkmark-done" size={11} color={colors.textMuted} />
                  <Text style={styles.readBadgeText}>Dibaca</Text>
                </View>
              ) : (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>Baru</Text>
                </View>
              )}
            </View>

            <Text style={styles.itemSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>

            <View style={styles.itemFooterRow}>
              <View style={styles.itemTimeContainer}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>

              {/* Action buttons (Tandai Dibaca / Hapus 1 per 1) */}
              <View style={styles.itemActionGroup}>
                {!isRead ? (
                  <Pressable
                    hitSlop={6}
                    onPress={() => onMarkRead(item.id)}
                    style={styles.markReadSmallBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Tandai sudah dibaca"
                  >
                    <Ionicons name="checkmark-circle-outline" size={12} color={colors.primaryDark} />
                    <Text style={styles.markReadSmallText}>Tandai Dibaca</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    if (!isRead) {
                      onBlockedDelete(item);
                    } else {
                      onDelete(item.id);
                    }
                  }}
                  style={[
                    styles.deleteSingleBtn,
                    isRead && styles.deleteSingleBtnActive,
                    !isRead && styles.deleteSingleBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus notifikasi ini"
                >
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={isRead ? colors.danger : colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ==========================================
// MAIN NOTIFICATION MODAL
// ==========================================

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  activeSessions = [],
  notificationList = [],
}) => {
  const { height } = useWindowDimensions();

  const [clearedIds, setClearedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Muat status persisten dari AsyncStorage
  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const [savedCleared, savedRead] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_CLEARED),
          AsyncStorage.getItem(STORAGE_KEY_READ),
        ]);
        if (!isMounted) return;
        if (savedCleared) setClearedIds(JSON.parse(savedCleared));
        if (savedRead) setReadIds(JSON.parse(savedRead));
      } catch {
        // fallback to memory
      }
    };
    void loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Simpan ke AsyncStorage setiap kali ada pembaruan
  const persistCleared = (ids: string[]) => {
    setClearedIds(ids);
    AsyncStorage.setItem(STORAGE_KEY_CLEARED, JSON.stringify(ids)).catch(() => {});
  };

  const persistRead = (ids: string[]) => {
    setReadIds(ids);
    AsyncStorage.setItem(STORAGE_KEY_READ, JSON.stringify(ids)).catch(() => {});
  };

  // Gabungkan session yang sedang ACTIVE sebagai live notification
  const sessionNotifications: AppNotificationItem[] = useMemo(() => {
    return activeSessions.map((session) => ({
      id: `session_${session.id}`,
      type: 'SESSION_OPENED',
      title: `${session.courseName} sedang dibuka`,
      subtitle: `${session.time || `${session.startTime} - ${session.endTime}`} • ${
        session.room
      }`,
      time: session.openedAt || 'Baru saja',
      sessionId: session.id,
      url: `/student/attendance?sessionId=${session.id}`,
    }));
  }, [activeSessions]);

  const allNotifications = useMemo(() => {
    const uniqueMap = new Map<string, AppNotificationItem>();

    for (const item of [...sessionNotifications, ...notificationList]) {
      if (!clearedIds.includes(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => {
      if (a.type === 'SESSION_OPENED' && b.type !== 'SESSION_OPENED') return -1;
      if (b.type === 'SESSION_OPENED' && a.type !== 'SESSION_OPENED') return 1;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [sessionNotifications, notificationList, clearedIds]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((item) => !readIds.includes(item.id)).length;
  }, [allNotifications, readIds]);

  // Hapus SATU NOTIFIKASI (1 per 1)
  const handleDeleteOne = (id: string) => {
    setWarningMessage(null);
    const next = [...clearedIds, id];
    persistCleared(next);
  };

  // Tandai SATU NOTIFIKASI sebagai dibaca
  const handleMarkOneRead = (id: string) => {
    setWarningMessage(null);
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      persistRead(next);
    }
  };

  // Hendel saat pengguna mencoba menghapus notifikasi yang BELUM dibaca
  const handleBlockedDelete = (item: AppNotificationItem) => {
    setWarningMessage(
      `Notifikasi "${item.title}" belum dibaca. Ketuk atau tandai dibaca terlebih dahulu sebelum menghapus.`
    );
  };

  // Tandai SEMUA dibaca
  const handleMarkAllRead = () => {
    setWarningMessage(null);
    const next = Array.from(new Set([...readIds, ...allNotifications.map((i) => i.id)]));
    persistRead(next);
  };

  // Hapus SEMUA (hanya yang sudah dibaca)
  const handleClearAllRead = () => {
    setWarningMessage(null);
    const readItemIds = allNotifications
      .filter((item) => readIds.includes(item.id))
      .map((item) => item.id);

    if (readItemIds.length === 0) {
      setWarningMessage('Belum ada notifikasi yang dibaca untuk dihapus.');
      return;
    }

    const next = Array.from(new Set([...clearedIds, ...readItemIds]));
    persistCleared(next);
  };

  const handleItemPress = (item: AppNotificationItem) => {
    setWarningMessage(null);
    // Menandai notifikasi sebagai dibaca dan TETAP berada di modal notifikasi
    handleMarkOneRead(item.id);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { maxHeight: height * 0.88 }]}>
          {/* Sheet Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifikasi</Text>
              <Text style={styles.subtitle}>
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : 'Semua notifikasi telah dibaca'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup notifikasi"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.mochaDark} />
            </Pressable>
          </View>

          {/* PETUNJUK GESER UNTUK MENGHAPUS */}
          <View style={styles.guideBanner}>
            <Ionicons name="swap-horizontal" size={15} color={colors.primaryDark} />
            <Text style={styles.guideText}>
              Geser notifikasi ke <Text style={styles.bold}>kanan</Text> untuk menghapus 1 per 1. Hanya notifikasi yang sudah dibaca yang dapat dihapus.
            </Text>
          </View>

          {/* PESAN PERINGATAN KENDALA PENGHAPUSAN (JIKA BELUM DIBACA) */}
          {warningMessage ? (
            <View style={styles.warningAlertBox}>
              <Ionicons name="alert-circle" size={16} color={colors.warningDark} />
              <Text style={styles.warningAlertText}>{warningMessage}</Text>
              <Pressable hitSlop={6} onPress={() => setWarningMessage(null)}>
                <Ionicons name="close" size={15} color={colors.warningDark} />
              </Pressable>
            </View>
          ) : null}

          {/* Notification List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {allNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={28}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
                <Text style={styles.emptySubtitle}>
                  Pemberitahuan sesi praktikum dan status perizinan akan muncul di sini.
                </Text>
              </View>
            ) : (
              allNotifications.map((item) => {
                const isRead = readIds.includes(item.id);
                return (
                  <SwipeableNotificationItem
                    key={item.id}
                    item={item}
                    isRead={isRead}
                    onPress={handleItemPress}
                    onMarkRead={handleMarkOneRead}
                    onDelete={handleDeleteOne}
                    onBlockedDelete={handleBlockedDelete}
                  />
                );
              })
            )}
          </ScrollView>

          {/* Action Footer */}
          {allNotifications.length > 0 ? (
            <View style={styles.footer}>
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleMarkAllRead}
                  style={[styles.footerBtn, styles.readAllBtn]}
                >
                  <Ionicons name="checkmark-done" size={15} color={colors.mochaDark} />
                  <Text style={styles.readAllText}>Tandai Semua Dibaca</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleClearAllRead}
                style={[styles.footerBtn, styles.clearBtn]}
              >
                <Ionicons name="trash-outline" size={15} color={colors.dangerDark} />
                <Text style={styles.clearText}>Hapus yang Dibaca</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    ...theme.shadows.modal,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  guideText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  bold: {
    fontWeight: '700',
    color: colors.mochaDark,
  },
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 12,
    color: colors.warningDark,
    lineHeight: 16,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  swipeBackdropContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swipeBackdropText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemWrapper: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemCardUnread: {
    backgroundColor: colors.sand,
    borderColor: colors.border,
  },
  itemDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    marginRight: spacing.sm + 2,
    marginTop: 4,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.mochaDark,
  },
  itemTitleUnread: {
    fontWeight: '800',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  readBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryText,
  },
  itemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  itemTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  markReadSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markReadSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  deleteSingleBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSingleBtnActive: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
  },
  deleteSingleBtnDisabled: {
    opacity: 0.45,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  readAllBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  clearBtn: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default NotificationModal;

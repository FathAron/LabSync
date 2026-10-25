// TASK-02 - App Shell Header, Segmented Role Switcher & Persona Selector
// Penanggung Jawab: Aron Sorimuda Johanes Pasaribu

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CONTENT_MAX_WIDTH, colors, radius, spacing, theme } from '../styles/theme';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export const Header = () => {
  const insets = useSafeAreaInsets();
  const {
    currentRole,
    setCurrentRole,
    currentAssistant,
    setCurrentAssistant,
    currentStudent,
    setCurrentStudent,
    assistants,
    students,
    resetDemoData,
  } = useApp();

  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  const isAssistant = currentRole === 'assistant';

  const activeName = isAssistant
    ? currentAssistant.name
    : currentStudent
    ? currentStudent.name
    : 'Belum Dipilih';

  const activeSubtitle = isAssistant
    ? currentAssistant.role
    : currentStudent
    ? `NIM ${currentStudent.nim} • Kelas ${currentStudent.className}`
    : 'Klik Ganti untuk memilih akun praktikan';

  const activeAvatar = isAssistant
    ? currentAssistant.avatar || getInitials(currentAssistant.name)
    : currentStudent
    ? currentStudent.avatar || getInitials(currentStudent.name)
    : '?';

  return (
    <View style={[styles.outerContainer, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.innerContainer}>
        {/* Baris Atas: Brand Identitas & Tombol Reset Demo */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="flask" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.brandTextWrap}>
              <View style={styles.titleRow}>
                <Text style={styles.brandTitle}>LabSync</Text>
                <View style={styles.sprintBadge}>
                  <Text style={styles.sprintBadgeText}>Sprint 1</Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>Sistem Presensi Praktikum</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset Demo Data"
            onPress={resetDemoData}
            style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}
          >
            <Ionicons name="refresh-outline" size={15} color={colors.neutralDark} />
            <Text style={styles.resetBtnText}>Reset Demo</Text>
          </Pressable>
        </View>

        {/* Segmented Role Switcher: Sudut Pandang Asisten vs Praktikan */}
        <View style={styles.segmentedContainer} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isAssistant }}
            onPress={() => {
              if (!isAssistant) setCurrentRole('assistant');
            }}
            style={[styles.segmentTab, isAssistant && styles.segmentTabActiveAssistant]}
          >
            <Ionicons
              name={isAssistant ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={16}
              color={isAssistant ? colors.assistantTagDark : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentTabText,
                isAssistant && styles.segmentTabTextActiveAssistant,
              ]}
              numberOfLines={1}
            >
              Sudut Pandang Asisten
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !isAssistant }}
            onPress={() => {
              if (isAssistant) setCurrentRole('student');
            }}
            style={[styles.segmentTab, !isAssistant && styles.segmentTabActiveStudent]}
          >
            <Ionicons
              name={!isAssistant ? 'school' : 'school-outline'}
              size={16}
              color={!isAssistant ? colors.primaryDark : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentTabText,
                !isAssistant && styles.segmentTabTextActiveStudent,
              ]}
              numberOfLines={1}
            >
              Sudut Pandang Praktikan
            </Text>
          </Pressable>
        </View>

        {/* Bar Identitas Pengguna Aktif (Persona Selector) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ganti identitas pengguna aktif"
          onPress={() => setPickerModalVisible(true)}
          style={({ pressed }) => [styles.personaBar, pressed && styles.personaBarPressed]}
        >
          <View style={styles.personaLeft}>
            <View
              style={[
                styles.avatarCircle,
                isAssistant ? styles.avatarAssistant : styles.avatarStudent,
              ]}
            >
              <Text style={styles.avatarText}>{activeAvatar}</Text>
            </View>
            <View style={styles.personaTextWrap}>
              <View style={styles.personaRoleRow}>
                <Text style={styles.personaLabel}>
                  {isAssistant ? 'ASISTEN AKTIF' : 'PRAKTIKAN AKTIF'}
                </Text>
              </View>
              <Text style={styles.personaName} numberOfLines={1}>
                {activeName}
              </Text>
              <Text style={styles.personaSub} numberOfLines={1}>
                {activeSubtitle}
              </Text>
            </View>
          </View>

          <View style={styles.changePill}>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
            <Text style={styles.changePillText}>Ganti Akun</Text>
          </View>
        </Pressable>
      </View>

      {/* Modal Pemilih Identitas (Account / Persona Picker Modal) */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerModalVisible(false)}
            accessibilityLabel="Tutup modal pemilih identitas"
          >
            <View style={styles.modalBackdrop} />
          </Pressable>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>
                  Pilih Identitas {isAssistant ? 'Asisten Praktikum' : 'Praktikan'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Simulasikan skenario pengguna berbeda tanpa perlu login ulang.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={() => setPickerModalVisible(false)}
                hitSlop={8}
                style={styles.closeIconBtn}
              >
                <Ionicons name="close" size={20} color={colors.neutralDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {isAssistant ? (
                assistants.map((asprak) => {
                  const selected = currentAssistant.id === asprak.id;
                  return (
                    <Pressable
                      key={asprak.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setCurrentAssistant(asprak);
                        setPickerModalVisible(false);
                      }}
                      style={[styles.pickerItem, selected && styles.pickerItemActiveAssistant]}
                    >
                      <View style={[styles.avatarCircle, styles.avatarAssistant]}>
                        <Text style={styles.avatarText}>
                          {asprak.avatar || getInitials(asprak.name)}
                        </Text>
                      </View>
                      <View style={styles.pickerTextWrap}>
                        <Text style={styles.pickerName}>{asprak.name}</Text>
                        <Text style={styles.pickerMeta}>{asprak.role}</Text>
                      </View>
                      {selected ? (
                        <View style={styles.activeTagAssistant}>
                          <Ionicons
                            name="checkmark-circle"
                            size={15}
                            color={colors.assistantTagDark}
                          />
                          <Text style={styles.activeTagTextAssistant}>Aktif</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              ) : (
                <>
                  {students.map((mhs) => {
                    const selected = currentStudent?.id === mhs.id;
                    return (
                      <Pressable
                        key={mhs.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setCurrentStudent(mhs);
                          setPickerModalVisible(false);
                        }}
                        style={[styles.pickerItem, selected && styles.pickerItemActiveStudent]}
                      >
                        <View style={[styles.avatarCircle, styles.avatarStudent]}>
                          <Text style={styles.avatarText}>
                            {mhs.avatar || getInitials(mhs.name)}
                          </Text>
                        </View>
                        <View style={styles.pickerTextWrap}>
                          <Text style={styles.pickerName}>{mhs.name}</Text>
                          <Text style={styles.pickerMeta}>
                            NIM {mhs.nim} • Kelas {mhs.className}
                          </Text>
                        </View>
                        {selected ? (
                          <View style={styles.activeTagStudent}>
                            <Ionicons name="checkmark-circle" size={15} color={colors.primaryDark} />
                            <Text style={styles.activeTagTextStudent}>Aktif</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}

                  {/* Opsi Edge Case: Tanpa Identitas (untuk menguji empty state modul praktikan) */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: currentStudent === null }}
                    onPress={() => {
                      setCurrentStudent(null);
                      setPickerModalVisible(false);
                    }}
                    style={[
                      styles.pickerItem,
                      currentStudent === null && styles.pickerItemActiveStudent,
                    ]}
                  >
                    <View style={[styles.avatarCircle, styles.avatarNeutral]}>
                      <Ionicons name="person-remove-outline" size={15} color="#FFFFFF" />
                    </View>
                    <View style={styles.pickerTextWrap}>
                      <Text style={styles.pickerName}>Tanpa Identitas (Uji Edge Case)</Text>
                      <Text style={styles.pickerMeta}>
                        Simulasi kondisi belum ada akun praktikan terpilih
                      </Text>
                    </View>
                    {currentStudent === null ? (
                      <View style={styles.activeTagStudent}>
                        <Ionicons name="checkmark-circle" size={15} color={colors.primaryDark} />
                        <Text style={styles.activeTagTextStudent}>Aktif</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </>
              )}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerModalVisible(false)}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeModalBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.md,
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
  sprintBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  sprintBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutralSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  resetBtnPressed: {
    opacity: 0.75,
  },
  resetBtnText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutralDark,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSoft,
    padding: 4,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentTabActiveAssistant: {
    backgroundColor: colors.assistantTagBg,
    borderWidth: 1,
    borderColor: colors.assistantTag,
  },
  segmentTabActiveStudent: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  segmentTabText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTabTextActiveAssistant: {
    fontWeight: '700',
    color: colors.assistantTagDark,
  },
  segmentTabTextActiveStudent: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  personaBar: {
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
  personaBarPressed: {
    backgroundColor: colors.neutralSoft,
  },
  personaLeft: {
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
  avatarNeutral: {
    backgroundColor: colors.neutral,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  personaTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  personaRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  personaName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  personaSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  changePillText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...theme.shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalHeaderTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  pickerItemActiveAssistant: {
    borderColor: colors.assistantTag,
    backgroundColor: colors.assistantTagBg,
  },
  pickerItemActiveStudent: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pickerTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  pickerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  activeTagAssistant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activeTagTextAssistant: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.assistantTagDark,
  },
  activeTagStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activeTagTextStudent: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  closeModalBtn: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutralDark,
  },
});

export default Header;


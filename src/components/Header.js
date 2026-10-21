import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../styles/theme';

export const Header = () => {
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

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>LS</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>LabSync</Text>
              <View style={styles.sprintPill}>
                <Text style={styles.sprintPillText}>Sprint 1</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>Presensi Praktikum Mandiri</Text>
          </View>
        </View>

        {/* Reset Demo Data Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetDemoData}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>🔄 Reset Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Role Switcher Tabs */}
      <View style={styles.roleTabsContainer}>
        <TouchableOpacity
          style={[
            styles.roleTab,
            isAssistant && styles.roleTabActiveAssistant,
          ]}
          onPress={() => setCurrentRole('assistant')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.roleTabText,
              isAssistant && styles.roleTabTextActive,
            ]}
          >
            🛡️ Sudut Pandang Asisten
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleTab,
            !isAssistant && styles.roleTabActiveStudent,
          ]}
          onPress={() => setCurrentRole('student')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.roleTabText,
              !isAssistant && styles.roleTabTextActive,
            ]}
          >
            🎓 Sudut Pandang Praktikan
          </Text>
        </TouchableOpacity>
      </View>

      {/* User Persona Bar (Quick Switcher) */}
      <View style={styles.personaBar}>
        <View style={styles.personaInfo}>
          <Text style={styles.personaLabel}>Login Sebagai:</Text>
          <TouchableOpacity
            style={styles.personaSelector}
            onPress={() => setPickerModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarCircle, isAssistant ? styles.avatarAssistant : styles.avatarStudent]}>
              <Text style={styles.avatarText}>
                {isAssistant ? currentAssistant.avatar : currentStudent.avatar}
              </Text>
            </View>
            <View>
              <Text style={styles.personaName}>
                {isAssistant ? currentAssistant.name : currentStudent.name}
              </Text>
              <Text style={styles.personaSub}>
                {isAssistant ? currentAssistant.role : `${currentStudent.nim} • ${currentStudent.class}`}
              </Text>
            </View>
            <Text style={styles.personaChangeBtn}>Ganti ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Switch User Persona */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Pilih Identitas {isAssistant ? 'Asisten' : 'Praktikan'}
            </Text>
            <Text style={styles.modalSub}>
              Pilih pengguna untuk mendemonstrasikan variasi aksi di aplikasi:
            </Text>

            {isAssistant ? (
              assistants.map((asprak) => (
                <TouchableOpacity
                  key={asprak.id}
                  style={[
                    styles.pickerItem,
                    currentAssistant.id === asprak.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setCurrentAssistant(asprak);
                    setPickerModalVisible(false);
                  }}
                >
                  <View style={[styles.avatarCircle, styles.avatarAssistant]}>
                    <Text style={styles.avatarText}>{asprak.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.pickerName}>{asprak.name}</Text>
                    <Text style={styles.pickerDetail}>{asprak.role}</Text>
                  </View>
                  {currentAssistant.id === asprak.id && (
                    <Text style={styles.checkedText}>✓ Aktif</Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              students.map((mhs) => (
                <TouchableOpacity
                  key={mhs.id}
                  style={[
                    styles.pickerItem,
                    currentStudent.id === mhs.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setCurrentStudent(mhs);
                    setPickerModalVisible(false);
                  }}
                >
                  <View style={[styles.avatarCircle, styles.avatarStudent]}>
                    <Text style={styles.avatarText}>{mhs.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.pickerName}>{mhs.name}</Text>
                    <Text style={styles.pickerDetail}>{mhs.nim} • {mhs.class}</Text>
                  </View>
                  {currentStudent.id === mhs.id && (
                    <Text style={styles.checkedText}>✓ Aktif</Text>
                  )}
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeText: {
    color: theme.colors.textLight,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sprintPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sprintPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  brandSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  resetButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 4,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 10,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  roleTabActiveAssistant: {
    backgroundColor: theme.colors.assistantTagBg,
    borderWidth: 1,
    borderColor: theme.colors.assistantTag,
  },
  roleTabActiveStudent: {
    backgroundColor: theme.colors.studentTagBg,
    borderWidth: 1,
    borderColor: theme.colors.studentTag,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleTabTextActive: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  personaBar: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  personaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personaLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  personaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAssistant: {
    backgroundColor: theme.colors.assistantTag,
  },
  avatarStudent: {
    backgroundColor: theme.colors.studentTag,
  },
  avatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  personaName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  personaSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  personaChangeBtn: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    maxWidth: 400,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    ...theme.shadows.modal,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  pickerItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pickerDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  checkedText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  closeModalButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

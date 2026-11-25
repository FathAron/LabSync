import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HistoryItem from '../../src/features/student/components/HistoryItem';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';

import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
  theme,
} from '../../src/styles/theme';

import { useStudentModule } from '../../src/features/student/useStudentModule';

const HistoryScreen = () => {
  const { student, historyItems, dataLoading } = useStudentModule();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyItems;
    const q = searchQuery.toLowerCase().trim();
    return historyItems.filter((item) => {
      const course = item.session?.courseName?.toLowerCase() ?? '';
      const module = item.session?.moduleTitle?.toLowerCase() ?? '';
      const notes = item.record.notes?.toLowerCase() ?? '';
      return course.includes(q) || module.includes(q) || notes.includes(q);
    });
  }, [historyItems, searchQuery]);

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat riwayat presensi...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas Praktikan Belum Tersedia"
        message="Silakan masuk menggunakan akun praktikan untuk melihat riwayat kehadiran."
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) =>
          item.record.id !== undefined
            ? String(item.record.id)
            : `history-${index}`
        }
        renderItem={({ item }) => (
          <HistoryItem record={item.record} session={item.session} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Stat Summary Box */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{historyItems.length}</Text>
                <Text style={styles.statLabel}>Total Presensi Hadir</Text>
              </View>

              <View style={[styles.statCard, styles.statCardSecondary]}>
                <Text style={styles.statNumberSecondary}>
                  {student.className || '-'}
                </Text>
                <Text style={styles.statLabel}>Kelas Praktikan</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={17}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari mata kuliah atau modul..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* List Title */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Semua Kehadiran</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredHistory.length} Catatan
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          searchQuery ? (
            <StudentEmptyState
              icon="search-outline"
              title="Tidak Ada Riwayat yang Cocok"
              message={`Tidak ditemukan presensi dengan kata kunci "${searchQuery}".`}
            />
          ) : (
            <StudentEmptyState
              icon="document-text-outline"
              title="Belum Ada Riwayat Presensi"
              message="Catatan kehadiran Anda akan otomatis tersimpan di sini setelah berhasil melakukan presensi sesi praktikum."
            />
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  statCardSecondary: {
    backgroundColor: colors.sand,
    borderColor: colors.borderLight,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.successDark,
  },
  statNumberSecondary: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.mochaDark,
    paddingVertical: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default HistoryScreen;

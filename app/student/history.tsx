// TASK-04 - Tab "Riwayat Presensi".
// Hanya catatan milik praktikan aktif (dicocokkan lewat ID), terbaru dulu.
// Data dihitung dari state pusat di useStudentModule, jadi catatan baru
// langsung muncul tanpa memuat ulang.

import { FlatList, StyleSheet, View } from 'react-native';
import HistoryItem from '../../src/features/student/components/HistoryItem';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';
import { CONTENT_MAX_WIDTH, spacing } from '../../src/features/student/studentTokens';
import { useStudentModule } from '../../src/features/student/useStudentModule';

const HistoryScreen = () => {
  const { student, historyItems } = useStudentModule();

  if (!student) {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas praktikan belum tersedia"
        message="Pilih identitas praktikan terlebih dahulu agar riwayat presensi dapat ditampilkan."
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={historyItems}
        keyExtractor={(item, index) =>
          item.record.id !== undefined ? String(item.record.id) : `history-${index}`
        }
        renderItem={({ item }) => <HistoryItem record={item.record} session={item.session} />}
        ListEmptyComponent={
          <StudentEmptyState
            icon="document-text-outline"
            title="Belum ada riwayat presensi."
            message="Riwayat kehadiranmu akan muncul setelah kamu melakukan presensi pada sesi praktikum."
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
});

export default HistoryScreen;

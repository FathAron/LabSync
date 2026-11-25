import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppModal from '../../../components/AppModal';
import EmptyState from '../../../components/EmptyState';
import { colors, radius, spacing } from '../../../styles/theme';

import type {
  ApiResponse,
  CreateClassInput,
  LabClass,
  UserProfile,
} from '../../../types/models';

type Props = {
  visible: boolean;
  classes: LabClass[];
  students: UserProfile[];
  onClose: () => void;

  onCreateClass: (
    input: CreateClassInput
  ) => Promise<ApiResponse<LabClass>>;

  onUpdateClass: (
    classId: string,
    patch: Partial<CreateClassInput>
  ) => Promise<ApiResponse<void>>;

  onDeleteClass: (
    classId: string
  ) => Promise<ApiResponse<void>>;

  onAssignStudentToClass: (
    studentId: string,
    className: string
  ) => Promise<ApiResponse<void>>;
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="characters"
      style={styles.input}
    />
  </View>
);

const ClassManagementContent = ({
  classes,
  students,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onAssignStudentToClass,
}: {
  classes: LabClass[];
  students: UserProfile[];
  onCreateClass: (input: CreateClassInput) => Promise<ApiResponse<LabClass>>;
  onUpdateClass: (classId: string, patch: Partial<CreateClassInput>) => Promise<ApiResponse<void>>;
  onDeleteClass: (classId: string) => Promise<ApiResponse<void>>;
  onAssignStudentToClass: (studentId: string, className: string) => Promise<ApiResponse<void>>;
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [className, setClassName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const studentsInClass = useMemo(
    () =>
      students.filter(
        (student) =>
          student.className.toUpperCase() ===
          (selectedClass?.name ?? '').toUpperCase()
      ),
    [selectedClass, students]
  );

  const startCreate = () => {
    setSelectedClassId(null);
    setClassName('');
    setCourseCode('');
    setCourseName('');
    setError('');
    setEditing(true);
  };

  const startEdit = (item: LabClass) => {
    setSelectedClassId(item.id);
    setClassName(item.name);
    setCourseCode(item.courseCode);
    setCourseName(item.courseName);
    setError('');
    setEditing(true);
  };

  const saveClass = async () => {
    if (busy) return;

    if (!className.trim() || !courseCode.trim() || !courseName.trim()) {
      setError('Nama kelas, kode praktikum, dan nama praktikum wajib diisi.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = selectedClassId
        ? await onUpdateClass(selectedClassId, {
            name: className,
            courseCode,
            courseName,
          })
        : await onCreateClass({
            name: className,
            courseCode,
            courseName,
          });

      if (result.ok) {
        const createdClassId =
          result.data &&
          typeof result.data === 'object' &&
          'id' in result.data
            ? String(result.data.id)
            : selectedClassId;

        setEditing(false);
        setSelectedClassId(createdClassId);
      } else {
        setError(result.message);
      }
    } catch {
      setError('Data kelas gagal disimpan. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const assignStudent = async (studentId: string) => {
    if (!selectedClass || busyStudentId) return;

    setBusyStudentId(studentId);
    setError('');

    try {
      const result = await onAssignStudentToClass(
        studentId,
        selectedClass.name
      );

      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError('Praktikan gagal dimasukkan ke kelas.');
    } finally {
      setBusyStudentId(null);
    }
  };

  const deleteSelectedClass = () => {
    if (!selectedClass || busy) return;

    Alert.alert(
      'Hapus kelas?',
      `Kelas ${selectedClass.name} akan dihapus. Pastikan jadwal yang menggunakan kelas ini sudah disesuaikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');

            try {
              const result = await onDeleteClass(selectedClass.id);
              if (result.ok) {
                setSelectedClassId(null);
              } else {
                setError(result.message);
              }
            } catch {
              setError('Kelas gagal dihapus.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (editing) {
    return (
      <View style={styles.formContainer}>
        <View style={styles.subHeader}>
          <Text style={styles.sectionTitle}>
            {selectedClassId ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
          </Text>
          <Pressable onPress={() => setEditing(false)}>
            <Text style={styles.textLink}>Batal</Text>
          </Pressable>
        </View>

        <Field
          label="Nama Kelas (contoh: IF-26-A)"
          value={className}
          onChangeText={setClassName}
          placeholder="A1"
        />

        <Field
          label="Kode Mata Praktikum"
          value={courseCode}
          onChangeText={setCourseCode}
          placeholder="PAIK6101"
        />

        <Field
          label="Nama Mata Praktikum"
          value={courseName}
          onChangeText={setCourseName}
          placeholder="Dasar Pemrograman"
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={busy}
          onPress={saveClass}
          style={[styles.primaryButton, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryButtonText}>Simpan Data Kelas</Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (selectedClass) {
    const unassignedStudents = students.filter(
      (student) =>
        student.className.toUpperCase() !== selectedClass.name.toUpperCase()
    );

    return (
      <View style={styles.detailContainer}>
        <View style={styles.subHeader}>
          <View style={styles.grow}>
            <Text style={styles.sectionTitle}>Kelas {selectedClass.name}</Text>
            <Text style={styles.muted}>
              {selectedClass.courseCode} · {selectedClass.courseName}
            </Text>
          </View>
          <Pressable onPress={() => setSelectedClassId(null)}>
            <Text style={styles.textLink}>Semua Kelas</Text>
          </Pressable>
        </View>

        {/* METRICS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{studentsInClass.length}</Text>
            <Text style={styles.metricLabel}>Mahasiswa Terdaftar</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{selectedClass.totalStudents}</Text>
            <Text style={styles.metricLabel}>Kapasitas Maksimal</Text>
          </View>
        </View>

        {/* REGISTERED STUDENTS */}
        <View style={styles.subHeader}>
          <Text style={styles.subSectionTitle}>Peserta Kelas Saat Ini</Text>
          <Pressable onPress={() => startEdit(selectedClass)}>
            <Text style={styles.textLink}>Edit Kelas</Text>
          </Pressable>
        </View>

        {studentsInClass.length ? (
          studentsInClass.map((student) => (
            <View key={student.uid} style={styles.studentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {student.avatar || student.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.grow}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.muted}>{student.nim || 'NIM belum ada'}</Text>
              </View>
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Terdaftar</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyNote}>
            Belum ada praktikan yang terdaftar pada kelas ini.
          </Text>
        )}

        {/* ADD STUDENTS */}
        <Text style={[styles.subSectionTitle, styles.assignTitle]}>
          Tambahkan Praktikan ke Kelas Ini
        </Text>

        {unassignedStudents.length ? (
          unassignedStudents.map((student) => (
            <View key={student.uid} style={styles.studentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {student.avatar || student.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.grow}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.muted}>
                  {student.nim || 'NIM —'} · {student.className || 'Tanpa kelas'}
                </Text>
              </View>
              <Pressable
                disabled={Boolean(busyStudentId)}
                onPress={() => assignStudent(student.uid)}
                style={styles.assignButton}
              >
                {busyStudentId === student.uid ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Ionicons name="add" size={18} color={colors.primaryText} />
                )}
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.emptyNote}>
            Semua praktikan yang terdaftar di sistem sudah tergabung di kelas ini.
          </Text>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={busy}
          onPress={deleteSelectedClass}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Hapus Kelas Ini</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <View style={styles.subHeader}>
        <Text style={styles.sectionTitle}>Daftar Kelas Praktikum</Text>
        <Pressable onPress={startCreate} style={styles.addButton}>
          <Ionicons name="add" size={17} color={colors.primaryText} />
          <Text style={styles.addButtonText}>Tambah Kelas</Text>
        </Pressable>
      </View>

      {classes.length ? (
        classes.map((item) => (
          <View key={item.id} style={styles.classRow}>
            <Pressable
              style={styles.grow}
              onPress={() => setSelectedClassId(item.id)}
            >
              <View style={styles.classNameRow}>
                <Text style={styles.className}>Kelas {item.name}</Text>
                <View style={styles.classCountBadge}>
                  <Text style={styles.classCountText}>
                    {item.totalStudents} Mhs
                  </Text>
                </View>
              </View>
              <Text style={styles.muted}>
                {item.courseCode} · {item.courseName}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={`Ubah kelas ${item.name}`}
              onPress={() => startEdit(item)}
              style={styles.actionIconBtn}
            >
              <Ionicons name="create-outline" size={18} color={colors.text} />
            </Pressable>

            <Pressable
              accessibilityLabel={`Kelola peserta kelas ${item.name}`}
              onPress={() => setSelectedClassId(item.id)}
              style={styles.actionIconBtn}
            >
              <Ionicons name="people-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
        ))
      ) : (
        <EmptyState
          icon="people-outline"
          title="Belum ada kelas terdaftar"
          message="Tambahkan kelas praktikum untuk mengelompokkan mahasiswa dan jadwal kegiatan lab."
        />
      )}
    </View>
  );
};

const ClassManagementModal = ({
  visible,
  classes,
  students,
  onClose,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onAssignStudentToClass,
}: Props) => {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Kelola Kelas & Peserta"
      description="Kelola daftar kelas praktikum dan atur penempatan praktikan ke dalam kelas."
      maxWidth={640}
    >
      {visible ? (
        <ClassManagementContent
          key={String(visible)}
          classes={classes}
          students={students}
          onCreateClass={onCreateClass}
          onUpdateClass={onUpdateClass}
          onDeleteClass={onDeleteClass}
          onAssignStudentToClass={onAssignStudentToClass}
        />
      ) : null}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    paddingBottom: spacing.sm,
  },
  detailContainer: {
    paddingBottom: spacing.sm,
  },
  listContainer: {
    paddingBottom: spacing.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  textLink: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyNote: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginVertical: spacing.sm,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontWeight: '800',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  assignedBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  assignTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  assignButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    marginTop: spacing.xl,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  classNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  className: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  classCountBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ClassManagementModal;

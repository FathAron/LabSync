
import React, { useEffect, useMemo, useState } from 'react';
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

import {
  colors,
  radius,
  spacing,
} from '../../../styles/theme';

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

// ==========================================
// INPUT FIELD
// ==========================================

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

// ==========================================
// MAIN COMPONENT
// ==========================================

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
  const [selectedClassId, setSelectedClassId] =
    useState<string | null>(null);

  const [editing, setEditing] = useState(false);

  const [className, setClassName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  const [busy, setBusy] = useState(false);

  const [busyStudentId, setBusyStudentId] =
    useState<string | null>(null);

  const [error, setError] = useState('');

  // ==========================================
  // SELECTED CLASS
  // ==========================================

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) => item.id === selectedClassId
      ) ?? null,
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

  // ==========================================
  // RESET MODAL
  // ==========================================

  useEffect(() => {
    if (!visible) return;

    setSelectedClassId(null);
    setEditing(false);
    setError('');
  }, [visible]);

  // ==========================================
  // CREATE CLASS
  // ==========================================

  const startCreate = () => {
    setSelectedClassId(null);

    setClassName('');
    setCourseCode('');
    setCourseName('');

    setError('');
    setEditing(true);
  };

  // ==========================================
  // EDIT CLASS
  // ==========================================

  const startEdit = (item: LabClass) => {
    setSelectedClassId(item.id);

    setClassName(item.name);
    setCourseCode(item.courseCode);
    setCourseName(item.courseName);

    setError('');
    setEditing(true);
  };

  // ==========================================
  // SAVE CLASS
  // ==========================================

  const saveClass = async () => {
    if (busy) return;

    if (
      !className.trim() ||
      !courseCode.trim() ||
      !courseName.trim()
    ) {
      setError(
        'Nama kelas, kode praktikum, dan nama praktikum wajib diisi.'
      );
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = selectedClassId
        ? await onUpdateClass(
            selectedClassId,
            {
              name: className,
              courseCode,
              courseName,
            }
          )
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
      setError(
        'Data kelas gagal disimpan. Silakan coba lagi.'
      );
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ASSIGN STUDENT TO CLASS
  // ==========================================

  const assignStudent = async (
    studentId: string
  ) => {
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
      setError(
        'Praktikan gagal dimasukkan ke kelas.'
      );
    } finally {
      setBusyStudentId(null);
    }
  };

  // ==========================================
  // DELETE CLASS
  // ==========================================

  const deleteSelectedClass = () => {
    if (!selectedClass || busy) return;

    Alert.alert(
      'Hapus kelas?',
      `Kelas ${selectedClass.name} akan dihapus. Jadwal yang masih menggunakan kelas ini harus dihapus atau dipindahkan terlebih dahulu.`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');

            try {
              const result = await onDeleteClass(
                selectedClass.id
              );

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

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AppModal
      visible={visible}
      onClose={
        busy || busyStudentId
          ? () => undefined
          : onClose
      }
      title="Kelola Kelas & Peserta"
      description="Kelola daftar kelas praktikum dan tempatkan akun praktikan ke kelas yang sesuai."
      maxWidth={640}
    >
      {/* FORM CREATE / EDIT */}
      {editing ? (
        <>
          <View style={styles.subHeader}>
            <Text style={styles.sectionTitle}>
              {selectedClassId
                ? 'Ubah Data Kelas'
                : 'Tambah Kelas Baru'}
            </Text>

            <Pressable
              onPress={() => setEditing(false)}
            >
              <Text style={styles.textLink}>
                Kembali
              </Text>
            </Pressable>
          </View>

          <Field
            label="Nama Kelas"
            value={className}
            onChangeText={setClassName}
            placeholder="IF-26-A"
          />

          <Field
            label="Kode Praktikum"
            value={courseCode}
            onChangeText={setCourseCode}
            placeholder="CSG3H3"
          />

          <Field
            label="Nama Praktikum"
            value={courseName}
            onChangeText={setCourseName}
            placeholder="Pemrograman Perangkat Bergerak"
          />

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={saveClass}
            style={[
              styles.primaryButton,
              busy && styles.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Simpan Kelas
              </Text>
            )}
          </Pressable>
        </>
      ) : selectedClass ? (
        /* CLASS DETAIL */
        <>
          <View style={styles.subHeader}>
            <View style={styles.grow}>
              <Text style={styles.sectionTitle}>
                Kelas {selectedClass.name}
              </Text>

              <Text style={styles.muted}>
                {selectedClass.courseCode} ·{' '}
                {selectedClass.courseName}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedClassId(null)}
            >
              <Text style={styles.textLink}>
                Daftar kelas
              </Text>
            </Pressable>
          </View>

          {/* CLASS METRICS */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {studentsInClass.length}
              </Text>

              <Text style={styles.metricLabel}>
                Peserta terdaftar
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {selectedClass.totalStudents}
              </Text>

              <Text style={styles.metricLabel}>
                Kapasitas data
              </Text>
            </View>
          </View>

          {/* REGISTERED STUDENTS */}
          <View style={styles.subHeader}>
            <Text style={styles.sectionTitle}>
              Peserta Kelas
            </Text>

            <Pressable
              onPress={() => startEdit(selectedClass)}
            >
              <Text style={styles.textLink}>
                Ubah kelas
              </Text>
            </Pressable>
          </View>

          {studentsInClass.length ? (
            studentsInClass.map((student) => (
              <View
                key={student.uid}
                style={styles.studentRow}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.avatar ||
                      student.name
                        .slice(0, 2)
                        .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.grow}>
                  <Text style={styles.studentName}>
                    {student.name}
                  </Text>

                  <Text style={styles.muted}>
                    {student.nim || 'NIM belum tersedia'}
                  </Text>
                </View>

                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedText}>
                    Terdaftar
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              Belum ada praktikan yang terdaftar pada kelas ini.
            </Text>
          )}

          {/* AVAILABLE STUDENTS */}
          <Text
            style={[
              styles.sectionTitle,
              styles.assignTitle,
            ]}
          >
            Tambahkan Praktikan
          </Text>

          {students.filter(
            (student) =>
              student.className.toUpperCase() !==
              selectedClass.name.toUpperCase()
          ).length ? (
            students
              .filter(
                (student) =>
                  student.className.toUpperCase() !==
                  selectedClass.name.toUpperCase()
              )
              .map((student) => (
                <View
                  key={student.uid}
                  style={styles.studentRow}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {student.avatar ||
                        student.name
                          .slice(0, 2)
                          .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.grow}>
                    <Text style={styles.studentName}>
                      {student.name}
                    </Text>

                    <Text style={styles.muted}>
                      {student.nim || 'NIM belum tersedia'}
                      {' · '}
                      {student.className || 'Belum ada kelas'}
                    </Text>
                  </View>

                  <Pressable
                    disabled={Boolean(busyStudentId)}
                    onPress={() =>
                      assignStudent(student.uid)
                    }
                    style={styles.assignButton}
                  >
                    {busyStudentId === student.uid ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name="add"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                </View>
              ))
          ) : (
            <Text style={styles.muted}>
              Semua praktikan yang tersedia sudah berada di kelas ini.
            </Text>
          )}

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          {/* DELETE CLASS */}
          <Pressable
            disabled={busy}
            onPress={deleteSelectedClass}
            style={styles.deleteButton}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={colors.dangerDark}
            />

            <Text style={styles.deleteText}>
              Hapus Kelas
            </Text>
          </Pressable>
        </>
      ) : (
        /* CLASS LIST */
        <>
          <View style={styles.subHeader}>
            <Text style={styles.sectionTitle}>
              Daftar Kelas
            </Text>

            <Pressable
              onPress={startCreate}
              style={styles.addButton}
            >
              <Ionicons
                name="add"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.addButtonText}>
                Tambah
              </Text>
            </Pressable>
          </View>

          {classes.length ? (
            classes.map((item) => (
              <View
                key={item.id}
                style={styles.classRow}
              >
                <Pressable
                  style={styles.grow}
                  onPress={() =>
                    setSelectedClassId(item.id)
                  }
                >
                  <Text style={styles.className}>
                    Kelas {item.name}
                  </Text>

                  <Text style={styles.muted}>
                    {item.courseCode} · {item.courseName}
                  </Text>

                  <Text style={styles.muted}>
                    {item.totalStudents} praktikan
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={`Ubah kelas ${item.name}`}
                  onPress={() => startEdit(item)}
                  style={styles.assignButton}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>

                <Pressable
                  accessibilityLabel={`Kelola peserta kelas ${item.name}`}
                  onPress={() =>
                    setSelectedClassId(item.id)
                  }
                  style={styles.assignButton}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            ))
          ) : (
            <EmptyState
              icon="people-outline"
              title="Belum ada kelas"
              message="Tambahkan kelas untuk mulai mengatur peserta dan jadwal praktikum."
            />
          )}
        </>
      )}
    </AppModal>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
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
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
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
    fontSize: 15,
    fontWeight: '800',
  },

  textLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  grow: {
    flex: 1,
    minWidth: 0,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  disabled: {
    opacity: 0.6,
  },

  errorText: {
    color: colors.dangerDark,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  metricCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  metricValue: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 20,
  },

  metricLabel: {
    color: colors.primaryDark,
    fontSize: 11,
    marginTop: 2,
  },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.neutralDark,
    fontWeight: '800',
    fontSize: 11,
  },

  studentName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },

  assignedBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  assignedText: {
    color: colors.successDark,
    fontSize: 10,
    fontWeight: '800',
  },

  assignTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },

  assignButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    marginTop: spacing.lg,
  },

  deleteText: {
    color: colors.dangerDark,
    fontWeight: '800',
    fontSize: 13,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  className: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
});

export default ClassManagementModal;

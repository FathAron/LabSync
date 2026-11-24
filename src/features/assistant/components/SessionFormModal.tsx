
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppModal from '../../../components/AppModal';
import { colors, radius, spacing } from '../../../styles/theme';

import type {
  ApiResponse,
  CreateSessionInput,
  LabClass,
  Laboratory,
  Session,
} from '../../../types/models';

type Props = {
  visible: boolean;
  session: Session | null;
  classes: LabClass[];
  laboratories?: Laboratory[];
  onClose: () => void;
  onSubmit: (
    input: CreateSessionInput
  ) => Promise<ApiResponse<unknown>>;
};

const emptyForm = (): CreateSessionInput => ({
  courseName: '',
  courseCode: '',
  moduleCode: '',
  moduleTitle: '',
  className: '',
  day: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '08:00',
  endTime: '10:00',
  room: '',
  laboratoryId: '',
  totalStudents: 0,
  notes: '',
});

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
}: FieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>

    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      style={[
        styles.input,
        multiline && styles.multiline,
      ]}
    />
  </View>
);

const SessionFormModal = ({
  visible,
  session,
  classes,
  laboratories = [],
  onClose,
  onSubmit,
}: Props) => {
  const [form, setForm] =
    useState<CreateSessionInput>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    setError('');

    setForm(
      session
        ? {
            courseName: session.courseName,
            courseCode: session.courseCode,
            moduleCode: session.moduleCode,
            moduleTitle: session.moduleTitle,
            className: session.className,
            day: session.day,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            room: session.room,
            laboratoryId: session.laboratoryId ?? '',
            totalStudents: session.totalStudents,
            notes: session.notes,
          }
        : emptyForm()
    );
  }, [session, visible]);

  const update = <K extends keyof CreateSessionInput>(
    key: K,
    value: CreateSessionInput[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (saving) return;

    setError('');

    const requiredFields = [
      form.courseName,
      form.courseCode,
      form.moduleCode,
      form.moduleTitle,
      form.className,
      form.day,
      form.date,
      form.startTime,
      form.endTime,
      form.room,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setError(
        'Lengkapi seluruh data sesi yang wajib diisi.'
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      setError(
        'Tanggal harus menggunakan format YYYY-MM-DD.'
      );
      return;
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.endTime)
    ) {
      setError(
        'Jam harus menggunakan format HH:mm, misalnya 13:30.'
      );
      return;
    }

    if (form.endTime <= form.startTime) {
      setError(
        'Jam selesai harus lebih besar dari jam mulai.'
      );
      return;
    }

    const totalStudents = Number(form.totalStudents);

    if (
      !Number.isInteger(totalStudents) ||
      totalStudents < 0
    ) {
      setError(
        'Jumlah praktikan harus berupa angka 0 atau lebih.'
      );
      return;
    }

    if (!classes.some((item) => item.name === form.className)) {
      setError(
        'Pilih kelas yang sudah terdaftar.'
      );
      return;
    }

    setSaving(true);

    try {
      const result = await onSubmit({
        ...form,
        totalStudents,
      });

      if (result.ok) {
        onClose();
      } else {
        setError(
          result.message || 'Sesi gagal disimpan.'
        );
      }
    } catch {
      setError(
        'Sesi gagal disimpan. Periksa koneksi lalu coba lagi.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={saving ? () => undefined : onClose}
      title={
        session
          ? 'Ubah Sesi Praktikum'
          : 'Tambah Sesi Praktikum'
      }
      description="Isi informasi kelas dan jadwal praktikum. Sesi baru akan berstatus Belum Dibuka."
    >
      <Field
        label="Nama Praktikum *"
        value={form.courseName}
        onChangeText={(value) =>
          update('courseName', value)
        }
        placeholder="Pemrograman Perangkat Bergerak"
      />

      <Field
        label="Kode Praktikum *"
        value={form.courseCode}
        onChangeText={(value) =>
          update('courseCode', value)
        }
        placeholder="CSG3H3"
        autoCapitalize="characters"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Kode Modul *"
            value={form.moduleCode}
            onChangeText={(value) =>
              update('moduleCode', value)
            }
            placeholder="Modul 01"
          />
        </View>

        <View style={styles.half}>
          <Text style={styles.label}>Kelas *</Text>

          <View style={styles.classChoices}>
            {classes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  update('className', item.name)
                }
                style={[
                  styles.classChoice,
                  form.className === item.name &&
                    styles.classChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.classChoiceName,
                    form.className === item.name &&
                      styles.classChoiceNameActive,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {!classes.length ? (
            <Text style={styles.classHint}>
              Belum ada kelas. Tambahkan kelas melalui
              pengelolaan kelas terlebih dahulu.
            </Text>
          ) : null}
        </View>
      </View>

      <Field
        label="Judul Modul *"
        value={form.moduleTitle}
        onChangeText={(value) =>
          update('moduleTitle', value)
        }
        placeholder="Flexbox Layout & State Management"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Hari *"
            value={form.day}
            onChangeText={(value) =>
              update('day', value)
            }
            placeholder="Senin"
          />
        </View>

        <View style={styles.half}>
          <Field
            label="Tanggal * (YYYY-MM-DD)"
            value={form.date}
            onChangeText={(value) =>
              update('date', value)
            }
            placeholder="2026-11-16"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Mulai * (HH:mm)"
            value={form.startTime}
            onChangeText={(value) =>
              update('startTime', value)
            }
            placeholder="08:00"
          />
        </View>

        <View style={styles.half}>
          <Field
            label="Selesai * (HH:mm)"
            value={form.endTime}
            onChangeText={(value) =>
              update('endTime', value)
            }
            placeholder="10:00"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Laboratorium (Lokasi Presensi)
        </Text>

        <View style={styles.classChoices}>
          {laboratories.map((lab) => {
            const active = form.laboratoryId === lab.id;

            return (
              <Pressable
                key={lab.id}
                onPress={() => {
                  update('laboratoryId', active ? '' : lab.id);
                  if (!active) {
                    update('room', lab.name);
                  }
                }}
                style={[
                  styles.classChoice,
                  active && styles.classChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.classChoiceName,
                    active && styles.classChoiceNameActive,
                  ]}
                >
                  {lab.name} ({lab.radiusMeters}m)
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!laboratories.length ? (
          <Text style={styles.classHint}>
            Belum ada data laboratorium. Tambahkan melalui menu
            Lab agar sesi terhubung ke lokasi presensi.
          </Text>
        ) : null}
      </View>

      <Field
        label="Ruangan *"
        value={form.room}
        onChangeText={(value) =>
          update('room', value)
        }
        placeholder="Lab Komputasi Bergerak A-304"
      />

      <Field
        label="Catatan (opsional)"
        value={form.notes ?? ''}
        onChangeText={(value) =>
          update('notes', value)
        }
        placeholder="Catatan untuk sesi praktikum"
        multiline
      />

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color={colors.dangerDark}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={saving || classes.length === 0}
        onPress={handleSubmit}
        style={[
          styles.saveButton,
          (saving || classes.length === 0) &&
            styles.disabled,
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveText}>
            {session ? 'Simpan Perubahan' : 'Tambah Sesi'}
          </Text>
        )}
      </Pressable>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
    flex: 1,
    minWidth: 0,
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
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  classChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  classChoice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  classChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  classChoiceName: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  classChoiceNameActive: {
    color: colors.primaryDark,
  },
  classHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.dangerDark,
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  disabled: {
    opacity: 0.65,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default SessionFormModal;

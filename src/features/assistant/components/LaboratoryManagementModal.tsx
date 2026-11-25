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
import { getCurrentCoordinates } from '../../../services/locationService';
import {
  checkLocationPermission,
  openDeviceSettings,
} from '../../../services/permissionService';
import { colors, radius, spacing } from '../../../styles/theme';

import type {
  ApiResponse,
  CreateLaboratoryInput,
  Laboratory,
} from '../../../types/models';

type Props = {
  visible: boolean;
  laboratories: Laboratory[];
  onClose: () => void;
  onCreateLaboratory: (
    input: CreateLaboratoryInput
  ) => Promise<ApiResponse<Laboratory>>;
  onUpdateLaboratory: (
    laboratoryId: string,
    patch: Partial<CreateLaboratoryInput>
  ) => Promise<ApiResponse<void>>;
  onDeleteLaboratory: (
    laboratoryId: string
  ) => Promise<ApiResponse<void>>;
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?:
    | 'default'
    | 'numeric'
    | 'numbers-and-punctuation';
  multiline?: boolean;
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: FieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && styles.multiline]}
    />
  </View>
);

const LaboratoryManagementModal = ({
  visible,
  laboratories,
  onClose,
  onCreateLaboratory,
  onUpdateLaboratory,
  onDeleteLaboratory,
}: Props) => {
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('50');
  const [description, setDescription] = useState('');

  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [canOpenSettings, setCanOpenSettings] = useState(false);

  const selectedLab = useMemo(
    () => laboratories.find((item) => item.id === selectedLabId) ?? null,
    [laboratories, selectedLabId]
  );

  const resetFormState = () => {
    setSelectedLabId(null);
    setEditing(false);
    setName('');
    setLatitude('');
    setLongitude('');
    setRadiusMeters('50');
    setDescription('');
    setError('');
    setCanOpenSettings(false);
  };

  const handleClose = () => {
    if (busy || locating) return;
    resetFormState();
    onClose();
  };

  const startCreate = () => {
    setSelectedLabId(null);
    setName('');
    setLatitude('');
    setLongitude('');
    setRadiusMeters('50');
    setDescription('');
    setError('');
    setCanOpenSettings(false);
    setEditing(true);
  };

  const startEdit = (lab: Laboratory) => {
    setSelectedLabId(lab.id);
    setName(lab.name);
    setLatitude(String(lab.latitude));
    setLongitude(String(lab.longitude));
    setRadiusMeters(String(lab.radiusMeters));
    setDescription(lab.description ?? '');
    setError('');
    setCanOpenSettings(false);
    setEditing(true);
  };

  const handleUseCurrentLocation = async () => {
    if (locating || busy) return;

    setError('');
    setCanOpenSettings(false);
    setLocating(true);

    try {
      const coords = await getCurrentCoordinates();
      setLatitude(coords.latitude.toFixed(6));
      setLongitude(coords.longitude.toFixed(6));
    } catch (err) {
      const perm = await checkLocationPermission();
      setCanOpenSettings(Boolean(perm.shouldOpenSettings));
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Gagal mengambil lokasi perangkat saat ini.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (busy) return;

    setError('');
    setCanOpenSettings(false);

    const parsedLat = Number(latitude.replace(',', '.'));
    const parsedLng = Number(longitude.replace(',', '.'));
    const parsedRadius = Number(radiusMeters);

    if (!name.trim()) {
      setError('Nama laboratorium wajib diisi.');
      return;
    }

    if (
      !latitude.trim() ||
      !Number.isFinite(parsedLat) ||
      parsedLat < -90 ||
      parsedLat > 90
    ) {
      setError('Latitude harus berupa angka valid antara -90 sampai 90.');
      return;
    }

    if (
      !longitude.trim() ||
      !Number.isFinite(parsedLng) ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setError('Longitude harus berupa angka valid antara -180 sampai 180.');
      return;
    }

    if (
      !radiusMeters.trim() ||
      !Number.isFinite(parsedRadius) ||
      parsedRadius < 10 ||
      parsedRadius > 5000
    ) {
      setError('Radius presensi harus antara 10 sampai 5000 meter.');
      return;
    }

    setBusy(true);

    try {
      const payload: CreateLaboratoryInput = {
        name: name.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        radiusMeters: Math.round(parsedRadius),
        description: description.trim(),
      };

      const result = selectedLab
        ? await onUpdateLaboratory(selectedLab.id, payload)
        : await onCreateLaboratory(payload);

      if (result.ok) {
        setEditing(false);

        if ('data' in result && result.data) {
          setSelectedLabId(result.data.id);
        }
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (lab: Laboratory) => {
    Alert.alert(
      'Hapus Laboratorium?',
      `Laboratorium ${lab.name} akan dihapus dari daftar. Laboratorium yang masih dipakai sesi tidak dapat dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);

            try {
              const result = await onDeleteLaboratory(lab.id);
              if (result.ok) {
                setSelectedLabId(null);
                setEditing(false);
                setError('');
              } else {
                setError(result.message);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Kelola Lokasi Laboratorium"
      description="Atur titik koordinat dan radius presensi setiap lab sebagai acuan Maps dan validasi presensi."
      maxWidth={640}
    >
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>
          Daftar Laboratorium ({laboratories.length})
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={startCreate}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={16} color={colors.primaryText} />
          <Text style={styles.addBtnText}>Tambah Lab</Text>
        </Pressable>
      </View>

      {/* FORM */}
      {editing ? (
        <View style={styles.formBox}>
          <Text style={styles.formTitle}>
            {selectedLab ? `Ubah ${selectedLab.name}` : 'Tambah Laboratorium Baru'}
          </Text>

          <Field
            label="Nama Laboratorium *"
            value={name}
            onChangeText={setName}
            placeholder="Lab B (Gedung E Lantai 2)"
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleUseCurrentLocation}
            disabled={locating || busy}
            style={[
              styles.gpsBtn,
              (locating || busy) && styles.disabledBtn,
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="locate-outline" size={17} color={colors.accent} />
            )}
            <Text style={styles.gpsBtnText}>
              {locating ? 'Mengambil koordinat GPS...' : 'Gunakan Koordinat GPS Saat Ini'}
            </Text>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="Latitude *"
                value={latitude}
                onChangeText={setLatitude}
                placeholder="-6.973007"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.half}>
              <Field
                label="Longitude *"
                value={longitude}
                onChangeText={setLongitude}
                placeholder="107.630432"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Field
            label="Radius Presensi (meter) *"
            value={radiusMeters}
            onChangeText={setRadiusMeters}
            placeholder="50"
            keyboardType="numeric"
          />

          <Field
            label="Keterangan Lokasi (opsional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Gedung Informatika Lantai 3, Ruang A-304"
            multiline
          />

          <View style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditing(false);
                setError('');
                setCanOpenSettings(false);
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              disabled={busy}
              style={[styles.saveBtn, busy && styles.disabledBtn]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={styles.saveText}>Simpan Lab</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ERROR */}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          {canOpenSettings ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openDeviceSettings();
              }}
              style={styles.settingsLink}
            >
              <Text style={styles.settingsLinkText}>Buka Pengaturan</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* LAB LIST */}
      {laboratories.length === 0 && !editing ? (
        <EmptyState
          icon="location-outline"
          title="Belum ada laboratorium"
          message="Tambahkan laboratorium untuk menetapkan lokasi dan radius presensi mahasiswa."
        />
      ) : (
        laboratories.map((lab) => {
          const isSelected = selectedLab?.id === lab.id;

          return (
            <View
              key={lab.id}
              style={[styles.labItem, isSelected && styles.labItemSelected]}
            >
              <View style={styles.labInfo}>
                <View style={styles.labTitleRow}>
                  <Text style={styles.labName}>{lab.name}</Text>
                  <View style={styles.radiusPill}>
                    <Ionicons name="radio" size={11} color={colors.accent} />
                    <Text style={styles.radiusText}>{lab.radiusMeters} m</Text>
                  </View>
                </View>

                <Text style={styles.labCoords}>
                  {lab.latitude.toFixed(6)}, {lab.longitude.toFixed(6)}
                </Text>

                {lab.description ? (
                  <Text style={styles.labDesc}>{lab.description}</Text>
                ) : null}
              </View>

              <View style={styles.labActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ubah ${lab.name}`}
                  onPress={() => startEdit(lab)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="create-outline" size={17} color={colors.text} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus ${lab.name}`}
                  onPress={() => handleDelete(lab)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  addBtnText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  formBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  formTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: '#E2EDE3',
    borderWidth: 1,
    borderColor: '#C6DEC8',
    marginBottom: spacing.md,
  },
  gpsBtnText: {
    color: '#345E3B',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  settingsLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  settingsLinkText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  labItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  labItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  labInfo: {
    flex: 1,
    minWidth: 0,
  },
  labTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  labName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E2EDE3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  radiusText: {
    color: '#345E3B',
    fontSize: 11,
    fontWeight: '700',
  },
  labCoords: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  labDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  labActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default LaboratoryManagementModal;

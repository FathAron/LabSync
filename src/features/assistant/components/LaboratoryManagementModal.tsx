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

import {
  colors,
  radius,
  spacing,
} from '../../../styles/theme';

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
  const [selectedLabId, setSelectedLabId] = useState<
    string | null
  >(null);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('50');
  const [description, setDescription] = useState('');

  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [canOpenSettings, setCanOpenSettings] =
    useState(false);

  const selectedLab = useMemo(
    () =>
      laboratories.find(
        (item) => item.id === selectedLabId
      ) ?? null,
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
      setError(
        'Latitude harus berupa angka valid antara -90 sampai 90.'
      );
      return;
    }

    if (
      !longitude.trim() ||
      !Number.isFinite(parsedLng) ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setError(
        'Longitude harus berupa angka valid antara -180 sampai 180.'
      );
      return;
    }

    if (
      !radiusMeters.trim() ||
      !Number.isFinite(parsedRadius) ||
      parsedRadius < 10 ||
      parsedRadius > 5000
    ) {
      setError(
        'Radius presensi harus antara 10 sampai 5000 meter.'
      );
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
      description="Atur titik koordinat dan radius presensi setiap laboratorium sebagai acuan Maps dan validasi presensi."
    >
      {/* HEADER */}
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>
          Daftar Laboratorium ({laboratories.length})
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={startCreate}
          style={styles.addBtn}
        >
          <Ionicons
            name="add"
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.addBtnText}>
            Tambah Lab
          </Text>
        </Pressable>
      </View>

      {/* FORM */}
      {editing ? (
        <View style={styles.formBox}>
          <Text style={styles.formTitle}>
            {selectedLab
              ? `Ubah ${selectedLab.name}`
              : 'Tambah Laboratorium Baru'}
          </Text>

          <Field
            label="Nama Laboratorium *"
            value={name}
            onChangeText={setName}
            placeholder="Lab Dasar Komputasi"
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
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
            ) : (
              <Ionicons
                name="locate-outline"
                size={16}
                color={colors.primary}
              />
            )}

            <Text style={styles.gpsBtnText}>
              {locating
                ? 'Mengambil koordinat GPS...'
                : 'Gunakan Lokasi Perangkat Saat Ini'}
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
            placeholder="Gedung Informatika Lantai 2"
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
              style={[
                styles.saveBtn,
                busy && styles.disabledBtn,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.saveText}>
                  Simpan Lab
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ERROR */}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={colors.dangerDark}
          />
          <Text style={styles.errorText}>{error}</Text>

          {canOpenSettings ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openDeviceSettings();
              }}
              style={styles.settingsBtn}
            >
              <Text style={styles.settingsBtnText}>
                Pengaturan
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* LIST */}
      {laboratories.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Belum Ada Laboratorium"
          message="Tambahkan laboratorium pertama agar sesi praktikum dapat ditautkan ke koordinat dan radius presensi."
        />
      ) : (
        <View style={styles.list}>
          {laboratories.map((lab) => {
            const active = selectedLabId === lab.id;

            return (
              <Pressable
                key={lab.id}
                onPress={() =>
                  setSelectedLabId(active ? null : lab.id)
                }
                style={[
                  styles.card,
                  active && styles.cardActive,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {lab.name}
                    </Text>

                    {lab.description ? (
                      <Text style={styles.cardDesc}>
                        {lab.description}
                      </Text>
                    ) : null}

                    <Text style={styles.cardMeta}>
                      {lab.latitude.toFixed(6)},{' '}
                      {lab.longitude.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.radiusBadge}>
                    <Ionicons
                      name="radio-outline"
                      size={13}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.radiusText}>
                      {lab.radiusMeters} m
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => startEdit(lab)}
                    style={styles.iconAction}
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={styles.iconActionText}>
                      Ubah
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleDelete(lab)}
                    style={styles.iconActionDanger}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.danger}
                    />
                    <Text
                      style={styles.iconActionDangerText}
                    >
                      Hapus
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    fontSize: 14,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    minWidth: 110,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.65,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerDark,
  },
  settingsBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  radiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  iconActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  iconActionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerLight,
  },
  iconActionDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerDark,
  },
});

export default LaboratoryManagementModal;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
  theme,
} from '../../src/styles/theme';
import {
  STATUS_META,
  formatDateID,
  formatTimeRange,
} from '../../src/features/student/studentUtils';
import { usePracticum } from '../../src/hooks/usePracticum';
import { db } from '../../src/services/firebaseConfig';
import {
  MAX_ACCEPTABLE_ACCURACY_METERS,
  calculateDistanceMeters,
  getCurrentCoordinates,
  type Coordinates,
  type LaboratoryLocation,
} from '../../src/services/locationService';
import {
  checkLocationPermission,
  openDeviceSettings,
} from '../../src/services/permissionService';
import {
  fetchLaboratoryLocation,
  recordAttendance,
} from '../../src/services/practicumService';
import type { Session } from '../../src/types/models';

type LocationCheckState = 'idle' | 'checking' | 'ready' | 'error';

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0] ?? ''
    : params.sessionId ?? '';

  const { currentUser, showToast } = useApp();
  const { sessions, attendanceList, dataLoading, hasStudentAttended } =
    usePracticum();

  const [fallbackSession, setFallbackSession] = useState<Session | null>(null);
  const [laboratoryId, setLaboratoryId] = useState<string>('');
  const [laboratory, setLaboratory] = useState<LaboratoryLocation | null>(null);
  const [labLoading, setLabLoading] = useState<boolean>(false);
  const [labError, setLabError] = useState<string | null>(null);

  const [locationState, setLocationState] = useState<LocationCheckState>('idle');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState<string>(
    'Tekan tombol Perbarui Lokasi untuk memeriksa posisi perangkat Anda.'
  );
  const [shouldOpenSettings, setShouldOpenSettings] = useState<boolean>(false);

  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const session = useMemo(() => {
    const fromHook = sessions.find((item) => item.id === sessionId);
    return fromHook ?? fallbackSession;
  }, [fallbackSession, sessionId, sessions]);

  const alreadyAttended = useMemo(() => {
    if (!currentUser || !session) return false;
    return hasStudentAttended(session.id, currentUser.uid);
  }, [currentUser, hasStudentAttended, session]);

  const existingRecord = useMemo(() => {
    if (!currentUser || !session) return null;
    return (
      attendanceList.find(
        (item) =>
          item.sessionId === session.id && item.studentId === currentUser.uid
      ) ?? null
    );
  }, [attendanceList, currentUser, session]);

  // Ambil laboratoryId dari dokumen sesi Firestore dan muat data laboratorium terkait
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    const load = async () => {
      setLabLoading(true);
      try {
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        if (!active) return;

        if (!snap.exists()) {
          setLabError('Data sesi praktikum tidak ditemukan.');
          setLaboratory(null);
          setLaboratoryId('');
          setLabLoading(false);
          return;
        }

        const raw = snap.data() as Record<string, unknown>;
        if (!sessions.some((item) => item.id === sessionId)) {
          setFallbackSession({
            ...(raw as unknown as Session),
            id: snap.id,
          });
        }

        const rawLabId =
          typeof raw.laboratoryId === 'string' ? raw.laboratoryId.trim() : '';
        setLaboratoryId(rawLabId);

        if (!rawLabId) {
          setLaboratory(null);
          setLabError(
            'Laboratorium untuk sesi ini belum dikonfigurasi oleh asisten.'
          );
          setLabLoading(false);
          return;
        }

        const labRes = await fetchLaboratoryLocation(rawLabId);
        if (!active) return;

        if (labRes.ok && labRes.data) {
          setLaboratory(labRes.data);
          setLabError(null);
        } else {
          setLaboratory(null);
          setLabError(labRes.message);
        }
      } catch {
        if (!active) return;
        setLabError('Gagal memuat data sesi dan laboratorium. Periksa koneksi.');
      } finally {
        if (active) {
          setLabLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [sessionId, sessions]);

  const checkDeviceLocation = useCallback(async (): Promise<Coordinates | null> => {
    setLocationState('checking');
    setShouldOpenSettings(false);
    setLocationMessage('Memeriksa izin dan koordinat GPS perangkat...');

    try {
      const coords = await getCurrentCoordinates();
      setCoordinates(coords);
      setLocationState('ready');

      if (
        typeof coords.accuracy === 'number' &&
        coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
      ) {
        setLocationMessage(
          `Akurasi GPS masih rendah (±${Math.round(coords.accuracy)} m). Coba ke area lebih terbuka.`
        );
      } else {
        setLocationMessage('Koordinat GPS berhasil diperoleh.');
      }

      return coords;
    } catch (error) {
      const perm = await checkLocationPermission();
      setShouldOpenSettings(Boolean(perm.shouldOpenSettings));
      setCoordinates(null);
      setLocationState('error');
      setLocationMessage(
        error instanceof Error
          ? error.message
          : 'Lokasi perangkat gagal diperoleh.'
      );
      return null;
    }
  }, []);

  // Pemeriksaan awal otomatis saat halaman dibuka
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || alreadyAttended) return;
    let active = true;

    const autoCheck = async () => {
      try {
        const coords = await getCurrentCoordinates();
        if (!active) return;
        setCoordinates(coords);
        setLocationState('ready');
        setShouldOpenSettings(false);
        if (
          typeof coords.accuracy === 'number' &&
          coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
        ) {
          setLocationMessage(
            `Akurasi GPS masih rendah (±${Math.round(coords.accuracy)} m). Coba ke area lebih terbuka.`
          );
        } else {
          setLocationMessage('Koordinat GPS berhasil diperoleh.');
        }
      } catch (error) {
        if (!active) return;
        const perm = await checkLocationPermission();
        if (!active) return;
        setShouldOpenSettings(Boolean(perm.shouldOpenSettings));
        setCoordinates(null);
        setLocationState('error');
        setLocationMessage(
          error instanceof Error
            ? error.message
            : 'Lokasi perangkat gagal diperoleh.'
        );
      }
    };

    void autoCheck();
    return () => {
      active = false;
    };
  }, [alreadyAttended, session]);

  const distanceMeters = useMemo(() => {
    if (!coordinates || !laboratory) return null;
    return (
      Math.round(
        calculateDistanceMeters(coordinates, {
          latitude: laboratory.latitude,
          longitude: laboratory.longitude,
        }) * 10
      ) / 10
    );
  }, [coordinates, laboratory]);

  const accuracyTooLow =
    typeof coordinates?.accuracy === 'number' &&
    coordinates.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS;

  const isWithinRadius =
    distanceMeters !== null &&
    laboratory !== null &&
    distanceMeters <= laboratory.radiusMeters &&
    !accuracyTooLow;

  const handleOpenSettings = async () => {
    const res = await openDeviceSettings();
    if (!res.success) {
      showToast(res.message, 'warning');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!session || !currentUser || submitting) return;

    setSubmitResult(null);
    setSubmitting(true);

    try {
      const freshCoords = await checkDeviceLocation();
      if (!freshCoords) {
        setSubmitResult({
          ok: false,
          message:
            'Presensi dibatalkan karena lokasi perangkat belum berhasil diperoleh.',
        });
        return;
      }

      const res = await recordAttendance(
        session.id,
        notes,
        currentUser,
        freshCoords
      );

      setSubmitResult({
        ok: res.ok,
        message: res.message,
      });

      showToast(res.message, res.ok ? 'success' : 'error', res.ok);
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionId) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
        <Text style={styles.emptyTitle}>Sesi Tidak Dipilih</Text>
        <Text style={styles.emptySubtitle}>
          Pilih sesi praktikum terlebih dahulu dari daftar sesi.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/student')}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Kembali ke Daftar Sesi</Text>
        </Pressable>
      </View>
    );
  }

  if (dataLoading && !session) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat detail presensi sesi...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Sesi Tidak Ditemukan</Text>
        <Text style={styles.emptySubtitle}>
          Data sesi praktikum tidak tersedia atau sudah dihapus.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/student')}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Kembali ke Daftar Sesi</Text>
        </Pressable>
      </View>
    );
  }

  const statusMeta = STATUS_META[session.status] ?? STATUS_META.PENDING;
  const sessionActive = session.status === 'ACTIVE';
  const canAttemptAttendance =
    sessionActive &&
    !alreadyAttended &&
    Boolean(laboratory) &&
    isWithinRadius &&
    !submitting &&
    locationState !== 'checking';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Top Bar Navigation */}
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke daftar sesi"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-back" size={17} color={colors.mochaDark} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </Pressable>
            <Text style={styles.pageTitle}>Validasi & Presensi</Text>
          </View>

          {/* Session Detail Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.courseCode}>
                {session.courseCode} • {session.moduleCode}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusMeta.bg },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusMeta.dot },
                  ]}
                />
                <Text style={[styles.statusText, { color: statusMeta.fg }]}>
                  {statusMeta.label}
                </Text>
              </View>
            </View>

            <Text style={styles.courseName}>{session.courseName}</Text>
            <Text style={styles.moduleTitle}>{session.moduleTitle}</Text>

            <View style={styles.metaList}>
              <View style={styles.metaRow}>
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>Kelas {session.className}</Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {formatDateID(session.date)} •{' '}
                  {formatTimeRange(session.startTime, session.endTime)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {laboratory
                    ? `${laboratory.name} (Batas radius ${laboratory.radiusMeters} m)`
                    : session.room || 'Laboratorium belum diatur'}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  Asisten: {session.assistantName}
                </Text>
              </View>
            </View>
          </View>

          {/* Already Attended Banner */}
          {alreadyAttended ? (
            <View style={[styles.noticeCard, styles.noticeSuccess]}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success}
              />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeSuccessTitle}>
                  Presensi Berhasil Dicatat
                </Text>
                <Text style={styles.noticeSuccessDesc}>
                  {existingRecord?.attendedAt
                    ? `Anda tercatat hadir pada pukul ${existingRecord.attendedAt}.`
                    : 'Kehadiran Anda pada sesi ini sudah berhasil diverifikasi dan tersimpan.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/student/history')}
                  style={styles.inlineLinkBtn}
                >
                  <Text style={styles.inlineLinkText}>
                    Lihat Riwayat Presensi →
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : !sessionActive ? (
            <View style={[styles.noticeCard, styles.noticeWarning]}>
              <Ionicons
                name="time-outline"
                size={22}
                color={colors.butterCreamDark}
              />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeWarningTitle}>
                  {session.status === 'PENDING'
                    ? 'Sesi Belum Dibuka'
                    : 'Sesi Selesai'}
                </Text>
                <Text style={styles.noticeWarningDesc}>
                  {session.status === 'PENDING'
                    ? 'Presensi hanya dapat dilakukan setelah asisten membuka sesi praktikum.'
                    : 'Waktu presensi untuk sesi ini sudah ditutup oleh asisten.'}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Location Validation & GPS Check Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons
                      name="navigate-circle-outline"
                      size={20}
                      color={colors.mocha}
                    />
                    <Text style={styles.sectionTitle}>
                      Pemeriksaan Lokasi GPS
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={locationState === 'checking' || submitting}
                    onPress={() => void checkDeviceLocation()}
                    style={({ pressed }) => [
                      styles.refreshBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={14}
                      color={colors.mochaDark}
                    />
                    <Text style={styles.refreshBtnText}>Perbarui Koordinat</Text>
                  </Pressable>
                </View>

                {labLoading ? (
                  <View style={styles.statusBoxNeutral}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.statusBoxText}>
                      Memuat koordinat laboratorium...
                    </Text>
                  </View>
                ) : labError || !laboratoryId || !laboratory ? (
                  <View style={styles.statusBoxDanger}>
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={colors.dangerDark}
                    />
                    <Text style={styles.statusBoxTextDanger}>
                      {labError ||
                        'Laboratorium sesi belum dikonfigurasi. Presensi belum dapat divalidasi.'}
                    </Text>
                  </View>
                ) : locationState === 'checking' ? (
                  <View style={styles.statusBoxNeutral}>
                    <ActivityIndicator size="small" color={colors.mocha} />
                    <Text style={styles.statusBoxText}>{locationMessage}</Text>
                  </View>
                ) : locationState === 'error' ? (
                  <View style={styles.statusBoxDanger}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.dangerDark}
                    />
                    <View style={styles.flex1}>
                      <Text style={styles.statusBoxTextDanger}>
                        {locationMessage}
                      </Text>
                      {shouldOpenSettings ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleOpenSettings}
                          style={styles.settingsBtn}
                        >
                          <Text style={styles.settingsBtnText}>
                            Buka Pengaturan Perangkat
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : distanceMeters !== null ? (
                  <View
                    style={
                      isWithinRadius
                        ? styles.statusBoxSuccess
                        : styles.statusBoxWarning
                    }
                  >
                    <Ionicons
                      name={
                        isWithinRadius
                          ? 'checkmark-circle'
                          : 'alert-circle'
                      }
                      size={22}
                      color={
                        isWithinRadius
                          ? colors.successDark
                          : colors.butterCreamDark
                      }
                    />
                    <View style={styles.flex1}>
                      <Text
                        style={
                          isWithinRadius
                            ? styles.statusBoxTitleSuccess
                            : styles.statusBoxTitleWarning
                        }
                      >
                        {accuracyTooLow
                          ? 'Akurasi GPS Belum Memadai'
                          : isWithinRadius
                          ? 'Berada Dalam Radius Laboratorium'
                          : 'Di Luar Radius Laboratorium'}
                      </Text>

                      <Text
                        style={
                          isWithinRadius
                            ? styles.statusBoxTextSuccess
                            : styles.statusBoxTextWarning
                        }
                      >
                        Jarak Anda: {Math.round(distanceMeters)} m (Batas:{' '}
                        {laboratory.radiusMeters} m)
                        {typeof coordinates?.accuracy === 'number'
                          ? ` • Akurasi ±${Math.round(coordinates.accuracy)} m`
                          : ''}
                      </Text>

                      {!isWithinRadius && distanceMeters > laboratory.radiusMeters ? (
                        <Text style={styles.distanceAdvice}>
                          Mendekatlah sekitar{' '}
                          {Math.round(distanceMeters - laboratory.radiusMeters)} m
                          lagi agar presensi dapat diterima.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View style={styles.statusBoxNeutral}>
                    <Ionicons
                      name="navigate-outline"
                      size={18}
                      color={colors.textMuted}
                    />
                    <Text style={styles.statusBoxText}>{locationMessage}</Text>
                  </View>
                )}

                {/* Notes Input */}
                <View style={styles.notesGroup}>
                  <Text style={styles.label}>
                    Posisi / Catatan Meja (Opsional)
                  </Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Contoh: Meja C-12 atau Hadir tepat waktu"
                    placeholderTextColor={colors.textMuted}
                    maxLength={30}
                    value={notes}
                    onChangeText={setNotes}
                    editable={!submitting}
                  />
                  <Text style={styles.inputHint}>Maksimal 30 karakter.</Text>
                </View>

                {submitResult ? (
                  <View
                    style={[
                      styles.resultBanner,
                      submitResult.ok
                        ? styles.statusBoxSuccess
                        : styles.statusBoxDanger,
                    ]}
                  >
                    <Ionicons
                      name={
                        submitResult.ok ? 'checkmark-circle' : 'alert-circle'
                      }
                      size={18}
                      color={
                        submitResult.ok ? colors.successDark : colors.dangerDark
                      }
                    />
                    <Text
                      style={
                        submitResult.ok
                          ? styles.statusBoxTextSuccess
                          : styles.statusBoxTextDanger
                      }
                    >
                      {submitResult.message}
                    </Text>
                  </View>
                ) : null}

                {/* Primary Action Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Catat Presensi Sekarang"
                  disabled={!canAttemptAttendance}
                  onPress={handleSubmitAttendance}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    !canAttemptAttendance && styles.submitBtnDisabled,
                    pressed && canAttemptAttendance && styles.submitBtnPressed,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="finger-print-outline"
                        size={19}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitBtnText}>
                        {canAttemptAttendance
                          ? 'Validasi & Catat Presensi'
                          : !isWithinRadius && distanceMeters !== null
                          ? 'Di Luar Radius Lab'
                          : 'Validasi Lokasi Diperlukan'}
                      </Text>
                    </>
                  )}
                </Pressable>

                {!isWithinRadius && sessionActive && !alreadyAttended ? (
                  <Text style={styles.subtextWarning}>
                    Presensi hanya dapat dicatat jika posisi Anda terdeteksi di
                    dalam radius laboratorium yang ditentukan.
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  container: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  backBtnText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  courseName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
    lineHeight: 24,
  },
  moduleTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaList: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  noticeSuccess: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
  },
  noticeWarning: {
    backgroundColor: colors.butterCreamSoft,
    borderColor: colors.butterCream,
  },
  noticeBody: {
    flex: 1,
  },
  noticeSuccessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.successDark,
  },
  noticeSuccessDesc: {
    fontSize: 12,
    color: colors.successDark,
    marginTop: 2,
    lineHeight: 18,
  },
  noticeWarningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  noticeWarningDesc: {
    fontSize: 12,
    color: colors.butterCreamDark,
    marginTop: 2,
    lineHeight: 18,
  },
  inlineLinkBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.successDark,
    textDecorationLine: 'underline',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  statusBoxNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  statusBoxText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  statusBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: colors.sage,
    marginBottom: spacing.md,
  },
  statusBoxTitleSuccess: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.successDark,
  },
  statusBoxTextSuccess: {
    fontSize: 12,
    color: colors.successDark,
    marginTop: 2,
    lineHeight: 17,
  },
  statusBoxWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
    marginBottom: spacing.md,
  },
  statusBoxTitleWarning: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  statusBoxTextWarning: {
    fontSize: 12,
    color: colors.butterCreamDark,
    marginTop: 2,
    lineHeight: 17,
  },
  distanceAdvice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningDark,
    marginTop: 4,
  },
  statusBoxDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.md,
  },
  statusBoxTextDanger: {
    fontSize: 12,
    color: colors.dangerDark,
    lineHeight: 17,
  },
  settingsBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  notesGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
    marginBottom: spacing.xs,
  },
  notesInput: {
    minHeight: 44,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.mochaDark,
  },
  inputHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...theme.shadows.button,
  },
  submitBtnPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.9,
  },
  submitBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtextWarning: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});

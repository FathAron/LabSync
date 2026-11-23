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

type LocationCheckState =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'error';

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
    'Tekan tombol di bawah untuk memeriksa lokasi perangkat Anda.'
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

  // Ambil laboratoryId dari dokumen sesi Firestore dan muat data laboratorium terkait.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    const load = async () => {
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
          `Akurasi GPS masih rendah (${Math.round(coords.accuracy)} m). Coba lagi di area lebih terbuka.`
        );
      } else {
        setLocationMessage('Koordinat perangkat berhasil diperoleh.');
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
            `Akurasi GPS masih rendah (${Math.round(coords.accuracy)} m). Coba lagi di area lebih terbuka.`
          );
        } else {
          setLocationMessage('Koordinat perangkat berhasil diperoleh.');
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
          {/* Top Bar */}
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke daftar sesi"
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </Pressable>
            <Text style={styles.pageTitle}>Presensi Praktikum</Text>
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
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>Kelas {session.className}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
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
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {laboratory
                    ? `${laboratory.name} (Radius maks. ${laboratory.radiusMeters} m)`
                    : session.room || 'Laboratorium belum diatur'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons
                  name="person-outline"
                  size={16}
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
                size={22}
                color={colors.successDark}
              />
              <View style={styles.noticeBody}>
                <Text style={[styles.noticeTitle, { color: colors.successDark }]}>
                  Presensi Sudah Tercatat
                </Text>
                <Text style={[styles.noticeDesc, { color: colors.successDark }]}>
                  {existingRecord?.attendedAt
                    ? `Anda tercatat hadir pada ${existingRecord.attendedAt}.`
                    : 'Kehadiran Anda pada sesi ini sudah tersimpan di Firestore.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/student/history')}
                  style={styles.inlineLinkBtn}
                >
                  <Text
                    style={[styles.inlineLinkText, { color: colors.successDark }]}
                  >
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
                color={colors.warningDark}
              />
              <View style={styles.noticeBody}>
                <Text style={[styles.noticeTitle, { color: colors.warningDark }]}>
                  {session.status === 'PENDING'
                    ? 'Sesi Belum Dibuka'
                    : 'Sesi Sudah Ditutup'}
                </Text>
                <Text style={[styles.noticeDesc, { color: colors.warningDark }]}>
                  {session.status === 'PENDING'
                    ? 'Presensi hanya dapat dilakukan setelah asisten membuka sesi praktikum.'
                    : 'Waktu presensi untuk sesi ini sudah berakhir.'}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Location Validation Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sectionTitle}>Validasi Lokasi Lab</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={locationState === 'checking' || submitting}
                    onPress={() => void checkDeviceLocation()}
                    style={styles.refreshBtn}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={styles.refreshBtnText}>Perbarui Lokasi</Text>
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
                        'Laboratorium sesi belum dikonfigurasi. Presensi belum dapat dilakukan.'}
                    </Text>
                  </View>
                ) : locationState === 'checking' ? (
                  <View style={styles.statusBoxNeutral}>
                    <ActivityIndicator size="small" color={colors.primary} />
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
                        : styles.statusBoxDanger
                    }
                  >
                    <Ionicons
                      name={
                        isWithinRadius
                          ? 'checkmark-circle'
                          : 'close-circle'
                      }
                      size={20}
                      color={
                        isWithinRadius ? colors.successDark : colors.dangerDark
                      }
                    />
                    <View style={styles.flex1}>
                      <Text
                        style={
                          isWithinRadius
                            ? styles.statusBoxTitleSuccess
                            : styles.statusBoxTitleDanger
                        }
                      >
                        {accuracyTooLow
                          ? 'Akurasi GPS Belum Memadai'
                          : isWithinRadius
                          ? 'Berada Dalam Radius Laboratorium'
                          : 'Berada Di Luar Radius Laboratorium'}
                      </Text>
                      <Text
                        style={
                          isWithinRadius
                            ? styles.statusBoxTextSuccess
                            : styles.statusBoxTextDanger
                        }
                      >
                        Jarak ke {laboratory.name}: {Math.round(distanceMeters)} m
                        {' '}(batas {laboratory.radiusMeters} m)
                        {typeof coordinates?.accuracy === 'number'
                          ? ` • Akurasi ±${Math.round(coordinates.accuracy)} m`
                          : ''}
                      </Text>
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
                  <Text style={styles.label}>Catatan (Opsional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Contoh: Hadir tepat waktu (maks. 30 karakter)"
                    placeholderTextColor={colors.textMuted}
                    maxLength={30}
                    value={notes}
                    onChangeText={setNotes}
                    editable={!submitting}
                  />
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

                <Pressable
                  accessibilityRole="button"
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
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitBtnText}>
                        Catat Presensi Sekarang
                      </Text>
                    </>
                  )}
                </Pressable>
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
    paddingBottom: spacing.xl * 2,
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
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  courseName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  moduleTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metaList: {
    marginTop: spacing.md,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  noticeSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  noticeWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  noticeBody: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  noticeDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  inlineLinkBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  inlineLinkText: {
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  refreshBtnText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statusBoxNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusBoxText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusBoxDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusBoxTitleSuccess: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.successDark,
  },
  statusBoxTitleDanger: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dangerDark,
  },
  statusBoxTextSuccess: {
    flex: 1,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.successDark,
  },
  statusBoxTextDanger: {
    flex: 1,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerDark,
  },
  settingsBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  settingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  notesGroup: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  resultBanner: {
    marginTop: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});

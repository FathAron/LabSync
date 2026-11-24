import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import type {
  WebView as WebViewType,
  WebViewMessageEvent,
  WebViewProps,
} from 'react-native-webview';

import EmptyState from '../../../components/EmptyState';

import { useApp } from '../../../context/AppContext';
import { useLaboratories } from '../../../hooks/useLaboratories';

import {
  db,
  isFirebaseConfigured,
} from '../../../services/firebaseConfig';
import {
  calculateDistanceMeters,
  watchUserLocation,
  type Coordinates,
} from '../../../services/locationService';
import {
  checkLocationPermission,
  getLocationErrorMessage,
  openDeviceSettings,
} from '../../../services/permissionService';
import { normalizePracticumSnapshot } from '../../../services/practicumService';

import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
} from '../../../styles/theme';

import {
  STATUS_META,
  formatDateID,
  formatTimeRange,
} from '../../student/studentUtils';

import type {
  Laboratory,
  Session,
} from '../../../types/models';

import {
  formatDistanceMeters,
  getLaboratoryActivitySummary,
} from '../labActivityUtils';
import { buildOsmMapHtml } from '../osmMapHtml';

type WebViewComponent = React.ComponentType<
  WebViewProps & { ref?: React.Ref<WebViewType> }
>;

const loadWebViewComponent = (): WebViewComponent | null => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webview') as {
      WebView?: WebViewComponent;
      default?: WebViewComponent;
    };
    return mod?.WebView ?? mod?.default ?? null;
  } catch {
    return null;
  }
};

const NativeWebView = loadWebViewComponent();

type Props = {
  active?: boolean;
};

const DEFAULT_COORDS = {
  latitude: -6.973007,
  longitude: 107.630432,
};

const LaboratoryMapsView = ({ active = true }: Props) => {
  const { currentUser, reportError } = useApp();
  const { laboratories, loading: labsLoading } =
    useLaboratories();

  const webViewRef = useRef<WebViewType | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] =
    useState(true);

  const [selectedLabId, setSelectedLabId] = useState<
    string | null
  >(null);

  const [userCoords, setUserCoords] =
    useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<
    string | null
  >(null);
  const [canOpenSettings, setCanOpenSettings] =
    useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);
  const [retryToken, setRetryToken] = useState(0);

  // ==========================================
  // REAL-TIME SESSIONS FOR LAB ACTIVITY (SRS-05)
  // ==========================================

  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        const items = snapshot.docs.map((item) =>
          normalizePracticumSnapshot.normalizeSession(
            item.data(),
            item.id
          )
        );
        setSessions(items);
        setSessionsLoading(false);
      },
      (error) => {
        setSessionsLoading(false);
        reportError(
          'firestore',
          error.message ||
            'Gagal memuat jadwal aktivitas laboratorium.'
        );
      }
    );

    return unsubscribe;
  }, [currentUser, reportError]);

  // ==========================================
  // USER LOCATION WATCHER (SRS-04)
  // ==========================================

  useEffect(() => {
    if (!active || Platform.OS === 'web') {
      return undefined;
    }

    let cancelled = false;
    let stopWatching: (() => void) | null = null;

    const startWatching = async () => {
      setLocationLoading(true);
      setLocationError(null);
      setCanOpenSettings(false);

      try {
        const stop = await watchUserLocation(
          (coords) => {
            if (cancelled) return;
            setUserCoords(coords);
            setLocationError(null);
            setCanOpenSettings(false);
            setLocationLoading(false);
          },
          async (message) => {
            if (cancelled) return;
            const perm = await checkLocationPermission();
            if (cancelled) return;
            setCanOpenSettings(
              Boolean(perm.shouldOpenSettings)
            );
            setLocationError(message);
            setLocationLoading(false);
          }
        );

        if (cancelled) {
          stop();
        } else {
          stopWatching = stop;
          setLocationLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        const perm = await checkLocationPermission();
        if (cancelled) return;

        setCanOpenSettings(
          Boolean(perm.shouldOpenSettings)
        );
        setLocationError(getLocationErrorMessage(error));
        setLocationLoading(false);
      }
    };

    void startWatching();

    return () => {
      cancelled = true;
      stopWatching?.();
    };
  }, [active, retryToken]);

  // ==========================================
  // SELECTED LABORATORY & ACTIVITY SUMMARY
  // ==========================================

  const selectedLab: Laboratory | null = useMemo(() => {
    if (laboratories.length === 0) return null;

    return (
      laboratories.find(
        (lab) => lab.id === selectedLabId
      ) ?? laboratories[0]
    );
  }, [laboratories, selectedLabId]);

  const activitySummary = useMemo(() => {
    if (!selectedLab) return null;
    return getLaboratoryActivitySummary(
      selectedLab,
      sessions
    );
  }, [selectedLab, sessions]);

  const distanceToSelectedLab = useMemo(() => {
    if (!selectedLab || !userCoords) return null;

    return calculateDistanceMeters(userCoords, {
      latitude: selectedLab.latitude,
      longitude: selectedLab.longitude,
    });
  }, [selectedLab, userCoords]);

  const initialCenter = useMemo(() => {
    if (laboratories.length > 0) {
      return {
        latitude: laboratories[0].latitude,
        longitude: laboratories[0].longitude,
      };
    }

    return DEFAULT_COORDS;
  }, [laboratories]);

  const mapHtml = useMemo(
    () =>
      buildOsmMapHtml(
        initialCenter.latitude,
        initialCenter.longitude
      ),
    [initialCenter.latitude, initialCenter.longitude]
  );

  // Sinkronkan marker lab & posisi pengguna ke Leaflet WebView
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;

    const stateJson = JSON.stringify({
      laboratories,
      selectedLabId: selectedLab?.id ?? null,
      userCoords,
    });

    webViewRef.current.injectJavaScript(
      `window.updateMapState && window.updateMapState(${stateJson}); true;`
    );
  }, [mapReady, laboratories, selectedLab?.id, userCoords]);

  const focusPoint = useCallback(
    (latitude: number, longitude: number) => {
      if (!mapReady || !webViewRef.current) return;

      webViewRef.current.injectJavaScript(
        `window.focusMapPoint && window.focusMapPoint(${latitude}, ${longitude}, 17); true;`
      );
    },
    [mapReady]
  );

  const handleSelectLab = (lab: Laboratory) => {
    setSelectedLabId(lab.id);
    focusPoint(lab.latitude, lab.longitude);
  };

  const handleFocusUser = () => {
    if (!userCoords) {
      setRetryToken((prev) => prev + 1);
      return;
    }

    focusPoint(userCoords.latitude, userCoords.longitude);
  };

  const handleWebViewMessage = (
    event: WebViewMessageEvent
  ) => {
    try {
      const payload = JSON.parse(
        event.nativeEvent.data
      ) as { type?: string; labId?: string };

      if (
        payload.type === 'SELECT_LAB' &&
        typeof payload.labId === 'string'
      ) {
        setSelectedLabId(payload.labId);
      }
    } catch {
      // Abaikan pesan yang tidak dikenal.
    }
  };

  // ==========================================
  // LOADING / EMPTY STATES
  // ==========================================

  if (labsLoading && laboratories.length === 0) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
        <Text style={styles.loadingText}>
          Memuat peta dan data laboratorium...
        </Text>
      </View>
    );
  }

  if (laboratories.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="map-outline"
          title="Belum Ada Data Laboratorium"
          message="Asisten belum menambahkan lokasi laboratorium. Data laboratorium akan tampil di peta setelah ditambahkan."
        />
      </View>
    );
  }

  const renderSessionRow = (
    title: string,
    session: Session | null,
    emptyText: string
  ) => {
    if (!session) {
      return (
        <View style={styles.activityBox}>
          <Text style={styles.activityLabel}>{title}</Text>
          <Text style={styles.activityEmpty}>
            {emptyText}
          </Text>
        </View>
      );
    }

    const meta = STATUS_META[session.status];
    const dateLabel =
      formatDateID(session.date) ?? session.date;
    const timeLabel =
      formatTimeRange(
        session.startTime,
        session.endTime
      ) ?? session.time;

    return (
      <View style={styles.activityBox}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityLabel}>{title}</Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: meta.bg },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: meta.dot },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: meta.fg },
              ]}
            >
              {meta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.courseTitle}>
          {session.courseName} ({session.moduleCode})
        </Text>

        <Text style={styles.sessionMeta}>
          Kelas {session.className} • {dateLabel} •{' '}
          {timeLabel}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* LOCATION STATUS BANNER */}
        {locationError ? (
          <View style={styles.warningBanner}>
            <Ionicons
              name="warning-outline"
              size={17}
              color={colors.warningDark}
            />
            <Text style={styles.warningText}>
              {locationError}
            </Text>
            <View style={styles.warningActions}>
              {canOpenSettings ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void openDeviceSettings();
                  }}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryBtnText}>
                    Pengaturan
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setRetryToken((prev) => prev + 1)
                }
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>
                  Coba Lagi
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* LAB CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {laboratories.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;

            return (
              <Pressable
                key={lab.id}
                accessibilityRole="button"
                onPress={() => handleSelectLab(lab)}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={
                    isSelected
                      ? '#FFFFFF'
                      : colors.primaryDark
                  }
                />
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {lab.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* OSM MAP VIEW */}
        <View style={styles.mapCard}>
          {!NativeWebView ? (
            <View style={styles.webFallback}>
              <Ionicons
                name="map-outline"
                size={36}
                color={colors.primary}
              />
              <Text style={styles.webFallbackTitle}>
                {Platform.OS === 'web'
                  ? 'Peta Interaktif Tersedia di Android / iOS'
                  : 'Modul WebView Belum Tersedia di Build Ini'}
              </Text>
              <Text style={styles.webFallbackDesc}>
                {Platform.OS === 'web'
                  ? 'Pilih laboratorium di atas untuk melihat detail koordinat, radius, dan aktivitas praktikum.'
                  : 'Rebuild development build agar peta OpenStreetMap dapat tampil. Daftar lab dan aktivitas tetap tersedia di bawah.'}
              </Text>
            </View>
          ) : (
            <>
              <NativeWebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.map}
                javaScriptEnabled
                domStorageEnabled
                onLoadEnd={() => setMapReady(true)}
                onMessage={handleWebViewMessage}
              />

              <Pressable
                accessibilityRole="button"
                onPress={handleFocusUser}
                style={styles.myLocationFab}
              >
                {locationLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                ) : (
                  <Ionicons
                    name="locate"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* SELECTED LABORATORY DETAIL & ACTIVITY (SRS-05) */}
        {activitySummary ? (
          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleWrap}>
                  <Text style={styles.detailTitle}>
                    {activitySummary.laboratory.name}
                  </Text>

                  {activitySummary.laboratory.description ? (
                    <Text style={styles.detailDesc}>
                      {
                        activitySummary.laboratory
                          .description
                      }
                    </Text>
                  ) : null}
                </View>

                <View style={styles.radiusPill}>
                  <Ionicons
                    name="radio-outline"
                    size={13}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.radiusPillText}>
                    Radius{' '}
                    {
                      activitySummary.laboratory
                        .radiusMeters
                    }{' '}
                    m
                  </Text>
                </View>
              </View>

              <View style={styles.coordsRow}>
                <Text style={styles.coordsText}>
                  {activitySummary.laboratory.latitude.toFixed(
                    5
                  )}
                  ,{' '}
                  {activitySummary.laboratory.longitude.toFixed(
                    5
                  )}
                </Text>

                {distanceToSelectedLab !== null ? (
                  <Text style={styles.distanceText}>
                    Jarak Anda:{' '}
                    {formatDistanceMeters(
                      distanceToSelectedLab
                    )}
                  </Text>
                ) : (
                  <Text style={styles.distanceMuted}>
                    Lokasi Anda belum tersedia
                  </Text>
                )}
              </View>

              {sessionsLoading ? (
                <View style={styles.sessionsLoading}>
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                  <Text style={styles.sessionsLoadingText}>
                    Memuat aktivitas praktikum...
                  </Text>
                </View>
              ) : (
                <View style={styles.activitiesWrap}>
                  {renderSessionRow(
                    'Sedang Berlangsung',
                    activitySummary.ongoingSession,
                    'Tidak ada praktikum yang sedang berlangsung saat ini.'
                  )}

                  {renderSessionRow(
                    'Praktikum Berikutnya',
                    activitySummary.nextSession,
                    'Belum ada jadwal praktikum berikutnya di laboratorium ini.'
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningDark,
  },
  warningActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningDark,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  mapCard: {
    height: 260,
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: spacing.sm,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  myLocationFab: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  webFallbackTitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  webFallbackDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailTitleWrap: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailDesc: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successDark,
  },
  distanceMuted: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sessionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  sessionsLoadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  activitiesWrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  activityBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sessionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activityEmpty: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default LaboratoryMapsView;

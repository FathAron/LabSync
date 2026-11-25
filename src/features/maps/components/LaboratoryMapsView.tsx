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
  TextInput,
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
import { db, isFirebaseConfigured } from '../../../services/firebaseConfig';
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
import { formatDisplayClass } from '../../../utils/classUtils';
import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
  theme,
} from '../../../styles/theme';
import {
  STATUS_META,
  formatDateID,
  formatTimeRange,
} from '../../student/studentUtils';
import type { Laboratory, Session } from '../../../types/models';
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

type LabFilterMode = 'all' | 'active' | 'available';

const LaboratoryMapsView = ({ active = true }: Props) => {
  const { currentUser, reportError } = useApp();
  const { laboratories, loading: labsLoading } = useLaboratories();

  const webViewRef = useRef<WebViewType | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<LabFilterMode>('all');

  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  // ==========================================
  // REAL-TIME SESSIONS FOR LAB ACTIVITY
  // ==========================================

  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        const items = snapshot.docs.map((item) =>
          normalizePracticumSnapshot.normalizeSession(item.data(), item.id)
        );
        setSessions(items);
        setSessionsLoading(false);
      },
      (error) => {
        setSessionsLoading(false);
        reportError(
          'firestore',
          error.message || 'Gagal memuat jadwal aktivitas laboratorium.'
        );
      }
    );

    return unsubscribe;
  }, [currentUser, reportError]);

  // ==========================================
  // USER LOCATION WATCHER
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
            setCanOpenSettings(Boolean(perm.shouldOpenSettings));
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

        setCanOpenSettings(Boolean(perm.shouldOpenSettings));
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
  // FILTERED LABORATORIES
  // ==========================================

  const filteredLaboratories = useMemo(() => {
    let list = laboratories;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (lab) =>
          lab.name.toLowerCase().includes(q) ||
          (lab.description && lab.description.toLowerCase().includes(q))
      );
    }

    if (filterMode === 'active') {
      list = list.filter((lab) => {
        const summary = getLaboratoryActivitySummary(lab, sessions);
        return summary.ongoingSession !== null;
      });
    } else if (filterMode === 'available') {
      list = list.filter((lab) => {
        const summary = getLaboratoryActivitySummary(lab, sessions);
        return summary.ongoingSession === null;
      });
    }

    return list;
  }, [laboratories, searchQuery, filterMode, sessions]);

  // Selected Laboratory
  const selectedLab: Laboratory | null = useMemo(() => {
    if (laboratories.length === 0) return null;

    return (
      laboratories.find((lab) => lab.id === selectedLabId) ??
      filteredLaboratories[0] ??
      laboratories[0]
    );
  }, [laboratories, selectedLabId, filteredLaboratories]);

  const activitySummary = useMemo(() => {
    if (!selectedLab) return null;
    return getLaboratoryActivitySummary(selectedLab, sessions);
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
    () => buildOsmMapHtml(initialCenter.latitude, initialCenter.longitude),
    [initialCenter.latitude, initialCenter.longitude]
  );

  // Sync state to Leaflet map in WebView
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

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        labId?: string;
      };

      if (payload.type === 'SELECT_LAB' && typeof payload.labId === 'string') {
        setSelectedLabId(payload.labId);
      }
    } catch {
      // Ignore
    }
  };

  const activeLabsCount = useMemo(() => {
    return laboratories.filter((lab) => {
      const summary = getLaboratoryActivitySummary(lab, sessions);
      return summary.ongoingSession !== null;
    }).length;
  }, [laboratories, sessions]);

  // ==========================================
  // LOADING / EMPTY STATES
  // ==========================================

  if (labsLoading && laboratories.length === 0) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          title="Belum Ada Titik Laboratorium"
          message="Lokasi laboratorium belum ditambahkan oleh asisten. Peta akan menampilkan posisi lab setelah didaftarkan."
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
          <Text style={styles.activityEmpty}>{emptyText}</Text>
        </View>
      );
    }

    const meta = STATUS_META[session.status];
    const dateLabel = formatDateID(session.date) ?? session.date;
    const timeLabel =
      formatTimeRange(session.startTime, session.endTime) ?? session.time;

    return (
      <View style={styles.activityBox}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityLabel}>{title}</Text>

          <View
            style={[styles.statusBadge, { backgroundColor: meta.bg }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: meta.dot }]}
            />
            <Text style={[styles.statusText, { color: meta.fg }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.courseTitle}>
          {session.courseName} ({session.moduleCode})
        </Text>

        <Text style={styles.sessionMeta}>
          {formatDisplayClass(session.className)} • {dateLabel} • {timeLabel}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* Top Header Information Bar */}
        <View style={styles.topInfoBar}>
          <View>
            <Text style={styles.topInfoTitle}>Peta Interaktif Lab</Text>
            <Text style={styles.topInfoSubtitle}>
              {laboratories.length} Ruang Lab Terdaftar • {activeLabsCount} Aktif
            </Text>
          </View>

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>GPS Aktif</Text>
          </View>
        </View>

        {/* Location Error Warning Banner */}
        {locationError ? (
          <View style={styles.warningBanner}>
            <Ionicons
              name="warning-outline"
              size={16}
              color={colors.butterCreamDark}
            />
            <Text style={styles.warningText} numberOfLines={2}>
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
                  <Text style={styles.retryBtnText}>Pengaturan</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => setRetryToken((prev) => prev + 1)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Coba Lagi</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Search Bar & Quick Filters */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari ruang lab atau gedung..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Quick Filter Mode Chips */}
        <View style={styles.filterModesRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilterMode('all')}
            style={[styles.filterModeChip, filterMode === 'all' && styles.filterModeChipActive]}
          >
            <Text style={[styles.filterModeText, filterMode === 'all' && styles.filterModeTextActive]}>
              Semua ({laboratories.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setFilterMode('active')}
            style={[styles.filterModeChip, filterMode === 'active' && styles.filterModeChipActive]}
          >
            <Text style={[styles.filterModeText, filterMode === 'active' && styles.filterModeTextActive]}>
              Ada Sesi ({activeLabsCount})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setFilterMode('available')}
            style={[styles.filterModeChip, filterMode === 'available' && styles.filterModeChipActive]}
          >
            <Text style={[styles.filterModeText, filterMode === 'available' && styles.filterModeTextActive]}>
              Lab Kosong
            </Text>
          </Pressable>
        </View>

        {/* Lab Chips Horizontal List */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {filteredLaboratories.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;

            return (
              <Pressable
                key={lab.id}
                accessibilityRole="button"
                onPress={() => handleSelectLab(lab)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={isSelected ? colors.sand : colors.mocha}
                />
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextActive]}
                >
                  {lab.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Interactive Map View */}
        <View style={styles.mapCard}>
          {!NativeWebView ? (
            <View style={styles.webFallback}>
              <Ionicons name="map-outline" size={36} color={colors.mocha} />
              <Text style={styles.webFallbackTitle}>
                {Platform.OS === 'web'
                  ? 'Peta Interaktif Terbuka di Android / iOS'
                  : 'Modul WebView Belum Tersedia'}
              </Text>
              <Text style={styles.webFallbackDesc}>
                Pilih laboratorium pada daftar untuk melihat detail koordinat,
                radius, dan aktivitas praktikum di bawah.
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
                accessibilityLabel="Fokus ke lokasi saya"
                onPress={handleFocusUser}
                style={styles.myLocationFab}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={colors.mocha} />
                ) : (
                  <Ionicons name="locate" size={20} color={colors.mocha} />
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* Selected Laboratory Detail & Activity Bottom Sheet */}
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
                      {activitySummary.laboratory.description}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.radiusPill}>
                  <Ionicons
                    name="radio-outline"
                    size={12}
                    color={colors.sageDark}
                  />
                  <Text style={styles.radiusPillText}>
                    Radius {activitySummary.laboratory.radiusMeters} m
                  </Text>
                </View>
              </View>

              <View style={styles.coordsRow}>
                <Text style={styles.coordsText}>
                  {activitySummary.laboratory.latitude.toFixed(5)},{' '}
                  {activitySummary.laboratory.longitude.toFixed(5)}
                </Text>

                {distanceToSelectedLab !== null ? (
                  <Text style={styles.distanceText}>
                    Jarak Anda: {formatDistanceMeters(distanceToSelectedLab)}
                  </Text>
                ) : (
                  <Text style={styles.distanceMuted}>
                    Lokasi Anda belum tersedia
                  </Text>
                )}
              </View>

              {sessionsLoading ? (
                <View style={styles.sessionsLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.sessionsLoadingText}>
                    Memuat aktivitas praktikum...
                  </Text>
                </View>
              ) : (
                <View style={styles.activitiesWrap}>
                  {renderSessionRow(
                    'Sedang Berlangsung',
                    activitySummary.ongoingSession,
                    'Tidak ada praktikum yang sedang berlangsung di lab ini.'
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  topInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  topInfoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  topInfoSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successDark,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: colors.butterCreamDark,
  },
  warningActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.butterCream,
  },
  retryBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.butterCreamDark,
  },
  searchRow: {
    marginBottom: spacing.xs + 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.mochaDark,
    paddingVertical: 8,
  },
  filterModesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  filterModeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterModeChipActive: {
    backgroundColor: colors.mocha,
    borderColor: colors.mocha,
  },
  filterModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterModeTextActive: {
    color: '#FFFFFF',
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.xs + 2,
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
    backgroundColor: colors.mocha,
    borderColor: colors.mochaDark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  chipTextActive: {
    color: colors.sand,
  },
  mapCard: {
    height: 240,
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    marginBottom: spacing.sm,
    ...theme.shadows.card,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  myLocationFab: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  webFallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mochaDark,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  webFallbackDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 320,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingBottom: spacing.xl,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitleWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  detailDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sageDark,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  coordsText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sageDark,
  },
  distanceMuted: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sessionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sessionsLoadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activitiesWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  activityBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    color: colors.mochaDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityEmpty: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  sessionMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default LaboratoryMapsView;

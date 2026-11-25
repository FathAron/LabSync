import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useApp } from '../../../context/AppContext';
import { uploadLeaveAttachment, deleteLeaveAttachmentFile } from '../../../services/storageService';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import type {
  ApiResponse,
  LeaveAttachmentMeta,
  LeaveRequest,
  Session,
} from '../../../types/models';

interface LocalFileItem {
  id: string;
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
}

interface LeaveRequestModalProps {
  visible: boolean;
  sessions: Session[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    session: Session,
    reason: string,
    attachments?: LeaveAttachmentMeta[]
  ) => Promise<ApiResponse<LeaveRequest>>;
}

const formatSessionDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const LeaveRequestModal = ({
  visible,
  sessions,
  submitting,
  onClose,
  onSubmit,
}: LeaveRequestModalProps) => {
  const { height } = useWindowDimensions();
  const { currentUser } = useApp();

  // Wizard state: 1 = Pilih Sesi, 2 = Detail Pengajuan
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [sessionSearch, setSessionSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<LocalFileItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  // Filter sesi berdasarkan pencarian di Langkah 1
  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const q = sessionSearch.toLowerCase();
    return sessions.filter(
      (s) =>
        s.courseName.toLowerCase().includes(q) ||
        s.moduleCode.toLowerCase().includes(q) ||
        s.moduleTitle.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q)
    );
  }, [sessions, sessionSearch]);

  const handleClose = () => {
    if (submitting || uploadingFiles) return;
    setStep(1);
    setSelectedSessionId(null);
    setReason('');
    setFiles([]);
    setErrorMessage('');
    setSessionSearch('');
    onClose();
  };

  const handleNextToStep2 = () => {
    if (!selectedSessionId) {
      setErrorMessage('Silakan pilih salah satu sesi praktikum terlebih dahulu.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  const handleBackToStep1 = () => {
    if (submitting || uploadingFiles) return;
    setErrorMessage('');
    setStep(1);
  };

  // Pilih file dokumen menggunakan expo-document-picker
  const handlePickFile = async () => {
    if (files.length >= MAX_FILES) {
      setErrorMessage(`Batas maksimal adalah ${MAX_FILES} berkas lampiran.`);
      return;
    }

    setErrorMessage('');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const picked = result.assets[0];

      if (picked.size && picked.size > MAX_FILE_SIZE) {
        setErrorMessage(
          `Ukuran file "${picked.name}" melebihi batas maksimal 10 MB.`
        );
        return;
      }

      // Cegah duplikasi file dengan nama yang sama
      if (files.some((f) => f.name === picked.name)) {
        setErrorMessage(`File "${picked.name}" sudah ditambahkan.`);
        return;
      }

      const newItem: LocalFileItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: picked.name,
        size: picked.size,
        uri: picked.uri,
        mimeType: picked.mimeType,
      };

      setFiles((prev) => [...prev, newItem]);
    } catch {
      setErrorMessage('Tidak dapat memilih file dokumen. Silakan coba kembali.');
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!selectedSession) {
      setErrorMessage('Sesi praktikum belum dipilih. Kembali ke langkah 1.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Alasan ketidakhadiran tidak boleh kosong.');
      return;
    }

    const uploadedMetas: LeaveAttachmentMeta[] = [];
    const uploadedPathsToCleanup: string[] = [];

    // Jika ada lampiran dokumen, lakukan upload ke Firebase Storage terlebih dahulu
    if (files.length > 0 && currentUser?.uid) {
      setUploadingFiles(true);
      try {
        for (const f of files) {
          const uploadRes = await uploadLeaveAttachment({
            uri: f.uri,
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
            userId: currentUser.uid,
          });

          if (!uploadRes.ok || !uploadRes.data) {
            // Upload gagal: bersihkan file yang sudah sempat terupload
            for (const path of uploadedPathsToCleanup) {
              await deleteLeaveAttachmentFile(path);
            }
            setErrorMessage(
              uploadRes.message || 'Gagal mengunggah dokumen pendukung.'
            );
            return;
          }

          uploadedMetas.push(uploadRes.data);
          uploadedPathsToCleanup.push(uploadRes.data.storagePath);
        }
      } catch {
        for (const path of uploadedPathsToCleanup) {
          await deleteLeaveAttachmentFile(path);
        }
        setErrorMessage(
          'Terjadi gangguan saat mengunggah file pendukung. Coba beberapa saat lagi.'
        );
        return;
      } finally {
        setUploadingFiles(false);
      }
    }

    try {
      const result = await onSubmit(
        selectedSession,
        reason.trim(),
        uploadedMetas
      );

      if (result.ok) {
        handleClose();
      } else {
        // Jika pembuatan izin di Firestore gagal, hapus file dari Storage agar tidak menjadi orphan
        for (const path of uploadedPathsToCleanup) {
          await deleteLeaveAttachmentFile(path);
        }
        setErrorMessage(result.message);
      }
    } catch {
      for (const path of uploadedPathsToCleanup) {
        await deleteLeaveAttachmentFile(path);
      }
      setErrorMessage(
        'Pengajuan izin belum dapat dikirim karena kendala koneksi atau hak akses data.'
      );
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.modal, { maxHeight: height * 0.92 }]}>
          <View style={styles.handle} />

          {/* MODAL HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.stepBadgeRow}>
                <Text style={styles.stepBadgeText}>
                  Langkah {step} dari 2
                </Text>
                <Text style={styles.stepTitleSub}>
                  {step === 1 ? 'Pilih Sesi' : 'Detail Izin'}
                </Text>
              </View>
              <Text style={styles.title}>
                {step === 1 ? 'Pilih Sesi Praktikum' : 'Detail Pengajuan Izin'}
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              disabled={submitting || uploadingFiles}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.mochaDark} />
            </Pressable>
          </View>

          {/* WIZARD CONTENT */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* ============================================== */}
            {/* LANGKAH 1 — PILIH SESI PRAKTIKUM              */}
            {/* ============================================== */}
            {step === 1 && (
              <View style={styles.stepBody}>
                <Text style={styles.instructionText}>
                  Pilih salah satu sesi praktikum yang tidak dapat Anda hadiri. Sesi yang muncul memenuhi kriteria pengajuan izin.
                </Text>

                {/* SEARCH FILTER */}
                {sessions.length > 2 ? (
                  <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Cari mata praktikum atau materi..."
                      placeholderTextColor={colors.textMuted}
                      value={sessionSearch}
                      onChangeText={setSessionSearch}
                    />
                    {sessionSearch ? (
                      <Pressable onPress={() => setSessionSearch('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {/* SESSIONS LIST */}
                {sessions.length === 0 ? (
                  <View style={styles.emptySessionBox}>
                    <Ionicons
                      name="calendar-outline"
                      size={28}
                      color={colors.textMuted}
                    />
                    <Text style={styles.emptyText}>
                      Belum ada jadwal sesi praktikum yang memenuhi syarat pengajuan izin.
                    </Text>
                  </View>
                ) : filteredSessions.length === 0 ? (
                  <View style={styles.emptySessionBox}>
                    <Ionicons name="search-outline" size={24} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      Tidak ada sesi praktikum yang cocok dengan pencarian &quot;{sessionSearch}&quot;.
                    </Text>
                  </View>
                ) : (
                  filteredSessions.map((session) => {
                    const selected = selectedSessionId === session.id;

                    return (
                      <Pressable
                        key={session.id}
                        disabled={submitting}
                        onPress={() => {
                          setSelectedSessionId(session.id);
                          setErrorMessage('');
                        }}
                        style={[
                          styles.sessionOption,
                          selected && styles.sessionSelected,
                        ]}
                      >
                        <View style={styles.sessionHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sessionName}>
                              {session.courseName}
                            </Text>
                            <Text style={styles.sessionDetail}>
                              {session.moduleCode} — {session.moduleTitle}
                            </Text>
                          </View>

                          <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                            {selected ? <View style={styles.radioDot} /> : null}
                          </View>
                        </View>

                        <View style={styles.sessionMetaRow}>
                          <View style={styles.metaChip}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.metaChipText}>
                              {formatSessionDate(session.date)}
                            </Text>
                          </View>

                          <View style={styles.metaChip}>
                            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.metaChipText}>
                              {session.startTime} - {session.endTime} WIB
                            </Text>
                          </View>

                          <View style={styles.metaChip}>
                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.metaChipText}>
                              {session.room}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            {/* ============================================== */}
            {/* LANGKAH 2 — ISI DETAIL PENGAJUAN              */}
            {/* ============================================== */}
            {step === 2 && selectedSession && (
              <View style={styles.stepBody}>
                {/* RINGKASAN SESI TERPILIH */}
                <View style={styles.sessionSummaryCard}>
                  <View style={styles.summaryTop}>
                    <View style={styles.summaryBadge}>
                      <Ionicons name="school" size={13} color={colors.primary} />
                      <Text style={styles.summaryBadgeText}>Sesi yang Dipilih</Text>
                    </View>
                    <Pressable
                      onPress={handleBackToStep1}
                      hitSlop={8}
                      style={styles.changeSessionBtn}
                    >
                      <Text style={styles.changeSessionText}>Ganti Sesi</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.summaryCourse}>
                    {selectedSession.courseName}
                  </Text>
                  <Text style={styles.summaryTopic}>
                    {selectedSession.moduleCode} — {selectedSession.moduleTitle}
                  </Text>
                  <Text style={styles.summarySchedule}>
                    {formatSessionDate(selectedSession.date)} • {selectedSession.startTime} - {selectedSession.endTime} WIB • {selectedSession.room}
                  </Text>
                </View>

                {/* ALASAN IZIN TEXTAREA */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.sectionLabel}>Alasan Ketidakhadiran *</Text>
                  <TextInput
                    value={reason}
                    onChangeText={(value) => {
                      setReason(value);
                      setErrorMessage('');
                    }}
                    placeholder="Jelaskan alasan ketidakhadiran secara jelas, misalnya sakit, keperluan keluarga, atau kondisi lainnya..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                    editable={!submitting && !uploadingFiles}
                    style={styles.reasonInput}
                  />

                  <View style={styles.charCountRow}>
                    <Text style={styles.characterCount}>
                      {reason.length}/1000 karakter
                    </Text>
                  </View>
                </View>

                {/* DOKUMEN PENDUKUNG (OPSIONAL) */}
                <View style={styles.fieldBlock}>
                  <View style={styles.attachHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionLabel}>
                        Dokumen Pendukung (Opsional)
                      </Text>
                      <Text style={styles.attachSubtitle}>
                        Unggah surat dokter, surat keterangan, atau dokumen lain yang mendukung pengajuan izin Anda. (Maksimal 3 file, 10 MB per file, PDF/JPG/PNG)
                      </Text>
                    </View>

                    {files.length < MAX_FILES ? (
                      <Pressable
                        onPress={handlePickFile}
                        disabled={submitting || uploadingFiles}
                        style={styles.addFileBtn}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                        <Text style={styles.addFileBtnText}>Pilih File</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* DAFTAR FILE TERLAMPIR */}
                  {files.length > 0 ? (
                    <View style={styles.filesList}>
                      {files.map((file) => {
                        const isPdf =
                          file.name.toLowerCase().endsWith('.pdf') ||
                          file.mimeType?.includes('pdf');

                        return (
                          <View key={file.id} style={styles.fileItem}>
                            <View style={styles.fileIconWrap}>
                              <Ionicons
                                name={isPdf ? 'document-text' : 'image'}
                                size={18}
                                color={isPdf ? '#DC2626' : colors.primaryDark}
                              />
                            </View>

                            <View style={styles.fileMeta}>
                              <Text style={styles.fileName} numberOfLines={1}>
                                {file.name}
                              </Text>
                              <Text style={styles.fileSize}>
                                {formatFileSize(file.size)}
                              </Text>
                            </View>

                            <Pressable
                              onPress={() => handleRemoveFile(file.id)}
                              disabled={submitting || uploadingFiles}
                              hitSlop={8}
                              style={styles.removeFileBtn}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color={colors.danger}
                              />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                {/* AI ADVISORY CALLOUT */}
                <View style={styles.aiInfo}>
                  <View style={styles.aiHeader}>
                    <Ionicons name="sparkles" size={15} color={colors.mochaDark} />
                    <Text style={styles.aiTitle}>Analisis AI Pendukung</Text>
                  </View>

                  <Text style={styles.aiDescription}>
                    Alasan ketidakhadiran akan dianalisis secara lokal oleh AI untuk mengelompokkan kategori. Keputusan persetujuan tetap sepenuhnya di tangan asisten praktikum.
                  </Text>
                </View>
              </View>
            )}

            {/* ERROR BOX */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.dangerDark}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* FIXED MODAL FOOTER */}
          <View style={styles.footerRow}>
            {step === 1 ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClose}
                  style={styles.btnSecondary}
                >
                  <Text style={styles.btnSecondaryText}>Batal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleNextToStep2}
                  disabled={!selectedSessionId}
                  style={[
                    styles.btnPrimary,
                    !selectedSessionId && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>
                    Lanjutkan ke Detail Izin
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleBackToStep1}
                  disabled={submitting || uploadingFiles}
                  style={[
                    styles.btnSecondary,
                    (submitting || uploadingFiles) && styles.btnDisabled,
                  ]}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.mochaDark} />
                  <Text style={styles.btnSecondaryText}>Kembali</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleSubmit}
                  disabled={submitting || uploadingFiles}
                  style={[
                    styles.btnPrimary,
                    (submitting || uploadingFiles) && styles.btnDisabled,
                  ]}
                >
                  {submitting || uploadingFiles ? (
                    <View style={styles.submittingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>
                        {uploadingFiles ? 'Mengunggah Berkas...' : 'Mengirim Izin...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>Kirim Pengajuan</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(71, 67, 41, 0.45)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...theme.shadows.card,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  stepTitleSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  stepBody: {
    gap: spacing.md,
  },
  instructionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 6,
  },
  emptySessionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  sessionOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...theme.shadows.card,
  },
  sessionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F9',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sessionDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metaChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sessionSummaryCard: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  changeSessionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  changeSessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCourse: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  summaryTopic: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summarySchedule: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  fieldBlock: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  reasonInput: {
    minHeight: 110,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginTop: 4,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  characterCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  attachHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  attachSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  addFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#FCCFE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  addFileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filesList: {
    gap: 6,
    marginTop: spacing.xs,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  fileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  fileSize: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  removeFileBtn: {
    padding: 6,
  },
  aiInfo: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  aiDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.dangerDark,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export default LeaveRequestModal;

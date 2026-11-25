import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppModal from '../../../components/AppModal';
import {
  OFFICIAL_COURSES,
  getAcademicHierarchyForCourse,
} from '../../../data/academicCatalog';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import {
  deriveWeekdayName,
  formatSessionDate,
  getJakartaCurrentTimeString,
  getJakartaTodayString,
  parseJakartaDate,
  validateSessionScheduleRealtime,
} from '../../../utils/dateUtils';
import {
  checkScheduleConflicts,
  type ConflictCheckResult,
} from '../../../utils/conflictUtils';

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
  existingSessions?: Session[];
  onClose: () => void;
  onSubmit: (
    input: CreateSessionInput
  ) => Promise<ApiResponse<unknown>>;
};

const STEP_TITLES = [
  'Mata Praktikum',
  'Kelas Utama',
  'Lab Praktikum',
  'Laboratorium Fisik',
  'Waktu & Jadwal',
  'Modul & Materi',
  'Review & Simpan',
];

const QUICK_TIME_SLOTS = [
  { start: '08:00', end: '10:00', label: '08:00 - 10:00' },
  { start: '10:00', end: '12:00', label: '10:00 - 12:00' },
  { start: '13:00', end: '15:00', label: '13:00 - 15:00' },
  { start: '15:40', end: '17:40', label: '15:40 - 17:40' },
  { start: '18:00', end: '20:00', label: '18:00 - 20:00' },
];

const MODULE_PRESETS = [
  'Modul 01',
  'Modul 02',
  'Modul 03',
  'Modul 04',
  'Modul 05',
  'Modul 06',
  'Responsi',
];

interface SessionFormContentProps {
  session: Session | null;
  classes: LabClass[];
  laboratories: Laboratory[];
  existingSessions: Session[];
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => Promise<ApiResponse<unknown>>;
}

const SessionFormContent = ({
  session,
  classes,
  laboratories,
  existingSessions,
  onClose,
  onSubmit,
}: SessionFormContentProps) => {
  const [currentStep, setCurrentStep] = useState(1);

  const todayStr = getJakartaTodayString();
  const currentTimeStr = getJakartaCurrentTimeString();

  const defaultSlot = useMemo(() => {
    if (session) {
      return { start: session.startTime, end: session.endTime };
    }
    const upcomingSlot = QUICK_TIME_SLOTS.find((s) => s.start >= currentTimeStr);
    return upcomingSlot || QUICK_TIME_SLOTS[0];
  }, [session, currentTimeStr]);

  const initialDate = session?.date ?? todayStr;
  const initialGroup = session?.groupCode ?? session?.className ?? '';
  const initialMainClass =
    session?.mainClass ??
    (initialGroup && /[A-Z]/.test(initialGroup.charAt(0))
      ? `Kelas ${initialGroup.charAt(0).toUpperCase()}`
      : '');

  // Form states
  const [courseName, setCourseName] = useState(session?.courseName ?? '');
  const [courseCode, setCourseCode] = useState(session?.courseCode ?? '');
  const [customCourseMode, setCustomCourseMode] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const [mainClass, setMainClass] = useState(initialMainClass);
  const [customMainClassInput, setCustomMainClassInput] = useState('');
  const [customMainClasses, setCustomMainClasses] = useState<string[]>([]);

  const [groupCode, setGroupCode] = useState(initialGroup);
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [customGroups, setCustomGroups] = useState<string[]>([]);

  const [laboratoryId, setLaboratoryId] = useState(session?.laboratoryId ?? '');
  const [room, setRoom] = useState(session?.room ?? '');

  const [date, setDate] = useState(initialDate);
  const [day, setDay] = useState(
    () => session?.day || deriveWeekdayName(initialDate) || 'Senin'
  );
  const [startTime, setStartTime] = useState(session?.startTime ?? defaultSlot.start);
  const [endTime, setEndTime] = useState(session?.endTime ?? defaultSlot.end);

  const [moduleCode, setModuleCode] = useState(session?.moduleCode ?? 'Modul 01');
  const [moduleTitle, setModuleTitle] = useState(session?.moduleTitle ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Date change handler to auto-derive day
  const handleDateChange = (val: string) => {
    setDate(val);
    const derived = deriveWeekdayName(val);
    if (derived) {
      setDay(derived);
    }
  };

  const handleShortcutDate = (offsetDays: number) => {
    const parts = parseJakartaDate(new Date());
    const base = parts ? new Date(parts.year, parts.monthIndex, parts.day) : new Date();
    base.setDate(base.getDate() + offsetDays);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    handleDateChange(`${y}-${m}-${d}`);
  };

  // Filtered official courses
  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return OFFICIAL_COURSES;
    const q = courseSearch.toLowerCase();
    return OFFICIAL_COURSES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [courseSearch]);

  // Hierarchy for current course
  const hierarchy = useMemo(() => {
    if (!courseName) return null;
    return getAcademicHierarchyForCourse(courseName);
  }, [courseName]);

  // Available main classes: from catalog + custom added + existing classes matching course
  const availableMainClasses = useMemo(() => {
    const set = new Set<string>();
    if (hierarchy) {
      hierarchy.mainClasses.forEach((mc) => set.add(mc.className));
    } else {
      ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D'].forEach((c) => set.add(c));
    }
    customMainClasses.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [hierarchy, customMainClasses]);

  // Available groups for selected main class
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    if (hierarchy && mainClass) {
      const found = hierarchy.mainClasses.find(
        (mc) => mc.className.toLowerCase() === mainClass.toLowerCase()
      );
      if (found) {
        found.groups.forEach((g) => set.add(g));
      } else {
        const letter = mainClass.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase() || 'A';
        set.add(`${letter}1`);
        set.add(`${letter}2`);
      }
    } else if (mainClass) {
      const letter = mainClass.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase() || 'A';
      set.add(`${letter}1`);
      set.add(`${letter}2`);
    } else {
      ['A1', 'A2', 'B1', 'B2'].forEach((g) => set.add(g));
    }
    customGroups.forEach((g) => set.add(g));
    return Array.from(set).sort();
  }, [hierarchy, mainClass, customGroups]);

  // Conflict detection
  const conflictResult: ConflictCheckResult = useMemo(() => {
    if (currentStep !== 7) {
      return {
        hasConflict: false,
        labConflicts: [],
        groupConflicts: [],
        allWarnings: [],
      };
    }
    return checkScheduleConflicts({
      date,
      startTime,
      endTime,
      room,
      laboratoryId,
      groupCode,
      existingSessions,
      excludeSessionId: session?.id,
    });
  }, [
    currentStep,
    date,
    startTime,
    endTime,
    room,
    laboratoryId,
    groupCode,
    existingSessions,
    session?.id,
  ]);

  // Step navigation validations
  const validateStep = (stepNumber: number): string | null => {
    switch (stepNumber) {
      case 1:
        if (!courseName.trim()) return 'Pilih atau masukkan nama mata praktikum.';
        if (!courseCode.trim()) return 'Kode mata praktikum tidak boleh kosong.';
        return null;
      case 2:
        if (!mainClass.trim()) return 'Pilih salah satu kelas utama (misal: Kelas A).';
        return null;
      case 3:
        if (!groupCode.trim()) return 'Pilih salah satu lab praktikum (misal: Lab. A1).';
        return null;
      case 4:
        if (!room.trim()) return 'Pilih laboratorium atau tentukan lokasi ruangan.';
        return null;
      case 5:
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
          return 'Format tanggal harus YYYY-MM-DD (contoh: 2026-11-25).';
        }
        if (
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
        ) {
          return 'Format jam harus HH:mm (contoh: 08:00).';
        }
        if (endTime <= startTime) {
          return 'Jam selesai harus lebih akhir dari jam mulai.';
        }
        const scheduleVal = validateSessionScheduleRealtime(
          date.trim(),
          startTime.trim(),
          endTime.trim()
        );
        if (!scheduleVal.valid) {
          return scheduleVal.error || 'Jadwal sesi praktikum tidak valid.';
        }
        return null;
      case 6:
        if (!moduleCode.trim()) return 'Kode modul wajib diisi (contoh: Modul 01).';
        if (!moduleTitle.trim()) return 'Judul modul/topik materi wajib diisi.';
        return null;
      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddCustomClass = () => {
    const trimmed = customMainClassInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('Kelas') ? trimmed : `Kelas ${trimmed.toUpperCase()}`;
    if (!customMainClasses.includes(formatted)) {
      setCustomMainClasses((prev) => [...prev, formatted]);
    }
    setMainClass(formatted);
    setCustomMainClassInput('');
  };

  const handleAddCustomGroup = () => {
    const trimmed = customGroupInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!customGroups.includes(trimmed)) {
      setCustomGroups((prev) => [...prev, trimmed]);
    }
    setGroupCode(trimmed);
    setCustomGroupInput('');
  };

  const handleSelectLab = (lab: Laboratory) => {
    setLaboratoryId(lab.id);
    setRoom(lab.name);
  };

  const handleSubmit = async () => {
    if (saving) return;
    setError('');

    for (let s = 1; s <= 6; s++) {
      const err = validateStep(s);
      if (err) {
        setError(`Langkah ${s}: ${err}`);
        setCurrentStep(s);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: CreateSessionInput = {
        courseName: courseName.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        mainClass: mainClass.trim(),
        groupCode: groupCode.trim().toUpperCase(),
        className: groupCode.trim().toUpperCase(),
        moduleCode: moduleCode.trim(),
        moduleTitle: moduleTitle.trim(),
        day: (day ? day.trim() : '') || deriveWeekdayName(date.trim()) || 'Senin',
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        room: room.trim(),
        laboratoryId: laboratoryId.trim() || undefined,
        totalStudents: 0,
        notes: notes.trim(),
      };

      const result = await onSubmit(payload);
      if (result.ok) {
        onClose();
      } else {
        setError(result.message || 'Sesi praktikum gagal disimpan.');
      }
    } catch {
      setError('Terjadi kendala saat menyimpan sesi praktikum. Coba beberapa saat lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wizardContainer}>
      {/* STEP INDICATOR HEADER */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepBadgeText}>
            Langkah {currentStep} dari 7
          </Text>
          <Text style={styles.stepTitleText}>
            {STEP_TITLES[currentStep - 1]}
          </Text>
        </View>

        {/* PROGRESS PILLS */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isCompleted = num < currentStep;
            const isCurrent = num === currentStep;
            return (
              <Pressable
                key={num}
                onPress={() => {
                  if (num < currentStep) {
                    setError('');
                    setCurrentStep(num);
                  }
                }}
                disabled={num > currentStep}
                style={[
                  styles.progressPill,
                  isCurrent && styles.progressPillCurrent,
                  isCompleted && styles.progressPillCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={11} color={colors.surface} />
                ) : (
                  <Text
                    style={[
                      styles.progressPillText,
                      isCurrent && styles.progressPillTextCurrent,
                    ]}
                  >
                    {num}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================= */}
        {/* STEP 1: PILIH MATA PRAKTIKUM                     */}
        {/* ================================================= */}
        {currentStep === 1 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepInstruction}>
              Pilih salah satu dari 7 mata praktikum resmi Informatika UNDIP, atau tambahkan praktikum baru.
            </Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari mata praktikum atau kode..."
                placeholderTextColor={colors.textMuted}
                value={courseSearch}
                onChangeText={setCourseSearch}
              />
              {courseSearch ? (
                <Pressable onPress={() => setCourseSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.cardList}>
              {filteredCourses.map((c) => {
                const isSelected =
                  courseName.toLowerCase() === c.name.toLowerCase();
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setCourseName(c.name);
                      setCourseCode(c.code);
                      setCustomCourseMode(false);
                      setError('');
                    }}
                    style={[
                      styles.courseCard,
                      isSelected && styles.courseCardSelected,
                    ]}
                  >
                    <View style={styles.courseCardHeader}>
                      <View style={styles.courseBadge}>
                        <Text style={styles.courseBadgeText}>{c.code}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedCheck}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.courseNameText}>{c.name}</Text>
                    <Text style={styles.courseDetailText}>
                      {c.groups.length} Lab Praktikum ({c.groups.map((g) => `Lab. ${g}`).join(', ')})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* CUSTOM COURSE ACCORDION */}
            <Pressable
              onPress={() => setCustomCourseMode(!customCourseMode)}
              style={styles.customToggleRow}
            >
              <Ionicons
                name={customCourseMode ? 'remove-circle-outline' : 'add-circle-outline'}
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.customToggleText}>
                {customCourseMode
                  ? 'Gunakan Pilihan Mata Praktikum Resmi'
                  : '+ Input Mata Praktikum Baru (Manual)'}
              </Text>
            </Pressable>

            {customCourseMode && (
              <View style={styles.customFormBox}>
                <Text style={styles.inputLabel}>Nama Mata Praktikum *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Pemrograman Mobile Lanjut"
                  placeholderTextColor={colors.textMuted}
                  value={courseName}
                  onChangeText={(val) => {
                    setCourseName(val);
                    setError('');
                  }}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                  Kode Praktikum *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: PAIK6401"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={courseCode}
                  onChangeText={(val) => {
                    setCourseCode(val.toUpperCase());
                    setError('');
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 2: PILIH KELAS UTAMA                        */}
        {/* ================================================= */}
        {currentStep === 2 && (
          <View style={styles.stepBody}>
            <View style={styles.contextSummaryBadge}>
              <Ionicons name="book-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.contextSummaryText}>
                {courseCode} • {courseName}
              </Text>
            </View>

            <Text style={styles.stepInstruction}>
              Pilih kelas utama untuk mata praktikum ini. Pilihan kelas menyesuaikan mata praktikum yang dipilih.
            </Text>

            <View style={styles.choiceGrid}>
              {availableMainClasses.map((item) => {
                const isSelected = mainClass === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setMainClass(item);
                      setError('');
                    }}
                    style={[
                      styles.mainClassChip,
                      isSelected && styles.mainClassChipSelected,
                    ]}
                  >
                    <Ionicons
                      name="school"
                      size={15}
                      color={isSelected ? colors.surface : colors.primaryDark}
                    />
                    <Text
                      style={[
                        styles.mainClassChipText,
                        isSelected && styles.mainClassChipTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ADD CUSTOM MAIN CLASS */}
            <View style={styles.addInlineBox}>
              <Text style={styles.inputLabel}>+ Tambah Kelas Utama Baru</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  placeholder="Contoh: Kelas E / Kelas Internasional"
                  placeholderTextColor={colors.textMuted}
                  value={customMainClassInput}
                  onChangeText={setCustomMainClassInput}
                />
                <Pressable
                  onPress={handleAddCustomClass}
                  disabled={!customMainClassInput.trim()}
                  style={[
                    styles.inlineBtn,
                    !customMainClassInput.trim() && styles.btnDisabled,
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.surface} />
                  <Text style={styles.inlineBtnText}>Tambah</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 3: PILIH LAB PRAKTIKUM                      */}
        {/* ================================================= */}
        {currentStep === 3 && (
          <View style={styles.stepBody}>
            <View style={styles.contextSummaryBadge}>
              <Ionicons name="school-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.contextSummaryText}>
                {courseName} → {mainClass}
              </Text>
            </View>

            <Text style={styles.stepInstruction}>
              Pilih lab praktikum yang akan digunakan oleh kelas ini. Setiap lab memiliki daftar praktikan masing-masing.
            </Text>

            <View style={styles.choiceGrid}>
              {availableGroups.map((g) => {
                const isSelected = groupCode === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => {
                      setGroupCode(g);
                      setError('');
                    }}
                    style={[
                      styles.groupChip,
                      isSelected && styles.groupChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        isSelected && styles.groupChipTextSelected,
                      ]}
                    >
                      Lab. {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ADD CUSTOM LAB */}
            <View style={styles.addInlineBox}>
              <Text style={styles.inputLabel}>+ Tambah Lab Baru</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  placeholder="Contoh: A3 atau A4"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={customGroupInput}
                  onChangeText={setCustomGroupInput}
                />
                <Pressable
                  onPress={handleAddCustomGroup}
                  disabled={!customGroupInput.trim()}
                  style={[
                    styles.inlineBtn,
                    !customGroupInput.trim() && styles.btnDisabled,
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.surface} />
                  <Text style={styles.inlineBtnText}>Tambah</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.infoAlertBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.sageDark} />
              <Text style={styles.infoAlertText}>
                Praktikan yang mendaftar di lab praktikum ini ({groupCode ? `Lab. ${groupCode}` : '...'}) nantinya akan otomatis dapat melihat sesi ini pada dashboard masing-masing.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 4: PILIH LABORATORIUM FISIK                 */}
        {/* ================================================= */}
        {currentStep === 4 && (
          <View style={styles.stepBody}>
            <View style={styles.contextSummaryBadge}>
              <Ionicons name="people-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.contextSummaryText}>
                Lab Praktikan: Lab. {groupCode} ({mainClass})
              </Text>
            </View>

            <Text style={styles.stepInstruction}>
              Pilih lokasi laboratorium fisik tempat praktikum berlangsung. Lokasi fisik terpisah dari kelompok praktikan, dan terhubung dengan radius presensi GPS.
            </Text>

            <View style={styles.cardList}>
              {laboratories.map((lab) => {
                const isSelected = laboratoryId === lab.id;
                return (
                  <Pressable
                    key={lab.id}
                    onPress={() => {
                      handleSelectLab(lab);
                      setError('');
                    }}
                    style={[
                      styles.labCard,
                      isSelected && styles.labCardSelected,
                    ]}
                  >
                    <View style={styles.labCardHeader}>
                      <View style={styles.labIconBadge}>
                        <Ionicons
                          name="location"
                          size={18}
                          color={isSelected ? colors.surface : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.labCardTitle}>{lab.name}</Text>
                        <Text style={styles.labCardSubtitle}>
                          Radius Valid: {lab.radiusMeters} meter • GPS Active
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* MANUAL ROOM / RUANGAN DETAIL */}
            <View style={styles.customFormBox}>
              <Text style={styles.inputLabel}>
                Nama Ruangan / Gedung *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Lab B (Gedung E Lantai 2)"
                placeholderTextColor={colors.textMuted}
                value={room}
                onChangeText={(val) => {
                  setRoom(val);
                  setError('');
                }}
              />
              <Text style={styles.inputHint}>
                Nama ruangan ini akan ditampilkan secara langsung pada kartu sesi praktikan.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 5: TENTUKAN JADWAL                          */}
        {/* ================================================= */}
        {currentStep === 5 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepInstruction}>
              Tentukan tanggal dan rentang jam sesi praktikum (WIB). Hari praktikum dihitung secara otomatis dan sinkron dengan tanggal.
            </Text>

            {/* REAL-TIME SERVER CLOCK & MINIMUM DATE INFO */}
            <View style={styles.realtimeInfoBox}>
              <Ionicons name="time" size={16} color={colors.primary} />
              <Text style={styles.realtimeInfoText}>
                Waktu server sekarang: <Text style={styles.bold}>{currentTimeStr.replace(':', '.')} WIB</Text> · Tanggal minimal: {formatSessionDate(todayStr)}
              </Text>
            </View>

            {/* DATE SHORTCUTS */}
            <View style={styles.shortcutRow}>
              <Pressable
                onPress={() => handleShortcutDate(0)}
                style={styles.shortcutChip}
              >
                <Text style={styles.shortcutText}>Hari Ini</Text>
              </Pressable>
              <Pressable
                onPress={() => handleShortcutDate(1)}
                style={styles.shortcutChip}
              >
                <Text style={styles.shortcutText}>Besok</Text>
              </Pressable>
              <Pressable
                onPress={() => handleShortcutDate(7)}
                style={styles.shortcutChip}
              >
                <Text style={styles.shortcutText}>+7 Hari</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>Tanggal (YYYY-MM-DD) *</Text>
                <TextInput
                  style={[
                    styles.input,
                    date.trim() < todayStr && styles.inputErrorBorder,
                  ]}
                  placeholder="2026-11-25"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={handleDateChange}
                />
              </View>

              <View style={styles.half}>
                <Text style={styles.inputLabel}>Hari (Otomatis)</Text>
                <View style={[styles.input, styles.disabledInput]}>
                  <Text style={styles.disabledInputText}>{day || 'Dihitung...'}</Text>
                </View>
              </View>
            </View>

            {/* WARNING IF PAST DATE */}
            {date.trim() < todayStr ? (
              <View style={styles.dateWarningBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.dateWarningText}>
                  Tanggal sudah lewat! Jadwal praktikum hanya dapat dibuat untuk hari ini atau tanggal mendatang.
                </Text>
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              Pilihan Jam Standar Lab
            </Text>
            <View style={styles.quickSlotRow}>
              {QUICK_TIME_SLOTS.map((slot) => {
                const isToday = date.trim() === todayStr;
                const isPast = isToday && slot.start < currentTimeStr;
                const isActive =
                  startTime === slot.start && endTime === slot.end;
                return (
                  <Pressable
                    key={slot.label}
                    onPress={() => {
                      if (isPast) {
                        setError(
                          `Slot ${slot.label} WIB sudah berlalu hari ini (waktu sekarang: ${currentTimeStr.replace(':', '.')} WIB). Pilih slot jam berikutnya atau ganti tanggal.`
                        );
                        return;
                      }
                      setStartTime(slot.start);
                      setEndTime(slot.end);
                      setError('');
                    }}
                    style={[
                      styles.slotChip,
                      isActive && styles.slotChipActive,
                      isPast && styles.slotChipPast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        isActive && styles.slotChipTextActive,
                        isPast && styles.slotChipTextPast,
                      ]}
                    >
                      {slot.label} {isPast ? '(Lewat)' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* WARNING IF TODAY AND PAST TIME */}
            {date.trim() === todayStr && startTime < currentTimeStr ? (
              <View style={styles.dateWarningBox}>
                <Ionicons name="time-outline" size={16} color={colors.danger} />
                <Text style={styles.dateWarningText}>
                  Jam mulai ({startTime} WIB) sudah lewat dari waktu saat ini ({currentTimeStr.replace(':', '.')} WIB). Pilih jam yang belum berlalu.
                </Text>
              </View>
            ) : null}

            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>Jam Mulai (HH:mm) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  placeholderTextColor={colors.textMuted}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>

              <View style={styles.half}>
                <Text style={styles.inputLabel}>Jam Selesai (HH:mm) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:00"
                  placeholderTextColor={colors.textMuted}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 6: DETAIL MODUL & MATERI                    */}
        {/* ================================================= */}
        {currentStep === 6 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepInstruction}>
              Lengkapi materi pembelajaran modul yang relevan dengan mata praktikum {courseName}.
            </Text>

            <Text style={styles.inputLabel}>Pilihan Cepat Kode Modul</Text>
            <View style={styles.choiceGrid}>
              {MODULE_PRESETS.map((m) => {
                const isSelected = moduleCode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setModuleCode(m);
                      setError('');
                    }}
                    style={[
                      styles.moduleChip,
                      isSelected && styles.moduleChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.moduleChipText,
                        isSelected && styles.moduleChipTextSelected,
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.inputLabel}>Kode Modul *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Modul 01 atau Responsi"
                placeholderTextColor={colors.textMuted}
                value={moduleCode}
                onChangeText={(val) => {
                  setModuleCode(val);
                  setError('');
                }}
              />
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.inputLabel}>Judul Modul / Topik Praktikum *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: DDL, DML & Entity Relationship Diagram"
                placeholderTextColor={colors.textMuted}
                value={moduleTitle}
                onChangeText={(val) => {
                  setModuleTitle(val);
                  setError('');
                }}
              />
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.inputLabel}>Catatan Tambahan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Contoh: Bawa modul fisik dan unduh dataset sebelum sesi dimulai."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* STEP 7: REVIEW & SIMPAN                          */}
        {/* ================================================= */}
        {currentStep === 7 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepInstruction}>
              Periksa ringkasan sesi praktikum sebelum menyimpan. Sesi baru akan otomatis berada di urutan paling atas.
            </Text>

            {/* CONFLICT WARNING BANNER */}
            {conflictResult.hasConflict && (
              <View style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <Ionicons name="warning" size={20} color="#C27803" />
                  <Text style={styles.conflictTitle}>Peringatan Bentrok Jadwal Terdeteksi</Text>
                </View>
                {conflictResult.allWarnings.map((warn, i) => (
                  <Text key={i} style={styles.conflictDesc}>
                    • {warn}
                  </Text>
                ))}
                <Text style={styles.conflictHint}>
                  Catatan: Anda tetap dapat menyimpan sesi jika bentrok ini disengaja atau merupakan penyesuaian khusus.
                </Text>
              </View>
            )}

            {/* SUMMARY CARD */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="book" size={17} color={colors.primaryDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Mata Praktikum</Text>
                  <Text style={styles.summaryValue}>
                    {courseName} ({courseCode})
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="school" size={17} color={colors.primaryDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Kelas & Lab Praktikum</Text>
                  <Text style={styles.summaryValue}>
                    {mainClass} → Lab. {groupCode}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="location" size={17} color={colors.primaryDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Laboratorium / Ruangan</Text>
                  <Text style={styles.summaryValue}>{room}</Text>
                  {laboratoryId ? (
                    <Text style={styles.summarySubValue}>
                      Radius presensi GPS otomatis terhubung
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="calendar" size={17} color={colors.primaryDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Jadwal Praktikum</Text>
                  <Text style={styles.summaryValue}>
                    {day}, {date} • {startTime} - {endTime} WIB
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="document-text" size={17} color={colors.primaryDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Modul & Materi</Text>
                  <Text style={styles.summaryValue}>
                    {moduleCode} — {moduleTitle}
                  </Text>
                  {notes ? (
                    <Text style={styles.summarySubValue}>Catatan: {notes}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="shield-checkmark" size={17} color={colors.sageDark} />
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryLabel}>Metadata Pembuat</Text>
                  <Text style={styles.summaryValue}>
                    Tercatat otomatis dari sesi asisten yang login
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ERROR BOX */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* FOOTER ACTION BUTTONS */}
      <View style={styles.footerRow}>
        {currentStep > 1 ? (
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={handlePrevStep}
            style={[styles.btnPrev, saving && styles.btnDisabled]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.text} />
            <Text style={styles.btnPrevText}>Sebelumnya</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            disabled={saving}
            style={[styles.btnPrev, saving && styles.btnDisabled]}
          >
            <Text style={styles.btnPrevText}>Batal</Text>
          </Pressable>
        )}

        {currentStep < 7 ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleNextStep}
            style={styles.btnNext}
          >
            <Text style={styles.btnNextText}>
              Lanjut ke {STEP_TITLES[currentStep]}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primaryText} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={saving}
            style={[styles.btnSubmit, saving && styles.btnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={17} color={colors.primaryText} />
                <Text style={styles.btnSubmitText}>
                  {session ? 'Simpan Perubahan Sesi' : 'Buat Sesi Praktikum'}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const SessionFormModal = ({
  visible,
  session,
  classes,
  laboratories = [],
  existingSessions = [],
  onClose,
  onSubmit,
}: Props) => {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={session ? 'Ubah Sesi Praktikum' : 'Tambah Sesi Praktikum'}
      description="Kelola hierarki mata praktikum, kelas, kelompok paralel, lokasi laboratorium, dan jadwal mandiri."
    >
      {visible ? (
        <SessionFormContent
          key={`${session?.id ?? 'new'}-${visible}`}
          session={session}
          classes={classes}
          laboratories={laboratories}
          existingSessions={existingSessions}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  wizardContainer: {
    paddingBottom: spacing.sm,
  },
  stepHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  stepTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressPill: {
    flex: 1,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPillCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressPillCompleted: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  progressPillTextCurrent: {
    color: colors.primaryText,
  },
  stepScroll: {
    maxHeight: 460,
  },
  stepScrollContent: {
    paddingBottom: spacing.md,
  },
  stepBody: {
    gap: spacing.sm,
  },
  stepInstruction: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  contextSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  contextSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 8,
  },
  cardList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  courseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...theme.shadows.card,
  },
  courseCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F9',
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  selectedCheck: {
    marginLeft: 'auto',
  },
  courseNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  courseDetailText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  customToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  customToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  customFormBox: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  disabledInputText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mainClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainClassChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mainClassChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  mainClassChipTextSelected: {
    color: colors.primaryText,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  groupChipTextSelected: {
    color: colors.primaryText,
  },
  moduleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moduleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  moduleChipTextSelected: {
    color: colors.primaryText,
  },
  addInlineBox: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  inlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  inlineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryText,
  },
  infoAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  infoAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#2B5A33',
    lineHeight: 17,
  },
  labCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  labCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F9',
  },
  labCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labIconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  labCardSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  shortcutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  quickSlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  slotChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  slotChipTextActive: {
    color: colors.primaryText,
  },
  slotChipPast: {
    backgroundColor: '#F0ECE1',
    borderColor: '#E2DCCC',
    opacity: 0.65,
  },
  slotChipTextPast: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  realtimeInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  realtimeInfoText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: colors.mochaDark,
  },
  dateWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  dateWarningText: {
    flex: 1,
    fontSize: 11,
    color: colors.danger,
    lineHeight: 15,
  },
  inputErrorBorder: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  conflictCard: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8D6E14',
  },
  conflictDesc: {
    fontSize: 12,
    color: '#6A4F1D',
    lineHeight: 17,
    marginLeft: 4,
  },
  conflictHint: {
    fontSize: 11,
    color: '#8D6E14',
    fontStyle: 'italic',
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...theme.shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  summaryMeta: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  summarySubValue: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  btnPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrevText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  btnNext: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  btnNextText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
  },
  btnSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryText,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default SessionFormModal;

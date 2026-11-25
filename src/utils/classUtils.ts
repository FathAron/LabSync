/**
 * Utility modul untuk normalisasi kelas akademik dan relasi kelas-laboratorium LabSync.
 */

import type { Laboratory } from '../types/models';

/**
 * Daftar kelas akademik utama LabSync baru.
 */
export const VALID_MAIN_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type MainClassCode = (typeof VALID_MAIN_CLASSES)[number];

/**
 * Pemetaan standar kelas utama praktikan ke laboratorium fisik yang direkomendasikan.
 * - Kelas A -> Lab A1 atau Lab A2
 * - Kelas B -> Lab B1 atau Lab B2
 * - Kelas C -> Lab C1 atau Lab C2
 * - Kelas D -> Lab D1 atau Lab D2
 * - Kelas E -> Lab E1 atau Lab E2
 * - Kelas F -> Lab F1 atau Lab F2
 */
export const CLASS_LAB_MAPPING: Record<string, string[]> = {
  A: ['Lab A1', 'Lab A2'],
  B: ['Lab B1', 'Lab B2'],
  C: ['Lab C1', 'Lab C2'],
  D: ['Lab D1', 'Lab D2'],
  E: ['Lab E1', 'Lab E2'],
  F: ['Lab F1', 'Lab F2'],
};

/**
 * Mengekstrak kode kelas terstandar (contoh: "A", "B", "C", "D", "E", "F"):
 * - "A", "Kelas A", "KELAS A", "Kelas KELAS A" -> "A"
 * - "C", "Kelas C", "KELAS C", "Kelas KELAS C" -> "C"
 * 
 * PENTING: Format lama seperti "IF-26-C" TIDAK diubah menjadi "C"!
 * Data lama dipertahankan identitas aslinya ("IF-26-C") agar tidak bocor ke akun kelas C yang baru.
 */
export const normalizeClassCode = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  let trimmed = input.trim().toUpperCase();
  if (!trimmed) return '';

  // Bersihkan prefix ganda seperti "KELAS KELAS C" atau "KELAS " berulang
  trimmed = trimmed.replace(/^(KELAS\s+)+/i, '').trim();

  // 1. Jika single letter A-F (kelas akademik utama baru)
  if (/^[A-F]$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Format lama IF-xx-x (contoh: IF-26-C, IF-26-A)
  // JANGAN diekstrak huruf terakhirnya! Pertahankan sebagai identitas kelas testing lama.
  if (/^IF-\d{2}-[A-Z0-9]+$/i.test(trimmed)) {
    return trimmed;
  }

  // 3. Jika format lab fisik (contoh: "LAB A1"), jangan dijadikan identitas kelas akademik
  if (/^LAB\.?\s+/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
};

// Alias untuk kompatibilitas fungsi yang sudah ada
export const normalizeMainClass = (input: unknown): string => normalizeClassCode(input);

/**
 * Format nama kelas untuk tampilan standar UI.
 * contoh:
 * - "C" -> "Kelas C"
 * - "Kelas C" -> "Kelas C"
 * - "KELAS C" -> "Kelas C"
 * - "Kelas KELAS C" -> "Kelas C"
 * - "IF-26-C" -> "IF-26-C" (tetap nama aslinya, jangan ditambahkan "Kelas")
 */
export const formatDisplayClass = (input: unknown): string => {
  const code = normalizeClassCode(input);
  if (!code) return typeof input === 'string' ? input : '';
  if (/^[A-F]$/.test(code)) {
    return `Kelas ${code}`;
  }
  return code;
};

/**
 * Memeriksa apakah kelas praktikan cocok dengan kelas target sesi.
 * Aturan ketat:
 * - Praktikan "C" (atau "Kelas C") COCOK dengan sesi target "C" atau "Kelas C".
 * - Praktikan "C" TIDAK COCOK dengan sesi "IF-26-C" (data lama terpisah).
 * - Praktikan "C" TIDAK COCOK dengan sesi "Kelas A", "Kelas B", dst.
 * - Praktikan "IF-26-C" hanya cocok dengan sesi lama "IF-26-C".
 * - String kosong atau undefined TIDAK PERNAH cocok (mengembalikan false).
 */
export const isClassMatching = (
  studentClass: unknown,
  sessionClass: unknown
): boolean => {
  const normStudent = normalizeClassCode(studentClass);
  const normSession = normalizeClassCode(sessionClass);

  if (!normStudent || !normSession) {
    return false;
  }

  return normStudent === normSession;
};

/**
 * Opsi laboratorium fisik yang tersedia untuk suatu kelas.
 */
export interface AvailableLaboratoryOption {
  id?: string;
  name: string;
  isMapped: boolean;
  registeredLab?: Laboratory;
}

/**
 * Mengambil daftar laboratorium fisik yang direkomendasikan berdasarkan kelas utama yang dipilih.
 * Memadukan pemetaan standar (Lab A1, Lab A2) dengan daftar laboratorium yang terdaftar di Firestore.
 */
export const getAvailableLaboratoriesForClass = (
  mainClassInput: unknown,
  registeredLaboratories: Laboratory[] = []
): AvailableLaboratoryOption[] => {
  const norm = normalizeMainClass(mainClassInput);
  const defaultMappedNames =
    norm && CLASS_LAB_MAPPING[norm] ? CLASS_LAB_MAPPING[norm] : [];

  const results: AvailableLaboratoryOption[] = [];
  const addedNames = new Set<string>();

  // 1. Tambahkan laboratorium dari pemetaan standar untuk kelas ini
  for (const mapName of defaultMappedNames) {
    const foundReg = registeredLaboratories.find(
      (lab) => lab.name.trim().toLowerCase() === mapName.toLowerCase()
    );

    results.push({
      id: foundReg?.id,
      name: mapName,
      isMapped: true,
      registeredLab: foundReg,
    });
    addedNames.add(mapName.toLowerCase());
  }

  // 2. Tambahkan laboratorium lain yang terdaftar di Firestore jika namanya berawalan kelas ini
  if (norm) {
    for (const regLab of registeredLaboratories) {
      const regName = regLab.name.trim();
      if (!addedNames.has(regName.toLowerCase())) {
        const labNorm = normalizeMainClass(regName);
        if (labNorm === norm) {
          results.push({
            id: regLab.id,
            name: regName,
            isMapped: true,
            registeredLab: regLab,
          });
          addedNames.add(regName.toLowerCase());
        }
      }
    }
  }

  // 3. Tambahkan sisa laboratorium terdaftar lainnya sebagai opsi cadangan/kondisi khusus
  for (const regLab of registeredLaboratories) {
    const regName = regLab.name.trim();
    if (!addedNames.has(regName.toLowerCase())) {
      results.push({
        id: regLab.id,
        name: regName,
        isMapped: false,
        registeredLab: regLab,
      });
      addedNames.add(regName.toLowerCase());
    }
  }

  return results;
};

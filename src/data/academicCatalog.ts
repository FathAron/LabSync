/**
 * KATALOG DATA AKADEMIK RESMI — LABORATORIUM INFORMATIKA UNDIP
 *
 * Sumber rujukan: Berkas Pengumuman Jadwal Praktikum Gasal 2026/2027
 * Catatan privasi: Berkas ini HANYA memuat katalog resmi mata kuliah,
 * laboratorium fisik, penugasan kelompok, dan nama asisten.
 * Sesuai aturan privasi data: NIM praktikan, nomor kontak pribadi, link WhatsApp,
 * dan kode Microsoft Teams TIDAK DISERTAKAN dalam berkas kode ini.
 */

export interface OfficialCourse {
  code: string;
  name: string;
  semester: string;
  startingWeek: string;
  groups: string[];
}

export interface OfficialLaboratory {
  code: string;
  name: string;
  building: string;
  floor: string;
  locationDescription: string;
  defaultRadiusMeters: number;
}

export interface AssistantPair {
  assistant1: string;
  assistant2: string;
}

export interface GroupScheduleInfo {
  groupCode: string;
  day: string;
  timeRange: string;
  labCode: string;
  assistants: AssistantPair;
  notes?: string;
  hasDiscrepancy?: boolean;
}

// 7 MATA KULIAH RESMI LABORATORIUM INFORMATIKA UNDIP
export const OFFICIAL_COURSES: readonly OfficialCourse[] = [
  {
    code: 'PAIK6101',
    name: 'Dasar Pemrograman',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-DUA perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2'],
  },
  {
    code: 'PAIK6102',
    name: 'Dasar Sistem',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-EMPAT perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2'],
  },
  {
    code: 'PAIK6201',
    name: 'Struktur Data',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-DUA perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'],
  },
  {
    code: 'PAIK6301',
    name: 'Basis Data',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-EMPAT perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1'],
  },
  {
    code: 'PAIK6401',
    name: 'Sistem Operasi',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-TIGA perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'],
  },
  {
    code: 'PAIK6501',
    name: 'Pengembangan Platform Khusus',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu Ke-TIGA perkuliahan',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'],
  },
  {
    code: 'PAIK6601',
    name: 'Pembelajaran Mesin',
    semester: 'Gasal 2026/2027',
    startingWeek: 'Mulai Minggu PERTAMA setelah UTS',
    groups: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'],
  },
] as const;

// 4 LABORATORIUM FISIK RESMI INFORMATIKA UNDIP
// Deskripsi lokasi merujuk tepat pada catatan pengumuman resmi.
export const OFFICIAL_LABORATORIES: readonly OfficialLaboratory[] = [
  {
    code: 'AP',
    name: 'Lab AP',
    building: 'Gedung AP',
    floor: 'Lantai 5',
    locationDescription: 'Gedung AP Lantai 5 (Lab 502, depan studio FSM)',
    defaultRadiusMeters: 50,
  },
  {
    code: 'B',
    name: 'Lab B',
    building: 'Gedung E',
    floor: 'Lantai 2',
    locationDescription: 'Gedung E Lantai 2 (sebelah kanan tangga; akses melalui Lab C)',
    defaultRadiusMeters: 50,
  },
  {
    code: 'C',
    name: 'Lab C',
    building: 'Gedung E',
    floor: 'Lantai 2',
    locationDescription: 'Gedung E Lantai 2 (sebelah kanan tangga, area luar)',
    defaultRadiusMeters: 50,
  },
  {
    code: 'D',
    name: 'Lab D',
    building: 'Gedung E',
    floor: 'Lantai 2',
    locationDescription: 'Gedung E Lantai 2 (sebelah kiri tangga / sebelah ruang KAVI)',
    defaultRadiusMeters: 50,
  },
] as const;

// JADWAL REFERENSI AWAL (SEBAGAI RUJUKAN AWAL, BUKAN HARDCODE STATIS)
// Aplikasi tetap dinamis: asisten dapat mengedit, menambah, dan mengubah jadwal.
export const INITIAL_SCHEDULE_REFERENCE: Record<string, GroupScheduleInfo[]> = {
  'Dasar Pemrograman': [
    { groupCode: 'A1', day: 'Senin', timeRange: '08.00 - 10.00', labCode: 'B', assistants: { assistant1: 'Mackenzie Rado Sipangkar', assistant2: 'Albartar Mauran Sriwijaya' } },
    { groupCode: 'A2', day: 'Senin', timeRange: '08.00 - 10.00', labCode: 'C', assistants: { assistant1: 'Muhammad Sirrul Irsyad', assistant2: 'Vito Aliffiano Royyandinova' } },
    { groupCode: 'B1', day: 'Senin', timeRange: '13.00 - 15.00', labCode: 'B', assistants: { assistant1: 'Nasya Auryn Bunga Indaryan', assistant2: "Fatimah Az'zahra Jannatul Mursid" } },
    { groupCode: 'B2', day: 'Senin', timeRange: '13.00 - 15.00', labCode: 'C', assistants: { assistant1: 'Visco Argatha Tawa Tawa', assistant2: 'Muhammad Firdaus Subhan' } },
    { groupCode: 'C1', day: 'Selasa', timeRange: '08.00 - 10.00', labCode: 'D', assistants: { assistant1: 'Muhammad Ravilino Prasetyo', assistant2: 'Gamma Abdillah Muqorrobin' } },
    { groupCode: 'C2', day: 'Selasa', timeRange: '10.10 - 12.10', labCode: 'D', assistants: { assistant1: 'Mochamad Farrel Abyantara', assistant2: 'Muhammad Hanif' } },
    { groupCode: 'D1', day: 'Rabu', timeRange: '13.00 - 15.00', labCode: 'D', assistants: { assistant1: 'Johansen Beltsazar Siahaan', assistant2: 'Toribio Desmond Donovan' } },
    { groupCode: 'D2', day: 'Senin', timeRange: '15.40 - 17.40', labCode: 'D', assistants: { assistant1: 'Joseph Marco Tanuwidjaja', assistant2: 'Dimas Angga Saputra' } },
    { groupCode: 'E1', day: 'Jumat', timeRange: '09.40 - 11.40', labCode: 'D', assistants: { assistant1: 'Raditya Arganta Anantio', assistant2: 'Wendi Adi Ardiansah' } },
    { groupCode: 'E2', day: 'Jumat', timeRange: '13.20 - 15.20', labCode: 'D', assistants: { assistant1: 'Farrel Athaya Firdaus', assistant2: 'Masirotuzzaman Fatwa Gemintang' } },
    { groupCode: 'F1', day: 'Kamis', timeRange: '13.00 - 15.00', labCode: 'B', assistants: { assistant1: 'Farrelino Arvia Atmajaya', assistant2: 'Fathin Arva Alfausta Marsetyo' } },
    { groupCode: 'F2', day: 'Kamis', timeRange: '13.00 - 15.00', labCode: 'C', assistants: { assistant1: 'Muhammad Akbar Suryawan', assistant2: 'Nabil Al Gazaska Warno Putra' } },
  ],
  'Dasar Sistem': [
    { groupCode: 'A1', day: 'Senin', timeRange: '10.10 - 12.10', labCode: 'B', assistants: { assistant1: 'Davin Ihza Pramudya', assistant2: 'Fatha Shaumu Muhammad Aliftha' } },
    { groupCode: 'A2', day: 'Senin', timeRange: '10.10 - 12.10', labCode: 'C', assistants: { assistant1: 'Cindy Claudia Sihotang', assistant2: 'Justin Christian Lumbantobing' } },
    { groupCode: 'B1', day: 'Rabu', timeRange: '15.40 - 17.40', labCode: 'C', assistants: { assistant1: 'Kaylila Hajar Cendekia', assistant2: 'Nazyha Zahara Al-Mumtaza' } },
    { groupCode: 'B2', day: 'Kamis', timeRange: '13.00 - 15.00', labCode: 'AP', assistants: { assistant1: 'Joshua Briliant Suryana', assistant2: 'Fransiska Nindita Iswari' } },
    { groupCode: 'C1', day: 'Kamis', timeRange: '15.40 - 17.40', labCode: 'B', assistants: { assistant1: 'Pusparanu Fachri Aulia', assistant2: 'M. Fairuz Aufa Nadhir' } },
    { groupCode: 'C2', day: 'Kamis', timeRange: '15.40 - 17.40', labCode: 'D', assistants: { assistant1: 'Shafira Joan Athaya Alifya', assistant2: 'Nazla Fairuza Asnura Ichda' } },
    { groupCode: 'D1', day: 'Jumat', timeRange: '09.40 - 11.40', labCode: 'B', assistants: { assistant1: 'Nadia Lailatun', assistant2: 'Amara Revi Khayla Karunia Mulya' } },
    { groupCode: 'D2', day: 'Kamis', timeRange: '15.40 - 17.40', labCode: 'C', assistants: { assistant1: 'Ibnu Farrel Athaillah Firdaus', assistant2: 'Rizqi Ramadhan' } },
    { groupCode: 'E1', day: 'Selasa', timeRange: '08.00 - 10.00', labCode: 'B', assistants: { assistant1: 'Bintang Krisna Yudha', assistant2: 'Albartar Mauran Sriwijaya' } },
    { groupCode: 'E2', day: 'Selasa', timeRange: '08.00 - 10.00', labCode: 'C', assistants: { assistant1: 'Fatimah Azzakiyah', assistant2: 'Talita Elvina Putri Kusuma' } },
    { groupCode: 'F1', day: 'Senin', timeRange: '08.00 - 10.00', labCode: 'D', assistants: { assistant1: 'Keysha Amanda Maharani', assistant2: "Fatimah Az'zahra Jannatul Mursid" } },
    { groupCode: 'F2', day: 'Senin', timeRange: '08.00 - 10.00', labCode: 'AP', assistants: { assistant1: 'Rafa Akbar Sidiarsya', assistant2: 'Kevin Lief Sitorus' } },
  ],
  'Struktur Data': [
    { groupCode: 'A1', day: 'Kamis', timeRange: '08.00 - 10.00', labCode: 'B', assistants: { assistant1: "Dzaki Fathul 'Alim Cahyo", assistant2: 'Nadia Azura Nurhaniya' } },
    { groupCode: 'A2', day: 'Kamis', timeRange: '08.00 - 10.00', labCode: 'C', assistants: { assistant1: 'Husni Ulyaa Khanifah', assistant2: "Hana Nafi'atul Haq" } },
    { groupCode: 'B1', day: 'Kamis', timeRange: '13.00 - 15.00', labCode: 'D', assistants: { assistant1: "Dzaki Fathul 'Alim Cahyo", assistant2: 'An Al Rivaldi' } },
    { groupCode: 'B2', day: 'Kamis', timeRange: '08.00 - 10.00', labCode: 'D', assistants: { assistant1: 'Silvani Salsabilla', assistant2: 'Ruth Septriana Sipangkar' } },
    { groupCode: 'C1', day: 'Senin', timeRange: '15.40 - 17.40', labCode: 'C', assistants: { assistant1: 'Muhammad Rofad Hamdani', assistant2: 'Muhammad Fahri' } },
    { groupCode: 'C2', day: 'Selasa', timeRange: '13.00 - 15.00', labCode: 'D', assistants: { assistant1: 'Maulana Ghazzam Adil Al Faiq', assistant2: "Haydar Rafi' Sultansyah" } },
    { groupCode: 'D1', day: 'Selasa', timeRange: '10.10 - 12.10', labCode: 'B', assistants: { assistant1: 'Annis Fakhiroh Akbar', assistant2: 'Anggita Kirana Puspa' } },
    { groupCode: 'D2', day: 'Selasa', timeRange: '10.10 - 12.10', labCode: 'C', assistants: { assistant1: 'Yasmina Syahidah', assistant2: 'Syafira Azka Ramadhani' } },
    { groupCode: 'E1', day: 'Rabu', timeRange: '08.00 - 10.00', labCode: 'B', assistants: { assistant1: 'Galvin Shalahudin Mumtaz', assistant2: 'Dinda Isyariani' } },
    { groupCode: 'E2', day: 'Rabu', timeRange: '08.00 - 10.00', labCode: 'C', assistants: { assistant1: 'Muhammad Izzat Fauzan Putra Arya', assistant2: 'Muhammad Firdaus Argifari' } },
  ],
  'Basis Data': [
    { groupCode: 'A1', day: 'Rabu', timeRange: '13.00 - 15.00', labCode: 'B', assistants: { assistant1: 'Syifa Aeni Mudrikah', assistant2: 'Silvani Salsabilla' } },
    { groupCode: 'A2', day: 'Rabu', timeRange: '13.00 - 15.00', labCode: 'C', assistants: { assistant1: 'Lintang Aulia Nuraini', assistant2: 'Annis Fakhiroh Akbar' } },
    { groupCode: 'B1', day: 'Selasa', timeRange: '15.40 - 17.40', labCode: 'B', assistants: { assistant1: 'Dian Berlian', assistant2: 'Nabila Kayla Rafa' } },
    {
      groupCode: 'B2',
      day: 'Selasa',
      timeRange: '15.40 - 17.40',
      labCode: 'C',
      assistants: { assistant1: 'Muhammad Fikri', assistant2: 'Farras Hilmy Zaidan' },
      hasDiscrepancy: true,
      notes:
        'DISCREPANCY FLAGGED: Header berkas peserta sheet B2 mencantumkan "Dasar Sistem", sedangkan Jadwal Pengumuman mencantumkan "Basis Data B2 Lab C Selasa 15.40-17.40". Belum diverifikasi final.',
    },
    { groupCode: 'C1', day: 'Rabu', timeRange: '08.00 - 10.00', labCode: 'D', assistants: { assistant1: 'Nayla Husna', assistant2: 'Khanza Qaila' } },
    { groupCode: 'C2', day: 'Rabu', timeRange: '08.00 - 10.00', labCode: 'AP', assistants: { assistant1: 'Raffi Arditama', assistant2: 'Rafa Azlan' } },
    { groupCode: 'D1', day: 'Selasa', timeRange: '13.00 - 15.00', labCode: 'B', assistants: { assistant1: 'An Al Rivaldi', assistant2: 'Jordan Tenggara' } },
    { groupCode: 'D2', day: 'Selasa', timeRange: '13.00 - 15.00', labCode: 'C', assistants: { assistant1: 'Diah Maulida Pratiwi', assistant2: 'Birela Miadeta Purita' } },
    { groupCode: 'E1', day: 'Kamis', timeRange: '08.00 - 10.00', labCode: 'AP', assistants: { assistant1: 'Muhammad Nauval Fadli', assistant2: 'Muhammad Akmal Fazli' } },
    { groupCode: 'E2', day: 'Rabu', timeRange: '13.00 - 15.00', labCode: 'AP', assistants: { assistant1: 'Eileen Albert Tandrio', assistant2: 'Dinda Isyariani' } },
    { groupCode: 'F1', day: 'Rabu', timeRange: '15.40 - 17.40', labCode: 'B', assistants: { assistant1: 'Raffi Arditama', assistant2: 'Rafa Azlan' } },
  ],
  'Sistem Operasi': [
    { groupCode: 'A1', day: 'Jumat', timeRange: '15.40 - 17.40', labCode: 'B', assistants: { assistant1: 'Puti Shasta', assistant2: 'Alyssa Shane' } },
    { groupCode: 'A2', day: 'Jumat', timeRange: '15.40 - 17.40', labCode: 'C', assistants: { assistant1: 'Muhammad Izzat Fauzan Putra Arya', assistant2: 'Muhammad Firdaus Argifari' } },
    { groupCode: 'B1', day: 'Kamis', timeRange: '10.10 - 12.10', labCode: 'C', assistants: { assistant1: 'Husni Ulyaa Khanifah', assistant2: "Hana Nafi'atul Haq" } },
    { groupCode: 'B2', day: 'Jumat', timeRange: '13.20 - 15.20', labCode: 'B', assistants: { assistant1: 'Crystiano Bayu Satya Alves', assistant2: 'Adhyaksa Margandatua Banjar Nahor' } },
    { groupCode: 'C1', day: 'Kamis', timeRange: '15.40 - 17.40', labCode: 'AP', assistants: { assistant1: 'Ruth Septriana Sipangkar', assistant2: 'Revalina Salwa Aliya Wicaksono Prabowo' } },
    { groupCode: 'C2', day: 'Jumat', timeRange: '09.40 - 11.40', labCode: 'C', assistants: { assistant1: 'Galvin Shalahudin Mumtaz', assistant2: 'Jordan Tenggara' } },
    { groupCode: 'D1', day: 'Jumat', timeRange: '07.40 - 09.40', labCode: 'C', assistants: { assistant1: 'Maulana Ghazzam Adil Al Faiq', assistant2: 'Ikrar Maheswara Rabbani Wibowo' } },
    { groupCode: 'D2', day: 'Jumat', timeRange: '13.20 - 15.20', labCode: 'D', assistants: { assistant1: 'Puti Shasta', assistant2: 'Galang Bintang' } },
    { groupCode: 'E1', day: 'Senin', timeRange: '15.40 - 17.40', labCode: 'B', assistants: { assistant1: 'Nawaal Hanif Mumtaz Arriye', assistant2: 'Muhammad Fikri' } },
    { groupCode: 'E2', day: 'Senin', timeRange: '15.40 - 17.40', labCode: 'AP', assistants: { assistant1: 'Raffie Aditya Akbar', assistant2: 'Syuraih Umar Khotthob' } },
  ],
  'Pengembangan Platform Khusus': [
    { groupCode: 'A1', day: 'Rabu', timeRange: '10.10 - 12.10', labCode: 'D', assistants: { assistant1: 'Nicholas Gunawan', assistant2: 'Muhammad Farhan Al Ghifari' } },
    { groupCode: 'A2', day: 'Kamis', timeRange: '10.10 - 12.10', labCode: 'D', assistants: { assistant1: 'Nicholas Gunawan', assistant2: 'Muhammad Farhan Al Ghifari' } },
    { groupCode: 'B1', day: 'Jumat', timeRange: '07.40 - 09.40', labCode: 'AP', assistants: { assistant1: 'Siriel Wafa Nuriel Fahri', assistant2: 'Indah Nurul Janah' } },
    { groupCode: 'B2', day: 'Rabu', timeRange: '18.15 - 20.15', labCode: 'D', assistants: { assistant1: 'Gege Centiana Putra', assistant2: 'Gibran Ahmad Maulana' } },
    { groupCode: 'C1', day: 'Rabu', timeRange: '18.15 - 20.15', labCode: 'C', assistants: { assistant1: 'Siriel Wafa Nuriel Fahri', assistant2: 'Indah Nurul Janah' } },
    { groupCode: 'C2', day: 'Jumat', timeRange: '07.40 - 09.40', labCode: 'D', assistants: { assistant1: 'Bramantyo Kunni Nurrisqi', assistant2: 'Agathan Khairy Bowo Laksono' } },
    { groupCode: 'D1', day: 'Rabu', timeRange: '10.10 - 12.10', labCode: 'C', assistants: { assistant1: 'Gege Centiana Putra', assistant2: 'Gibran Ahmad Maulana' } },
    { groupCode: 'D2', day: 'Rabu', timeRange: '15.40 - 17.40', labCode: 'D', assistants: { assistant1: 'Bramantyo Kunni Nurrisqi', assistant2: 'Cipta Fikri Wiratama' } },
  ],
  'Pembelajaran Mesin': [
    { groupCode: 'A1', day: 'Jumat', timeRange: '07.40 - 09.40', labCode: 'B', assistants: { assistant1: 'Dary Ihsan Amanullah', assistant2: 'Farah Aulia Zahra' } },
    { groupCode: 'A2', day: 'Jumat', timeRange: '15.40 - 17.40', labCode: 'D', assistants: { assistant1: 'Nicholas Gunawan', assistant2: 'Mutiara Aisyah Salsabila' } },
    { groupCode: 'B1', day: 'Senin', timeRange: '10.10 - 12.10', labCode: 'D', assistants: { assistant1: 'Alvin Haristianto', assistant2: 'Gege Centiana Putra' } },
    { groupCode: 'B2', day: 'Senin', timeRange: '10.10 - 12.10', labCode: 'AP', assistants: { assistant1: 'Muhammad Kievlan Hakim', assistant2: 'Muhammad Yoga Aminudin' } },
    { groupCode: 'C1', day: 'Kamis', timeRange: '10.10 - 12.10', labCode: 'B', assistants: { assistant1: 'Radityantari Kusuma Wardani', assistant2: 'Zuyyina Amalia' } },
    { groupCode: 'C2', day: 'Rabu', timeRange: '10.10 - 12.10', labCode: 'B', assistants: { assistant1: 'Indah Nurul Janah', assistant2: 'Brilianita Eva Syafitri' } },
    { groupCode: 'D1', day: 'Selasa', timeRange: '10.10 - 12.10', labCode: 'AP', assistants: { assistant1: 'Nadia Syifa Khairunnisa', assistant2: 'Oliver Gunawan Martua Sihaloho' } },
    { groupCode: 'D2', day: 'Jumat', timeRange: '09.40 - 11.40', labCode: 'AP', assistants: { assistant1: 'Bramantyo Kunni Nurrisqi', assistant2: 'Bagus Athallah' } },
  ],
};

// DOKUMENTASI DISKREPANSI DATA SUMBER
export const DATA_DISCREPANCIES = [
  {
    id: 'DISC-01',
    sourceFileA: '[Announcement] Jadwal Praktikum Ganjil 2026.xlsx (Sheet: Jadwal Praktikum)',
    sourceFileB: 'Daftar Peserta Praktikum BASIS DATA 2026.xlsx (Sheet: B2)',
    description:
      'Pada pengumuman jadwal, kelompok B2 tertera untuk mata kuliah Basis Data (Lab C, Selasa 15.40 - 17.40). Namun pada berkas daftar peserta Basis Data sheet B2, header mata kuliah tertulis "Dasar Sistem".',
    status: 'UNRESOLVED_FLAGGED',
    actionTaken:
      'Sesuai mandat, perbedaan data ini tidak diselesaikan secara sepihak dan ditandai (flagged) agar diverifikasi lebih lanjut oleh koordinator laboratorium sebelum diimpor ke data produksi.',
  },
] as const;

export interface MainClassHierarchy {
  className: string; // misal 'Kelas A'
  classLetter: string; // misal 'A'
  groups: string[]; // misal ['A1', 'A2']
}

export interface CourseHierarchy {
  courseName: string;
  courseCode: string;
  mainClasses: MainClassHierarchy[];
}

/**
 * Mendapatkan struktur hierarki akademik Mata Kuliah -> Kelas Utama -> Kelompok
 */
export const getAcademicHierarchyForCourse = (courseName: string): CourseHierarchy => {
  const found = OFFICIAL_COURSES.find(
    (c) => c.name.toLowerCase() === courseName.trim().toLowerCase()
  );

  const groups = found ? [...found.groups] : ['A1', 'A2', 'B1', 'B2'];
  const code = found ? found.code : 'PAIK';

  const map: Record<string, string[]> = {};
  for (const g of groups) {
    const letter = g.charAt(0).toUpperCase();
    if (!map[letter]) map[letter] = [];
    map[letter].push(g);
  }

  const mainClasses = Object.keys(map)
    .sort()
    .map((letter) => ({
      className: `Kelas ${letter}`,
      classLetter: letter,
      groups: map[letter],
    }));

  return {
    courseName,
    courseCode: code,
    mainClasses,
  };
};

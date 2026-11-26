# Sprint 4 — Models, API Contract & Payment Architecture

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_TASK_DIVISION.md](./SPRINT_4_TASK_DIVISION.md)
> - [SPRINT_4_RULES_AND_BOUNDARIES.md](./SPRINT_4_RULES_AND_BOUNDARIES.md)

Dokumen ini menjadi kontrak teknis tunggal bagi **Wipin**, **Aron**, dan **Naufal**. Tidak ada programmer yang diperbolehkan mengubah nama koleksi, nama field kontrak, atau payload API secara sepihak tanpa pembaruan dokumen ini.

---

## 1. Keputusan Arsitektur Role (`Aslab` vs `Asprak`)

Berdasarkan audit `origin/main`:
- `src/types/models.ts` sudah memiliki `UserRole = 'assistant' | 'student'` serta `assistantRole?: string` pada `UserProfile`.
- `firestore.rules` menggunakan `isAssistant()` (`role == 'assistant'`) dan `app/_layout.tsx` mengarahkan `currentRole === 'assistant'` ke layar asisten.

### Keputusan Arsitektur
**Aslab dan Asprak direpresentasikan sebagai subrole pada `UserProfile.assistantRole`** dengan tetap mempertahankan `UserProfile.role = 'assistant'`:

```ts
export type UserRole = 'assistant' | 'student';
export type AssistantSubRole = 'aslab' | 'asprak';
```

- `role: 'assistant'` + `assistantRole: 'aslab'` -> **Aslab** (Manajemen Lab, Bulk Insert, Distribusi, Dashboard Lab).
- `role: 'assistant'` + `assistantRole: 'asprak'` -> **Asprak** (Pengelolaan Sesi, Monitoring Presensi, Review Izin).
- **Kompatibilitas Migrasi:** Akun asisten lama yang belum memiliki field `assistantRole` di Firestore diperlakukan default sebagai `'asprak'` (prinsip *least privilege*) sampai di-assign menjadi `'aslab'` di dokumen `users/{uid}`.

---

## 2. Struktur Koleksi & Data Model Firestore

### Koleksi Eksisting + Perluasan Sprint 4

| Koleksi | Document ID | Perubahan di Sprint 4 |
| :--- | :--- | :--- |
| `users` | `{uid}` | Penambahan `assistantRole?: 'aslab' \| 'asprak'`, `assignedLabIds?: string[]` |
| `laboratories` | `{labId}` | Penambahan `courseCode`, `courseName`, `locationName`, `gracePeriodMinutes`, `fineAmount`, `aslabId`, `assistantIds`, `studentIds` |
| `classes` | `{classId}` | Dipertahankan untuk kompatibilitas Sprint 2–3 |
| `sessions` | `{sessionId}` | Penambahan `gracePeriodMinutes?: number`, `fineAmount?: number` |
| `attendance` | `${sessionId}_${studentId}` | Penambahan `attendanceStatus: 'ON_TIME' \| 'LATE' \| 'EXCUSED'`, `lateMinutes`, `fineInvoiceId?` |
| `leaveRequests` | `{leaveId}` | Terintegrasi dengan pengecualian denda & status `EXCUSED` |
| **`fineInvoices`** *(Baru)* | `${sessionId}_${studentId}` | Tagihan denda keterlambatan (maksimal 1 per kejadian) |
| **`paymentTransactions`** *(Baru)* | `{orderId}` | Riwayat percobaan & status transaksi Midtrans Sandbox |
| `notificationDispatches` | `{dispatchId}` | Diperluas untuk event `FINE_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED` |

### Definisi TypeScript Kontrak (`src/types/models.ts`)

```ts
export type AssistantSubRole = 'aslab' | 'asprak';

export interface Laboratory {
  id: string;
  name: string;
  courseCode: string;
  courseName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  gracePeriodMinutes: number; // default misal 15
  fineAmount?: number; // nominal tetap IDR jika dikonfigurasi per lab/global
  aslabId: string;
  assistantIds: string[]; // daftar uid Asprak yang ditugaskan
  studentIds: string[]; // daftar uid Praktikan yang ditempatkan
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendancePunctualityStatus = 'ON_TIME' | 'LATE' | 'EXCUSED';

export type FineInvoiceStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'WAIVED';

export interface FineInvoice {
  id: string; // wajib `${sessionId}_${studentId}`
  sessionId: string;
  sessionTitle: string;
  courseCode: string;
  courseName: string;
  laboratoryId: string;
  laboratoryName: string;
  studentId: string;
  studentNim: string;
  studentName: string;
  className: string;
  attendanceId: string;
  attendanceTimestamp: string; // ISO UTC
  sessionStartAt: string; // ISO UTC hasil konversi Asia/Jakarta
  gracePeriodMinutes: number;
  lateMinutes: number;
  amount: number; // nominal tetap IDR (> 0)
  status: FineInvoiceStatus;
  latestOrderId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentTransaction {
  orderId: string;
  invoiceId: string;
  studentId: string;
  sessionId: string;
  amount: number;
  provider: 'midtrans_sandbox';
  snapToken?: string;
  redirectUrl?: string;
  paymentType?: string | null;
  midtransTransactionId?: string | null;
  midtransStatus?: string; // settlement, pending, expire, cancel, deny, failure
  status: PaymentStatus;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Kontrak Perhitungan Keterlambatan (*Grace Period*)

1. **Sumber Konfigurasi:** `gracePeriodMinutes` diambil dari `Session.gracePeriodMinutes` jika tersedia, atau fallback ke `Laboratory.gracePeriodMinutes` (default `15` menit).
2. **Konversi Waktu:**
   - Gabungkan `session.date` (`YYYY-MM-DD`) dan `session.startTime` (`HH:mm`) sebagai waktu lokal `Asia/Jakarta` (`+07:00`) -> `sessionStartMs`.
   - `toleranceDeadlineMs = sessionStartMs + gracePeriodMinutes * 60_000`.
   - `attendedMs = Date.parse(attendance.timestamp)`.
3. **Aturan Penentuan:**
   - Jika praktikan memiliki `leaveRequests` berstatus `APPROVED` pada `sessionId` tersebut -> `attendanceStatus = 'EXCUSED'`, **tidak dibuatkan `FineInvoice`** (atau `WAIVED`).
   - Jika `attendedMs <= toleranceDeadlineMs` -> `attendanceStatus = 'ON_TIME'`, `lateMinutes = 0`, tidak ada denda.
   - Jika `attendedMs > toleranceDeadlineMs` -> `attendanceStatus = 'LATE'`, `lateMinutes = Math.ceil((attendedMs - toleranceDeadlineMs) / 60_000)` (atau selisih dari `sessionStartMs`), dan buat `fineInvoices/${sessionId}_${studentId}` dengan `status: 'UNPAID'`.
4. **Anti-Duplikasi:** Karena ID dokumen `fineInvoices` adalah `${sessionId}_${studentId}`, transaksi backend memeriksa eksistensi dokumen sebelum membuat tagihan.

---

## 4. Kontrak Backend & API Pembayaran (Midtrans Sandbox)

Backend berjalan di Node.js (`backend-payment/` atau modul baru di `local-notification-backend/`) menggunakan `firebase-admin` dan `MIDTRANS_SERVER_KEY` (dari `.env` server, **bukan** dari aplikasi Expo).

### Variabel Environment Backend
- `MIDTRANS_SERVER_KEY` (Sandbox Server Key — **hanya di backend**)
- `MIDTRANS_IS_PRODUCTION=false`
- `EXPO_PUBLIC_PAYMENT_API_URL` (URL base backend untuk aplikasi React Native)

### Endpoint REST API

#### 1. `POST /api/payments/create-transaction`
- **Header:** `Authorization: Bearer <firebase_id_token>`
- **Request Body:**
  ```json
  { "invoiceId": "sess123_uid456" }
  ```
- **Validasi Backend:**
  1. Verifikasi Firebase ID Token -> `uid`.
  2. Ambil `fineInvoices/{invoiceId}`. Tolak `404` jika tidak ada, `403` jika `invoice.studentId !== uid`, `409` jika `invoice.status === 'PAID'` atau `'WAIVED'`.
  3. Buat `orderId` unik: `LABSYNC-${invoiceId}-${Date.now()}`.
  4. Panggil Midtrans Sandbox Snap API (`https://app.sandbox.midtrans.com/snap/v1/transactions`).
  5. Simpan `paymentTransactions/{orderId}` (`status: 'pending'`) dan update `fineInvoices/{invoiceId}.status = 'PENDING'`, `latestOrderId = orderId`.
- **Response (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": {
      "orderId": "LABSYNC-sess123_uid456-1764000000",
      "snapToken": "...",
      "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/..."
    }
  }
  ```

#### 2. `POST /api/payments/midtrans-webhook`
- **Sumber:** Server Midtrans Sandbox.
- **Validasi Signature Wajib:**
  `expected = SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`.
  Jika `signature_key !== expected`, kembalikan `403 Forbidden`.
- **Pemetaan Status:**
  - `capture` (`fraud_status === 'accept'`) atau `settlement` -> `PaymentStatus = 'success'`, `FineInvoiceStatus = 'PAID'`.
  - `pending` -> `PaymentStatus = 'pending'`, `FineInvoiceStatus = 'PENDING'`.
  - `deny`, `cancel`, `expire`, `failure` -> `PaymentStatus = 'failed'`, `FineInvoiceStatus = 'FAILED'`.
- **Idempotency:**
  - Jalankan dalam `db.runTransaction()`. Jika `paymentTransactions/{orderId}.status === 'success'` atau `fineInvoices/{invoiceId}.status === 'PAID'`, jangan lakukan mutasi ulang maupun kirim notifikasi ganda; langsung kembalikan `200 OK`.
- **Trigger Notifikasi:**
  - Saat transisi status menjadi `'success'` -> kirim `PAYMENT_SUCCESS`.
  - Saat transisi status menjadi `'failed'` -> kirim `PAYMENT_FAILED`.

#### 3. `GET /api/payments/status/:orderId`
- **Header:** `Authorization: Bearer <firebase_id_token>`
- Mengambil status terbaru transaksi milik `uid` (atau sinkronisasi ke Midtrans `/v2/{order_id}/status` bila masih `pending`).

---

## 5. Kontrak Hook & Service Client (Untuk Aron & Wipin)

Disediakan oleh **Naufal** di `src/services/fineService.ts`, `src/services/paymentService.ts`, dan `src/hooks/useFines.ts`:

```ts
export interface UseFinesResult {
  invoices: FineInvoice[]; // untuk student: miliknya sendiri; untuk aslab: seluruh/terfilter lab
  transactions: PaymentTransaction[];
  loading: boolean;
  createCheckoutTransaction: (
    invoiceId: string
  ) => Promise<ApiResponse<{ orderId: string; snapToken: string; redirectUrl: string }>>;
  syncTransactionStatus: (orderId: string) => Promise<ApiResponse<PaymentTransaction>>;
}
```

- **Aron** menggunakan `invoices`, `transactions`, `createCheckoutTransaction`, dan komponen checkout Midtrans Naufal pada halaman `app/student/payments.tsx`.
- **Wipin** menggunakan `invoices` (status `PAID` / `UNPAID` / `PENDING`) dan `transactions` untuk menghitung total pemasukan denda serta menampilkan riwayat keuangan pada Dashboard Aslab dengan filter Harian/Mingguan/Bulanan.

---

## 6. Kontrak Event Notifikasi Sprint 4

Memperluas `local-notification-backend` (Sprint 3):

| Event Type | Pemicu | Penerima | Deep Link (`data.url`) |
| :--- | :--- | :--- | :--- |
| `FINE_CREATED` | Dokumen baru di `fineInvoices` (`status: 'UNPAID'`) | `invoice.studentId` | `/student/payments` |
| `PAYMENT_SUCCESS` | Transisi `paymentTransactions.status -> 'success'` (via webhook) | `tx.studentId` | `/student/payments` |
| `PAYMENT_FAILED` | Transisi `paymentTransactions.status -> 'failed'` (via webhook) | `tx.studentId` | `/student/payments` |

---

## 7. Matriks Hak Akses & Firestore Security Rules

| Koleksi | Praktikan | Asprak | Aslab | Backend Admin SDK |
| :--- | :--- | :--- | :--- | :--- |
| `laboratories` | Read | Read | Read, Create, Update, Delete | Full |
| `sessions` | Read | Read, Create/Update/Open/Close (sesi penugasannya) | Read | Full |
| `attendance` | Read (milik sendiri), Create (milik sendiri) | Read, Update terbatas (sesi penugasannya) | Read | Full |
| `leaveRequests` | Read/Create (milik sendiri) | Read, Update `APPROVED`/`REJECTED` | Read | Full |
| `fineInvoices` | Read (milik sendiri) | Read (opsional sesi penugasan) | Read (monitoring keuangan) | **Write Only** (Create/Update) |
| `paymentTransactions` | Read (milik sendiri) | Deny | Read (monitoring keuangan) | **Write Only** (Create/Update) |

> **Catatan Keamanan:** Client (`student`, `asprak`, `aslab`) **dilarang** melakukan `create` atau `update` langsung pada `fineInvoices` dan `paymentTransactions` di `firestore.rules` (`allow write: if false;` untuk client). Semua mutasi dilakukan oleh backend via `firebase-admin`.

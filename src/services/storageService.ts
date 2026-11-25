/**
 * LABSYNC FIREBASE STORAGE SERVICE
 *
 * Mengelola upload dan penghapusan dokumen pendukung izin praktikum.
 * Memvalidasi batas ukuran (maksimal 10 MB per file) dan format (PDF, JPG, PNG).
 */

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { storage } from './firebaseConfig';
import type { ApiResponse, LeaveAttachmentMeta } from '../types/models';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
];

export interface UploadAttachmentInput {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  userId: string;
}

export const uploadLeaveAttachment = async ({
  uri,
  name,
  size,
  mimeType,
  userId,
}: UploadAttachmentInput): Promise<ApiResponse<LeaveAttachmentMeta>> => {
  try {
    if (!userId) {
      return {
        ok: false,
        success: false,
        message: 'Pengguna belum terautentikasi.',
        errorCode: 'UNAUTHENTICATED',
      };
    }

    if (size && size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        success: false,
        message: 'Ukuran file melebihi batas maksimal 10 MB.',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const detectedMime =
      mimeType ||
      (name.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : name.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg');

    if (
      !ALLOWED_MIME_TYPES.includes(detectedMime) &&
      !detectedMime.startsWith('image/')
    ) {
      return {
        ok: false,
        success: false,
        message: 'Format file tidak didukung. Harap unggah file PDF, JPG, atau PNG.',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Ubah file URI lokal menjadi Blob untuk upload ke Firebase Storage
    const response = await fetch(uri);
    const blob = await response.blob();

    if (blob.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        success: false,
        message: 'Ukuran file melebihi batas maksimal 10 MB.',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `leaveAttachments/${userId}/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: detectedMime,
      customMetadata: {
        originalName: name,
        uploadedBy: userId,
      },
    });

    let downloadUrl: string | undefined;
    try {
      downloadUrl = await getDownloadURL(snapshot.ref);
    } catch {
      // Jika downloadUrl tidak dapat dibuat, storagePath tetap tersimpan aman
      downloadUrl = undefined;
    }

    const attachment: LeaveAttachmentMeta = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fileName: name,
      fileSize: blob.size || size || 0,
      mimeType: detectedMime,
      storagePath,
      downloadUrl,
      uploadedAt: new Date().toISOString(),
    };

    return {
      ok: true,
      success: true,
      message: 'File berhasil diunggah ke penyimpanan cloud.',
      data: attachment,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('[StorageService] Gagal mengunggah lampiran:', error);

    if (errorMsg.toLowerCase().includes('storage/unauthorized')) {
      return {
        ok: false,
        success: false,
        message: 'Akses Firebase Storage ditolak. Periksa Storage Security Rules.',
        errorCode: 'FORBIDDEN',
      };
    }

    if (errorMsg.toLowerCase().includes('storage/bucket-not-found') || errorMsg.includes('unconfigured')) {
      return {
        ok: false,
        success: false,
        message: 'Layanan Firebase Storage belum aktif di Firebase Console. Hubungi administrator.',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    return {
      ok: false,
      success: false,
      message: 'Gagal mengunggah dokumen pendukung. Periksa koneksi internet Anda.',
      errorCode: 'INTERNAL_ERROR',
    };
  }
};

/** Menghapus file orphan dari Storage jika pembuatan izin di Firestore gagal */
export const deleteLeaveAttachmentFile = async (
  storagePath: string
): Promise<void> => {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('[StorageService] Gagal menghapus file orphan:', err);
  }
};

import type {
  AIClassificationResult,
  ApiResponse,
} from '../types/models';

type AIErrorReporter = (
  source: 'ai',
  message: string
) => void;

// Reporter didaftarkan oleh useLeave agar service tidak perlu
// mengimpor React Context secara langsung.
let aiErrorReporter: AIErrorReporter | null = null;

export const setAIErrorReporter = (
  reporter: AIErrorReporter | null
): void => {
  aiErrorReporter = reporter;
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
};

const firstText = (values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const parseConfidence = (values: unknown[]): number | null => {
  for (const value of values) {
    const numberValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      continue;
    }

    if (numberValue <= 1) return numberValue;
    if (numberValue <= 100) return numberValue / 100;
  }

  return null;
};

const reportAIError = (message: string): void => {
  try {
    aiErrorReporter?.('ai', message);
  } catch {
    // Kegagalan pelaporan tidak boleh menggagalkan pengajuan izin.
  }
};

const unavailableResponse = (
  message: string
): ApiResponse<AIClassificationResult> => {
  reportAIError(message);

  const now = new Date().toISOString();

  return {
    ok: false,
    success: false,
    message,
    errorCode: 'AI_UNAVAILABLE',
    data: {
      category: 'Belum Terklasifikasi (Layanan AI Tidak Tersedia)',
      confidence: null,
      status: 'UNAVAILABLE',
      errorMessage: message,
      classifiedAt: now,
    },
  };
};

const failedResponse = (
  message: string
): ApiResponse<AIClassificationResult> => {
  reportAIError(message);

  return {
    ok: false,
    success: false,
    message,
    errorCode: 'INTERNAL_ERROR',
    data: {
      category: 'Tidak Diketahui',
      confidence: null,
      status: 'FAILED',
      errorMessage: message,
      classifiedAt: new Date().toISOString(),
    },
  };
};

const parseClassification = (
  payload: unknown
): { category: string; confidence: number | null } | null => {
  const root = asRecord(payload);

  if (!root) return null;

  const data = asRecord(root.data);
  const prediction = asRecord(root.prediction);
  const dataPrediction = asRecord(data?.prediction);

  const category = firstText([
    root.category,
    root.label,
    typeof root.prediction === 'string' ? root.prediction : undefined,

    data?.category,
    data?.label,
    typeof data?.prediction === 'string'
      ? data.prediction
      : undefined,

    prediction?.category,
    prediction?.label,
    prediction?.class,

    dataPrediction?.category,
    dataPrediction?.label,
    dataPrediction?.class,
  ]);

  if (!category) return null;

  const confidence = parseConfidence([
    root.confidence,
    root.score,
    data?.confidence,
    data?.score,
    prediction?.confidence,
    prediction?.score,
    dataPrediction?.confidence,
    dataPrediction?.score,
  ]);

  return { category, confidence };
};

export const classifyLeaveReason = async (
  reason: string
): Promise<ApiResponse<AIClassificationResult>> => {
  const endpoint = process.env.EXPO_PUBLIC_AI_API_URL?.trim();

  if (!endpoint) {
    return unavailableResponse(
      'Layanan AI belum dikonfigurasi. Pengajuan izin tetap dapat disimpan.'
    );
  }

  if (!reason.trim()) {
    return {
      ok: false,
      success: false,
      message: 'Alasan izin tidak boleh kosong.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: reason.trim(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableResponse(
        `Layanan AI mengalami gangguan (HTTP ${response.status}). Pengajuan izin tetap dapat disimpan.`
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      return failedResponse(
        'Respons AI tidak dapat dibaca. Pengajuan izin tetap dapat disimpan.'
      );
    }

    const classification = parseClassification(payload);

    if (!classification) {
      return failedResponse(
        'AI tidak memberikan kategori alasan yang valid.'
      );
    }

    return {
      ok: true,
      success: true,
      message: 'Klasifikasi alasan izin berhasil dilakukan.',
      data: {
        category: classification.category,
        confidence: classification.confidence,
        status: 'SUCCESS',
        rawLabel: classification.category,
        classifiedAt: new Date().toISOString(),
      },
    };
  } catch {
    if (timedOut) {
      return unavailableResponse(
        'Layanan AI tidak merespons dalam 10 detik. Pengajuan izin tetap dapat disimpan.'
      );
    }

    return unavailableResponse(
      'Tidak dapat terhubung ke layanan AI. Periksa koneksi internet. Pengajuan izin tetap dapat disimpan.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

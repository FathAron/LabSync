import type {
  AIClassificationResult,
  ApiResponse,
} from '../types/models';

type AIErrorReporter = (
  source: 'ai',
  message: string
) => void;

interface SentimentPrediction {
  label: string | null;
  status: string;
  scores: number[] | null;
  scoreType: string;
  experimental: boolean;
}

type SentimentClassifier = (text: string) => SentimentPrediction;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createSentimentClassifier } = require('../../model-edom/sentiment') as {
  createSentimentClassifier: (model: unknown) => SentimentClassifier;
};
const edomModel: unknown = require('../../model-edom/model-edom.json');

let cachedClassifier: SentimentClassifier | null = null;

const getClassifier = (): SentimentClassifier => {
  if (!cachedClassifier) {
    cachedClassifier = createSentimentClassifier(edomModel);
  }
  return cachedClassifier;
};

// Reporter didaftarkan oleh useLeave agar service tidak perlu
// mengimpor React Context secara langsung.
let aiErrorReporter: AIErrorReporter | null = null;

export const setAIErrorReporter = (
  reporter: AIErrorReporter | null
): void => {
  aiErrorReporter = reporter;
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

  return {
    ok: false,
    success: false,
    message,
    errorCode: 'AI_UNAVAILABLE',
    data: {
      category: 'Belum Terklasifikasi (Model AI Tidak Tersedia)',
      confidence: null,
      status: 'UNAVAILABLE',
      errorMessage: message,
      classifiedAt: new Date().toISOString(),
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

const computeConfidence = (scores: number[] | null): number | null => {
  if (!Array.isArray(scores) || scores.length === 0) {
    return null;
  }

  const valid = scores.every((value) => typeof value === 'number' && Number.isFinite(value));
  if (!valid) {
    return null;
  }

  const maxScore = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - maxScore));
  const sumExps = exps.reduce((acc, val) => acc + val, 0);

  if (sumExps <= 0 || !Number.isFinite(sumExps)) {
    return null;
  }

  const maxProb = Math.max(...exps) / sumExps;
  return Number(maxProb.toFixed(4));
};

const formatCategoryLabel = (rawLabel: string): string => {
  const trimmed = rawLabel.trim();
  if (!trimmed) return 'Tidak Diketahui';
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return `Sentimen: ${capitalized}`;
};

export const classifyLeaveReason = async (
  reason: string
): Promise<ApiResponse<AIClassificationResult>> => {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return {
      ok: false,
      success: false,
      message: 'Alasan izin tidak boleh kosong.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    const classify = getClassifier();
    const prediction = classify(trimmedReason);

    if (!prediction.label) {
      return failedResponse(
        'Teks alasan belum dikenali kosakata model-edom. Pengajuan izin tetap dapat disimpan.'
      );
    }

    const category = formatCategoryLabel(prediction.label);
    const confidence = computeConfidence(prediction.scores);

    return {
      ok: true,
      success: true,
      message: 'Klasifikasi teks menggunakan model-edom berhasil dilakukan.',
      data: {
        category,
        confidence,
        status: 'SUCCESS',
        rawLabel: prediction.label,
        classifiedAt: new Date().toISOString(),
      },
    };
  } catch {
    return unavailableResponse(
      'Model-edom gagal dimuat. Pengajuan izin tetap dapat disimpan.'
    );
  }
};

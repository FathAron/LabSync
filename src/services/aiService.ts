
import type { AIClassificationResult, ApiResponse } from '../types/models';
type AIErrorReporter = (source: 'ai', message: string) => void;
type SentimentLabel = 'positif' | 'netral' | 'negatif';
type SentimentPrediction = {
  label: SentimentLabel | null;
  status: 'predicted' | 'unknown_vocabulary' | 'empty_input';
  scores: number[] | null;
  scoreType: string;
  experimental: boolean;
};
type SentimentModule = {
  createSentimentClassifier: (model: unknown) => (text: string) => SentimentPrediction;
};
let aiErrorReporter: AIErrorReporter | null = null;
export const setAIErrorReporter = (reporter: AIErrorReporter | null): void => {
  aiErrorReporter = reporter;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sentimentModule = require('../../model-edom/sentiment.js') as SentimentModule;
const sentimentModel = require('../../model-edom/model-edom.json') as unknown;
const predictSentiment = sentimentModule.createSentimentClassifier(sentimentModel);
const reportAIError = (message: string): void => {
  try {
    aiErrorReporter?.('ai', message);
  } catch {
    // Kegagalan pelaporan tidak boleh menggagalkan pengajuan izin.
  }
};
const failedResponse = (
  message: string,
  status: 'FAILED' | 'UNAVAILABLE' = 'FAILED',
): ApiResponse<AIClassificationResult> => {
  reportAIError(message);
  return {
    ok: false,
    success: false,
    message,
    errorCode: status === 'FAILED' ? 'INTERNAL_ERROR' : 'AI_UNAVAILABLE',
    data: {
      category: 'Belum Terklasifikasi',
      confidence: null,
      status,
      errorMessage: message,
      classifiedAt: new Date().toISOString(),
    },
  };
};
export const classifyLeaveReason = async (
  reason: string,
): Promise<ApiResponse<AIClassificationResult>> => {
  const text = reason.trim();
  if (!text) {
    return {
      ok: false,
      success: false,
      message: 'Alasan izin tidak boleh kosong.',
      errorCode: 'VALIDATION_ERROR',
    };
  }
  try {
    const prediction = predictSentiment(text);
    if (prediction.status !== 'predicted' || !prediction.label) {
      return failedResponse(
        prediction.status === 'unknown_vocabulary'
          ? 'Model belum mengenali kata dalam komentar. Coba gunakan kalimat yang lebih jelas.'
          : 'Komentar belum dapat dianalisis.',
      );
    }
    return {
      ok: true,
      success: true,
      message: 'Analisis sentimen berhasil dilakukan secara offline.',
      data: {
        category: prediction.label,
        confidence: null,
        status: 'SUCCESS',
        rawLabel: prediction.label,
        classifiedAt: new Date().toISOString(),
      },
    };
  } catch {
    return failedResponse(
      'Model AI gagal dijalankan. Silakan coba kembali.',
      'UNAVAILABLE',
    );
  }
};

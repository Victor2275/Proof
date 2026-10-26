import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

/**
 * Models are tried in this order, all Flash-family so the free tier covers them.
 * A call falls through to the next model when the one it asked cannot serve it
 * (retired, out of quota, unpaid, overloaded); any other failure — a bad prompt,
 * a bad key — would fail the same on every model, so it is thrown at once.
 * gemini-2.5-* is closed to new projects (404 "no longer available to new users").
 */
export const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

const FALL_THROUGH = new Set([402, 404, 429, 500, 503]);

/** A model that answered 404 is gone for good; stop asking it until restart. */
const retired = new Set<string>();

type Request = Parameters<GenerativeModel['generateContent']>[0];

const getModel = (jsonMode = false) => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const generationConfig = jsonMode ? { responseMimeType: 'application/json' } : undefined;

  return {
    async generateContent(request: Request) {
      let lastError: unknown;
      for (const model of MODELS) {
        if (retired.has(model)) continue;
        try {
          return await genAI.getGenerativeModel({ model, generationConfig }).generateContent(request);
        } catch (err: any) {
          if (!FALL_THROUGH.has(err?.status)) throw err;
          if (err.status === 404) retired.add(model);
          lastError = err;
        }
      }
      throw lastError ?? new Error('Every Gemini model is retired; update MODELS in server/services/gemini.ts.');
    },
  };
};

export const getFlashJsonModel = () => getModel(true);

export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;

/** Test hook: forget which models have been seen retired. */
export const resetRetiredModels = () => retired.clear();

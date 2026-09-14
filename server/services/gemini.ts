import { GoogleGenerativeAI } from '@google/generative-ai';

const getModel = (jsonMode = false) => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
  });
};

export const getFlashModel = () => getModel(false);
export const getFlashJsonModel = () => getModel(true);

export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;

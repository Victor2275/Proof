import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const answers = new Map();
const asked = [];

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }) {
      return {
        generateContent: async () => {
          asked.push(model);
          const answer = answers.get(model);
          if (answer instanceof Error) throw answer;
          return { response: { text: () => answer ?? `{"from":"${model}"}` } };
        },
      };
    }
  },
}));

const { MODELS, getFlashJsonModel, resetRetiredModels } = await import('../services/gemini.js');

const failure = (status) => Object.assign(new Error(`[${status}]`), { status });

describe('the Gemini model chain', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    answers.clear();
    asked.length = 0;
    resetRetiredModels();
  });
  afterEach(() => { delete process.env.GEMINI_API_KEY; });

  it('stays on Flash models, which the free tier covers, and none of the retired 2.5 ones', () => {
    for (const model of MODELS) {
      expect(model).toContain('flash');
      expect(model).not.toMatch(/^gemini-2\.5-/);
    }
  });

  it('answers from the first model when it works', async () => {
    const result = await getFlashJsonModel().generateContent('hi');
    expect(result.response.text()).toBe(`{"from":"${MODELS[0]}"}`);
    expect(asked).toEqual([MODELS[0]]);
  });

  it('falls through to the next model on quota, billing, retirement and overload', async () => {
    answers.set(MODELS[0], failure(429));
    answers.set(MODELS[1], failure(402));
    answers.set(MODELS[2], failure(503));
    const result = await getFlashJsonModel().generateContent('hi');
    expect(result.response.text()).toBe(`{"from":"${MODELS[3]}"}`);
    expect(asked).toEqual(MODELS.slice(0, 4));
  });

  it('stops asking a retired model on later calls', async () => {
    answers.set(MODELS[0], failure(404));
    await getFlashJsonModel().generateContent('hi');
    asked.length = 0;
    await getFlashJsonModel().generateContent('hi');
    expect(asked).toEqual([MODELS[1]]);
  });

  it('throws at once on a failure every model would share', async () => {
    answers.set(MODELS[0], failure(400));
    await expect(getFlashJsonModel().generateContent('hi')).rejects.toMatchObject({ status: 400 });
    expect(asked).toEqual([MODELS[0]]);
  });

  it('throws the last failure when every model is out', async () => {
    for (const model of MODELS) answers.set(model, failure(429));
    await expect(getFlashJsonModel().generateContent('hi')).rejects.toMatchObject({ status: 429 });
    expect(asked).toEqual([...MODELS]);
  });
});

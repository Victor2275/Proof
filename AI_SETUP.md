# AI Features Setup

Proof uses Google Gemini for three AI-powered features. All require a `GEMINI_API_KEY` in `server/.env`.

## Features

### 1. Recipe Extraction (`POST /api/extract`)
Paste a URL from any recipe website and Gemini will scrape and structure it into the app's format (title, ingredients, instructions, tags).

### 2. AI Restructuring (`POST /api/ai-restructure`)
Paste raw, unstructured recipe text and Gemini will organize it into properly formatted ingredients and instructions.

### 3. AI Substitutions (`POST /api/ai-substitutions`)
Select any ingredient and Gemini will suggest substitutions based on dietary needs or availability.

### 4. Photo Analysis (`POST /api/analyze-image`)
Upload a bake photo and Gemini Vision will auto-generate descriptive hashtags for your bake log.

## Setup

1. Go to [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. Add to `server/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. The free Gemini 1.5 Flash tier supports 15 requests/minute — more than enough for personal use.

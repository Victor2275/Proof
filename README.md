# 🥖 Proof — Sourdough & Culinary Lab Manual

A high-performance, single-user Digital Recipe & Sourdough Lab Manual built with **React, Vite, Tailwind CSS, Node.js, Express, MongoDB**, and **Capacitor Android Native Support**.

Designed like a physical high-end culinary lab notebook, **Proof** focuses on precision, iteration tracking, smart timers, dynamic baker's percentages, reverse schedule calculations, and optional AI-assisted recipe extraction & substitutions.

---

## 🌟 Key Features & How to Use

### 1. 📖 Recipe Management & Interactive Viewer
- **Dynamic Ingredient Scaling**: Scale recipes instantly between `0.5x`, `1x`, `2x`, and `3x` with automatic unit conversions.
- **Baker's Percentages**: Toggle **Baker's %** mode to automatically compute hydration and flour ratios for artisan bread baking.
- **Pantry Auto-Matching**: Ingredients you already own in your **Pantry** are automatically highlighted with green checkmarks in recipe views.
- **Exporting & Sharing**:
  - **Copy Grocery List**: Instantly generate and copy a markdown checklist of recipe ingredients to your clipboard.
  - **Export Image Card / PDF**: Generate downloadable PNG cards or printable PDFs for offline kitchen use.
  - **QR Code Modal**: Display a scanable QR code to open the recipe on any mobile device.

---

### 2. 👨‍🍳 Hands-Free Interactive Baking Mode
- **Step-by-Step Focus**: Large, legible instructions with touch-friendly check-off buttons and progress tracking.
- **Smart Timer Detection**: Automatically detects time phrases in instructions (e.g., *"Bulk ferment for 4 hours"*, *"Bake at 450°F for 20 mins"*).
- **Multi-Timer Drawer**: Run multiple countdown timers simultaneously with pause, resume, reset, and label controls.
- **Voice Announcements & Native Alerts**:
  - Spoken audio alerts when timers complete.
  - Native Android push notifications via `@capacitor/local-notifications` even when the app is in the background.

---

### 3. 📅 Reverse Bake Timeline Scheduler
- Planning a bake for a dinner party or Sunday morning?
- Open **Bake Schedule** in any recipe viewer, select your target finished time (e.g., *"Sunday at 9:00 AM"*), and the app automatically calculates backwards timestamps for every step (levain build, stretch & folds, cold proof, bake time).

---

### 4. 📸 Bake Log & Side-by-Side Photo Compare
- **Iteration Notebook**: Log notes, dates, ambient temperatures, and photos for every bake.
- **Personal Best Badging**: Tag your best iterations with **Personal Best** awards.
- **Side-by-Side Photo Slider**: Compare raw dough structure side-by-side with the final baked loaf crumb using the interactive image comparer.

---

### 5. 🤖 AI Culinary Assistant (Admin Required)
- **URL & Photo Recipe Importer**: Paste any recipe blog link or upload a photo of a handwritten recipe card—Gemini 2.5 Flash automatically extracts title, description, ingredients, prep/cook times, and steps into structured fields.
- **AI Ingredient Substitutions**: Hover over any ingredient in a recipe and tap **Sub** to get instant substitution recommendations (ratios, flavor profile adjustments, and baking impact).
- **Natural Language Search**: Search your library with natural phrases like *"dense sourdough under 4 hours"* or *"gluten-free breakfast"*.

---

### 6. 📱 Android Mobile App (Capacitor Native)
- Enjoy native haptic feedback, background timer notifications, camera integration for bake photos, and offline local IndexedDB support.
- Fully optimized for single-hand mobile kitchen use.

---

### 7. 🌗 Themes
- **Paper Light**: Classic, clean typography reminiscent of lab manuals.
- **Lab Dark**: Low-eyestrain dark mode.
- **OLED Black**: Pitch-black (`#000000`) background mode designed for maximum battery savings on mobile OLED screens.

---

## 🔒 Data Architecture & Security Modes

The application supports two operating modes:

1. **Guest / Local Mode (Zero Setup)**:
   - All recipes, bake logs, and pantry items are stored securely on your device using IndexedDB.
   - Works 100% offline without needing a database connection or API key.
2. **Admin Cloud Mode**:
   - Provide an `ADMIN_KEY` to unlock cloud synchronization to MongoDB and enable Gemini AI capabilities.
   - Non-admin users are restricted from calling paid AI endpoints to prevent API quota abuse.

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB** (Optional for cloud sync, local fallback enabled)

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/Victor2275/Victor-recipes.git
   cd Victor-recipes
   ```

2. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   npm install

   # Install server dependencies
   cd server && npm install && cd ..
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/culinary_lab
   ADMIN_KEY=your_secret_admin_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run Server & Frontend concurrently**:
   ```bash
   npm run dev:all
   ```
   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`

---

## 📱 Building the Android App (APK)

To build a standalone Android debug APK for your phone:

```bash
# Build production web bundle and sync native Android project
npm run build:apk
```

Or manually:
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
The output APK file will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🧪 Testing Suite

The repository contains a full automated unit and integration test suite (52 frontend tests + 26 backend tests):

```bash
# Run all tests (Frontend + Backend)
npm run test:all

# Run frontend tests only
npm test

# Run backend tests only
npm run test:server
```

---

## 📄 Architecture Rules & Guidelines

- **Framework**: React + Vite (Single Page Application)
- **Backend**: Node.js + Express + MongoDB
- **Styling**: Tailwind CSS + shadcn/ui minimal high-end lab manual design system
- **State**: Local React State + IndexedDB + REST API

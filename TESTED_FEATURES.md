# Culinary Lab: Tested Features Tracker

This document mirrors CURRENT_FEATURES.md. Use the checkboxes to track which features have been manually tested.

## 1. Core Recipe Management
- [ ] **Structured Schema (MongoDB)**: Recipes are stored with precise, structured fields: `title`, `description`, `imageUrls`, `servings`, `difficulty`, `prepTime`, `cookTime`, `tags`, `ingredients` (Object: Name, Qty, Unit), `instructions`, and `labNotes`.
- [ ] **Folder Organization**: Recipes can be categorized into user-defined folders for easy retrieval.
- [ ] **Git-Style Version Control**: Native branching support. Recipes track `parentRecipeId`, `versionNumber`, `isLatestVersion`, and `commitMessage`, allowing chefs to save iterations of a master recipe.
- [ ] **Visual Diff / Side-by-Side Comparison**: `SideBySideCompare.tsx` allows users to compare different iterations of recipes, highlighting what changed in ingredients and instructions.
- [ ] **Fuzzy Search & Filtering**: Uses `fuse.js` to enable rapid, typo-tolerant searching across recipe titles and tags on the dashboard.
- [ ] **Nested Sub-Recipe Drawers**: Allows linking recipes to specific instruction steps. Linked recipes slide up in a native drawer without losing context in the parent recipe.
- [ ] **Compact & Grid Views**: UI toggle on the dashboard to switch between large image cards and dense list views.

## 2. "The Kitchen Lab" (Active Baking Mode)
- [ ] **Distraction-Free Focus Mode**: `BakingMode.tsx` provides an ultra-clean, step-by-step UI optimized for reading at a distance.
- [ ] **Context-Aware Smart Ingredients**: While in Focus Mode, the UI automatically highlights the exact quantities of ingredients mentioned in the current step (via `getSmartIngredients`).
- [ ] **Hands-Free Navigation (Voice & Gesture)**:
  - [ ] Voice Commands: Integrates `react-speech-recognition` for a full hands-free experience. Supported commands: "Next", "Back", "Read" (reads step aloud), "Ingredients" (reads required ingredients), "Start timer", "Quiet" (stops alarms), "Show all / Focus mode" (toggles view), "Up/Down" (scrolls), and "Help" (shows commands overlay).
  - [ ] Swipe Gestures: Touchscreen swipe support to advance or go back.
- [ ] **Real-Time Timers (Socket.io)**: `TimerManager.tsx` parses time text (e.g., "Bake for 45 mins") into clickable timers that instantly sync across all active devices via WebSockets.
- [ ] **Hardware Integration**:
  - [ ] **Haptics**: Leverages `@capacitor/haptics` to deliver aggressive tactile feedback when timers finish or steps change.
  - [ ] **Wake Lock**: Uses browser WakeLock API to keep the screen from turning off mid-bake.
- [ ] **Audio & Notifications**: Uses `window.speechSynthesis` to audibly announce when specific timers finish, alongside native browser Notifications.
- [ ] **Reverse Bake Scheduler**: `ReverseBakeScheduler.tsx` allows users to define a target "Eating Time" (e.g., 7:00 PM) and backward-calculates exactly when to start the prep and baking phases.
- [ ] **Zero-Touch Bluetooth Scale Integration**: Connects to standard Web Bluetooth scales. Auto-advances the step when the target weight of the current ingredient is reached.
- [ ] **Flour-Proof Voice Dictation**: A dictation microphone button in the Log Bake modal that transcribes speech into notes, auto-highlighting mentioned ingredients in bold.

## 3. Bake Logs & Learning
- [ ] **Visual-First Bake Logs Grid**: A clean, photography-centered CSS grid view of past bakes. Tapping a photo triggers a 3D flip animation (`framer-motion`) to reveal the dictated notes on the back.
- [ ] **Interactive Before & After Photo Comparison**: A slider component to compare raw dough to baked bread.
- [ ] **AI Photo Tagging**: Cloud functions pass uploaded bake photos to Gemini 1.5 Flash to automatically generate relevant `#tags` (like `#sourdough` or `#overproofed`).
- [ ] **Personal Bests**: Ability to mark specific bake iterations as a "Personal Best" (indicated by a gold award badge).

## 4. Data Insights, AI, and Utilities
- [ ] **AI Ingredient Substitutions**: `AISubstitutionsModal.tsx` connects to Gemini to generate smart ratios for missing ingredients (e.g., swapping AP Flour for Whole Wheat).
- [ ] **Smart Pantry & Barcode Scanning**: 
  - [ ] `Pantry.tsx` tracks inventory.
  - [ ] Integrates `html5-qrcode` to scan real-world UPC barcodes to log ingredients quickly.
- [ ] **Grocery List Generator**: `GroceryList.tsx` converts missing recipe ingredients into an aggregated shopping list.
- [ ] **Baking Analytics**: `Analytics.tsx` provides graphical insights into baking habits (e.g., total hours baked, most used recipes).
- [ ] **Automated Maintenance**:
  - [ ] `node-cron` runs a nightly script to dump the MongoDB database into a JSON backup.
  - [ ] Clean-up script queries Cloudinary's Admin API to automatically delete orphaned images that are no longer linked to any recipe or log.
- [ ] **Offline PWA Engine**: `vite-plugin-pwa` configures Workbox to cache the core application and API endpoints, allowing offline reading of recipes.

## 5. Sub-Resources & Media
- [ ] **Bake Logs**: Dedicated logging objects attached to recipes, storing the date, photos, success notes, and a "Personal Best" flag.
- [ ] **Image Architecture**: Images are captured via `@capacitor/camera` (or file upload) and stored on Cloudinary (via `multer-storage-cloudinary`).
- [ ] **Export Engine**:
  - [ ] `jspdf` and `html2canvas` generate beautiful printable PDFs and square recipe cards.
  - [ ] **Automated Instagram Recipe Exporter**: Exports the recipe to a Black & Gold styled 1080x1080 square image (or 3-post carousel) using `html2canvas`.
  - [ ] `qrcode.react` creates scannable deep-links.

## 6. UI/UX Foundation
- [ ] **Stack**: React, Vite, Tailwind CSS (`@tailwindcss/postcss`).
- [ ] **Sanitization**: `rehype-sanitize` ensures user-generated markdown is safe from XSS.
- [ ] **Drag & Drop**: `@dnd-kit/core` powers drag-and-drop mechanics across the dashboard for organizing folders.
- [ ] **Animations**: `framer-motion` handles fluid component mounting/unmounting transitions.
- [ ] **Icons**: Standardized clean iconography via `lucide-react`.

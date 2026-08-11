# Culinary Lab Master Roadmap

This document tracks all planned features and their implementation status across sessions.

## Phase 1: Core Refinements & Accessibility (Easy / High Impact)
- [x] **Remove Environmental Tracking:** Completely strip Kitchen Temperature and Humidity from the database schema, Bake Log models, and UI.
- [x] **Guest Mode & Local Saves:** Allow viewing and printing without a PIN by default. If a non-admin logs a bake, save it locally to their device (IndexedDB/Local Storage).
- [x] **Haptics & Timers:** Increase aggressiveness of haptic feedback on timer end. Add a brief screen flash/pulse when timers go off.
- [x] **App Settings & Customization:** Build a new Settings page with toggles for:
  - [x] Changing Global Typography/Fonts.
  - [x] Changing Color Themes (Light/Dark/Custom).
  - [x] Toggling Baker's Math (saving preference to profile so it defaults to off).
  - [x] Auto-hiding the PC sidebar for minimalism.
- [x] **Baking Mode Toggles (Settings):** Add default-off toggles for Text-to-Speech, Wave-to-Advance, and Voice Commands.
- [x] **Discovery Quick-Wins:**
  - [x] Add a "Personal Best" tag for bake logs.
  - [x] Add a random "Inspire Me!" button on the dashboard.
  - [x] Implement a "Favorites" / "Starred" list.
- [x] **JSON Backup & QR Codes:** Add a button in Settings to download the entire DB as a JSON file, and a button on recipes to generate a printable QR code that deep-links to the mobile app.

## Phase 2: Data, Discovery, & Pantry (Medium / High Utility)
- [x] **Recipe Exporting:** Generate beautifully formatted printable PDFs and square "Recipe Card" images.
- [x] **Advanced & Fuzzy Search:** Implement fuzzy searching and advanced filter chips.
- [x] **Compact / Dense List View:** Toggle to strip away large images and display recipes in a tight, vertical list.
- [x] **Baking Analytics Dashboard:** Calendar view, total hours spent baking, most used ingredients, and iteration graphs.
- [x] **Smart Pantry System:** "Pantry" tab, highlight missing ingredients, and substitutions database.
- [ ] **Grocery List Generation:** Convert missing/checked ingredients into a grocery list exportable to Apple Reminders, Google Keep, and OurGroceries.
- [ ] **Server Maintenance:** Script to clear orphaned/unused photos to ensure free tier storage.
- [ ] **Automated Free Backups:** Cron job to backup JSON database daily.

## 🔴 Phase 3: Advanced Integrations & Native Tech (ONGOING)
- [x] Voice Commands: Use `react-speech-recognition` in Baking Mode to say "Next Step" or "Back" when hands are messy.
- [x] Pantry Barcode Scanner: Use `html5-qrcode` to scan product barcodes and fetch names from the Open Food Facts API directly into the Smart Pantry.
- [x] AI Photo Tagging: Let Gemini 1.5 Flash auto-suggest tags (`#sourdough`, `#overproofed`) when saving a new bake log photo.
- [x] Drag-and-Drop Dashboard: Let user organize recipe cards into categorized folders using `@dnd-kit/core`.
- [ ] Before & After Photo Slider: Create an interactive photo comparison slider for BakeLogs to compare the raw dough vs baked bread.
- [ ] Live Timer Sync: Implement Socket.io so if a 40-minute timer is started on the iPad in the kitchen, it syncs to the iPhone in the living room.
- [ ] Offline PWA: Use Workbox/Service Workers to cache all recipes and images so the cookbook works in the kitchen without Wi-Fi.

## Phase 4: Production & Advanced Features (Active)
- [ ] **Grocery List Generator**: Convert missing/checked ingredients into a grocery list exportable to Apple Reminders, Google Keep, and text export.
- [ ] **Interactive Before & After Photo Comparison Slider**: Interactive dual-photo slider in Bake Logs (raw vs baked bread).
- [ ] **Automated Free Backups & Maintenance**: Daily `node-cron` job for JSON database dumps and Cloudinary orphan cleanup.
- [ ] **Realtime Multi-Device Timer Sync**: Socket.io sync for active timers across devices.


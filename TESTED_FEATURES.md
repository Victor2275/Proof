# Proof: Tested Features Tracker

This is a 1-to-1 mirror of CURRENT_FEATURES.md. Use checkboxes to track manual testing status.

## 1. Core Recipe Management
- [ ] **Structured Schema (MongoDB)**: Recipes stored with all required fields.
- [ ] **Fuzzy Search & Filtering**: Typo-tolerant search on dashboard.
- [ ] **Nested Sub-Recipe Drawers**: Linking recipes to instruction steps.
- [ ] **Compact & Grid Views**: Dashboard view toggle.
- [ ] **Recipe Folders**: Organizing recipes into named folders.
- [ ] **Sub-recipe Instruction Links**: Inline drawer for linked recipes.

## 2. "The Kitchen Lab" (Active Baking Mode)
- [ ] **Distraction-Free Focus Mode**: Step-by-step baking UI.
- [ ] **Context-Aware Smart Ingredients**: Highlights relevant quantities per step.
- [ ] **Voice Commands**: Next, Back, Read, Ingredients, Start timer, Quiet, Show all, Help.
- [ ] **Wave-to-Advance**: Motion detection via front camera.
- [ ] **Swipe Gestures**: Touchscreen step navigation.
- [ ] **Real-Time Timers (Socket.io)**: Timer sync across devices.
- [ ] **Haptics**: Tactile feedback on timer/step events.
- [ ] **Wake Lock**: Screen stays on during baking.
- [ ] **Audio & Notifications**: Speech synthesis for timer announcements.
- [ ] **Reverse Bake Scheduler**: Backward time calculation from target eating time.
- [ ] **Bluetooth Scale Integration**: Auto-advance on target weight reached.
- [ ] **Voice Dictation in Bake Log**: Speech-to-text for bake notes.

## 3. Bake Logs & Learning
- [ ] **Visual-First Bake Logs Grid**: Photography grid with flip animation.
- [ ] **Custom Image Tags**: Labels on bake log images.
- [ ] **Before & After Photo Comparison**: Slider component.
- [ ] **AI Photo Tagging**: Gemini-powered auto hashtag generation.
- [ ] **Personal Bests**: Gold badge marking on best bakes.

## 4. Data Insights, AI, and Utilities
- [ ] **AI Recipe Extraction**: URL → structured recipe via Gemini.
- [ ] **AI Recipe Restructuring**: Raw text → structured recipe with diff preview.
- [ ] **AI Ingredient Substitutions**: Gemini-powered swap suggestions.
- [ ] **Smart Pantry**: Inventory tracking with pantry-matching on recipes.
- [ ] **Barcode Scanning**: UPC scan to add pantry items.
- [ ] **Grocery List Generator**: Missing ingredients → shopping list.
- [ ] **Baking Analytics**: Charts for baking habits and history.
- [ ] **Nightly DB Backup (cron)**: JSON backup of MongoDB data.
- [ ] **Orphaned Image Cleanup**: Cloudinary cleanup via Admin API.
- [ ] **Offline PWA Engine**: Offline recipe reading via Workbox cache.

## 5. Sub-Resources & Media
- [ ] **Bake Logs**: Attach logs with photos and notes to recipes.
- [ ] **Cloudinary Image Upload**: Images stored on Cloudinary via multer.
- [ ] **PDF / Recipe Card Export**: jspdf + html2canvas print output.
- [ ] **Instagram Exporter**: Black & Gold 1080x1080 or carousel export.
- [ ] **QR Code Deep-links**: qrcode.react for recipe sharing.

## 6. Security & Auth
- [ ] **PIN-Gated Admin Access**: PIN required for write operations.
- [ ] **Crypto-Random Session Tokens**: No hardcoded secrets — UUID tokens with 24h TTL.
- [ ] **Rate Limiting**: AI and auth endpoints rate-limited.

## 7. UI/UX Foundation
- [ ] **Two Themes**: Light and Dark (dark is default).
- [ ] **Black & Gold Aesthetic**: Pitch black, gold accents, glassmorphic components.
- [ ] **XSS Sanitization**: rehype-sanitize on user markdown.
- [ ] **Error Boundary**: Catches unhandled render errors gracefully.

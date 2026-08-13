# Victor's Culinary Lab: Vision & Project Scope

## Core Concept
Victor's Culinary Lab is a highly optimized, mobile-first "Digital Cookbook" and kitchen management tool designed specifically for bakers and culinary enthusiasts. 

While currently architected as a private instance (single-user / personal use), the **long-term goal is to deploy this to users as a SaaS or multi-user application**. Therefore, the architecture and design must remain clean, modular, and scalable to support future multi-tenant capabilities, even if those features aren't built out yet.

## Design Aesthetic: "Black & Gold"
The application must feel like a premium, state-of-the-art physical lab manual merged with a high-end culinary magazine.
- **Color Palette**: Pitch black (`#000000`) and paper white backgrounds, accented with subtle, elegant gold and sleek dark modes. Avoid generic colors (plain red, blue, green).
- **Typography**: Modern, minimal, and highly legible fonts (e.g., Inter, Roboto).
- **Feel**: Luxurious, dynamic, and responsive. Use glassmorphism, smooth gradients, and subtle micro-animations for interactions. It should "Wow" users at first glance.
- **Mobile-First**: It should function and feel like a native mobile app (PWA), not a cramped website squeezed onto a phone screen.

## Key Design Principles
1. **Speed & Automation**: Data entry should be extremely fast. Use AI (Gemini) to automatically tag photos, parse unstructured text into structured recipes, and suggest ingredient substitutions.
2. **"Flour-Proof" Interactions**: The core "Baking Mode" must be usable with dirty hands. This relies heavily on voice commands, swipe gestures, haptics, and large, clear typography.
3. **Living Recipes**: Recipes are not static. They utilize Git-style version control (iterations, branches, commits) to track changes over time (e.g., tweaking hydration percentages).
4. **Bake Logs as the "Main Character"**: A recipe is just a template; the actual magic happens in the Bake Logs. Past bakes, photos, and notes are front-and-center, allowing the baker to learn from past mistakes.
5. **Shareability**: Built-in tools for generating printable PDFs, square social media exports (Instagram), and QR deep-links so the chef can share their best work effortlessly.

## Architecture
- **Frontend**: React + Vite (Single Page App). Tailwind CSS + shadcn/ui. 
- **Backend**: Node.js + Express.
- **Database**: MongoDB (Mongoose).
- **Native Bridges**: `@capacitor/core` for Haptics, Camera, and WakeLocks. Service Workers for offline PWA capabilities. WebSockets (`socket.io`) for real-time timer syncing across devices.

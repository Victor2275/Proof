# ADR 0001: Deployment and Hosting Strategy

* **Status:** Accepted
* **Date:** 2026-08-07

## Context and Problem Statement
The Victor-recipes app needs to be hosted online so it can be accessed from the kitchen (e.g., via a tablet or phone). We need a platform that is cost-effective (free), easy to deploy, and supports a React/Vite frontend alongside an Express/Node.js backend. Additionally, there is a far-future goal of wrapping the application into a downloadable mobile app.

## Decision Drivers
* Cost (prefer free tiers for personal projects).
* Ease of deployment and continuous integration (CI/CD).
* Performance and fast serving of static assets.
* Support for single-page applications (SPA).

## Considered Options
* **Vercel:** Excellent for frontend, supports serverless functions for the backend API.
* **Render / Railway:** Good for traditional Express.js long-running servers.
* **Traditional VPS (DigitalOcean):** Complete control, but requires manual server management and is not free.

## Decision Outcome
**Vercel** is chosen for the frontend deployment, potentially utilizing Vercel Serverless Functions for the Express API, or moving the API to a free service like Render if long-running processes (like heavy web scraping) are required. 
Vercel provides seamless GitHub integration, automatic deployments, and exceptional performance for React/Vite SPAs.

### Positive Consequences
* Zero-config deployments for the Vite frontend.
* Free tier is more than sufficient for a single-user personal application.
* Global edge network ensures the app loads fast anywhere.

### Negative Consequences
* If the backend remains a traditional Express app, it may need to be adapted into Vercel Serverless functions, or hosted separately (e.g., on Render), which splits the codebase deployment.

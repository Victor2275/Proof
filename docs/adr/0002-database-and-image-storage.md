# ADR 0002: Database and Image Storage

* **Status:** Accepted
* **Date:** 2026-08-07

## Context and Problem Statement
The application handles structured recipe data and high-resolution images of completed bakes. Currently, MongoDB is running locally, and images are saved to the local file system (`/uploads`). To deploy the app to Vercel/cloud, both the database and the file storage need to be externalized.

## Decision Drivers
* Must remain on free tiers as this is a personal project.
* Storage needs are relatively low (single user), but images can consume disk space quickly on limited free tiers.
* Ease of integration with the existing Mongoose/Node.js stack.

## Considered Options
* **Database:** MongoDB Atlas vs. self-hosted MongoDB.
* **Storage:** Local server storage vs. Cloudinary vs. AWS S3.

## Decision Outcome
1. **Database:** We will use **MongoDB Atlas** (M0 Free Tier). It integrates perfectly with the existing Mongoose setup by simply changing the `MONGO_URI` environment variable.
2. **Image Storage:** We will use a free cloud storage bucket (like **Cloudinary** or **AWS S3** free tier). Cloudinary is highly recommended as it provides on-the-fly image optimization, which is great for loading galleries quickly on mobile devices.

### Positive Consequences
* Database and media are decoupled from the application server, allowing the server to be stateless (a requirement for Vercel Serverless).
* No risk of filling up local server disk space with high-res photos.
* MongoDB Atlas provides automatic backups and a great web UI for data management.

### Negative Consequences
* Introduces third-party dependencies.
* Requires setting up and managing API keys for Cloudinary/AWS and MongoDB Atlas.

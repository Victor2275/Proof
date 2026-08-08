# ADR 0003: Recipe Data Versioning

* **Status:** Accepted
* **Date:** 2026-08-07

## Context and Problem Statement
Baking is an iterative process. A user might make a recipe 10 times, tweaking the hydration, yeast amount, or bake time with each attempt. The system needs a way to track these changes over time without cluttering the UI, allowing the user to view historical data while easily accessing the most recent, perfected version of the recipe.

## Decision Drivers
* Readability: The most recent version must always be the default and easily accessible.
* Traceability: The ability to see exactly what changed between "Attempt 1" and "Attempt 3".
* Photo linking: The ability to link a specific photo gallery to a specific iteration of a recipe.

## Considered Options
* **Linear Text Log:** Just appending text notes to a `notes.txt` or markdown field. (Too unstructured).
* **Git-Style Versioning (Document Copying):** Creating a new sub-document or a cloned document in the database for each iteration, linked to a parent recipe ID.
* **Event Sourcing:** Tracking every single diff as an event. (Over-engineering).

## Decision Outcome
We will implement a **Git-Style Versioning (Document Copying)** approach. 
When a user edits a recipe and marks it as a "New Iteration," the backend will create a new version record. The parent recipe object will always point to the `latest_version_id`.
The UI will display the latest version by default, with a dropdown or timeline view to select historical versions.

### Positive Consequences
* Extremely clean data model. The latest recipe is just a standard recipe object.
* We can attach specific photos and environmental data (temperature/humidity) to specific versions.
* Highly structured, making future features (like diff-viewing or baker's math comparisons) easy.

### Negative Consequences
* Requires modifying the current MongoDB schema to handle parent-child relationships for recipe versions.
* Slightly more complex save/update logic on the backend.

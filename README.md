# Stateless Node.js Microservice Architecture

A scalable, containerized Node.js application refactored from a legacy monolith into a **stateless architecture**. Designed to run seamlessly across multiple replicas using shared file volumes and a centralized PostgreSQL database.

## Architecture Highlights

* **Stateless App Nodes:** Multiple independent Node.js instances (`app-1`, `app-2`) running in parallel.
* **Shared File Storage:** Image uploads and generated thumbnails are stored on a shared Docker volume (`shared-uploads`) mounted to `/app/uploads`.
* **Centralized Database:** Replaced local SQLite with PostgreSQL to ensure instant data consistency across all app instances.
* **Image Processing:** Automatic thumbnail generation using `sharp` and `multer`.

---

## Tech Stack

* **Backend:** Node.js, Express
* **Database:** PostgreSQL (`pg`)
* **Image Processing:** Multer, Sharp
* **Containerization:** Docker, Docker Networks & Volumes

---

## Quick Start (Docker CLI)

### 1. Create Network & Volume
```bash
docker network create app-net
docker volume create shared-uploads

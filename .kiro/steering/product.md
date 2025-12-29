# Product Overview

This workspace contains multiple projects:

## Primary: Data Extraction Tool (DET)
Location: `det-monorepo/`

A production-grade, cloud-based document extraction platform built on Azure infrastructure. DET helps users find and extract equipment tag information from technical documents using AI-powered computer vision and OCR.

Key capabilities:
- Document and tag ingestion via Excel uploads
- AI-powered symbol detection (YOLO) and OCR (LLM Vision + Azure Document Intelligence)
- Real-time progress tracking via Azure Web PubSub
- Multi-tenant SaaS architecture supporting concurrent users and jobs
- Desktop app for manual document uploads

## Secondary Projects
- `det-scripts/` — Supporting scripts, worker implementations, and Azure ML deployment configs
- `Algozenith/` — Competitive programming practice (DSA, DP, Trees, Strings, etc.)
- `Learning/` — Learning projects (Next.js dashboards, templates)
- `DET_Backup/` — Historical backups and reference implementations

## Domain Terminology
- **JOB**: Collection of documents and tags submitted for processing
- **JOB_NUMBER**: Human-friendly sequential ID per user (1, 2, 3...)
- **DOCUMENT_NUMBER**: Unique document identifier (e.g., `MBR-11-101983-PX-2365-00121-0001`)
- **TAG_NAME**: Equipment tag identifier (e.g., `1K-1011A`)

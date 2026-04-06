# Release Flow

## Purpose

This document defines how launcher releases and game build releases move from internal preparation to player machines. The two release streams are intentionally separate and must remain separate in implementation and operations.

## Release Model

There are two independent release pipelines:

- launcher release flow
- game build release flow

They may share hosting infrastructure, but they do not share version identity, update checks, or installation logic.

## Launcher Release Flow

### Operational Goal

Allow the launcher executable to update itself without requiring the user to manually replace application files.

### MVP Pipeline

1. build a package-ready launcher artifact for the current launcher version
2. publish the versioned launcher release to `GitHub Releases`
3. on startup, the launcher checks the remote release source for a newer launcher version
4. if a newer version exists, the launcher downloads and applies the update
5. the launcher restarts into the new version
6. user settings remain intact across the update

### Operational Notes

- the launcher update flow is Windows-first for packaging and validation
- launcher version comparison is independent from game build version comparison
- rollback should be possible by republishing or reactivating a known-good launcher version in the release source

## Game Build Release Flow

### Operational Goal

Allow the launcher to install or replace the approved Minecraft client build required for the server.

### MVP Pipeline

1. prepare and test the approved game build archive
2. publish the game build as a ZIP artifact
3. update backend release metadata with the active build version and ZIP URL
4. the launcher compares the installed local build version with the active backend build version
5. if the local build is missing or outdated, the launcher downloads the ZIP archive
6. the launcher extracts the archive into the configured instance directory
7. the launcher marks the build version as installed locally after successful completion

### Operational Notes

- only one active build version is assumed at a time for the MVP
- rollback is handled by marking a previous known-good build as active in backend metadata
- partial repair logic is not required for the MVP ZIP flow

## Long-Term Evolution

The long-term updater should move from ZIP transport to a manifest-based sync model with file-level metadata and hashing. This change should improve efficiency without changing the core rule that launcher releases and game build releases are independent streams.

## Default Operational Decisions

- initial artifact hosting uses `GitHub Releases`
- launcher MVP is operationally Windows-first
- backend metadata is the source of truth for the active game build version
- launcher startup is the default trigger point for launcher update checks
- Play should remain blocked while a required build install or update is incomplete

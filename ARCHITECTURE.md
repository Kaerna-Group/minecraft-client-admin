# Architecture Overview

## Purpose

This document defines the system boundaries for the Minecraft launcher project so implementation can start from a stable structure without mixing responsibilities across client, backend, hosting, and admin tooling.

## Core Components

### Launcher

The launcher is a desktop client built with `Electron + React + TypeScript`.

Responsibilities:

- application shell and navigation
- local settings storage
- launcher self-update coordination
- game build install and update flow
- authentication UX
- user-facing ban state handling
- news and server status display
- Minecraft process launch
- runtime log display

The launcher must not:

- contain privileged backend secrets
- write directly to protected backend tables
- perform admin-grade mutations by itself
- assume client-side checks are sufficient for security

### Game Build

The game build is the managed Minecraft instance distributed to players.

Responsibilities:

- hold the fixed version of the client files
- define the controlled runtime contents such as `mods`, `config`, `libraries`, and related assets
- provide version identity for installation and update checks

The game build must not:

- carry launcher implementation logic
- act as a source of truth for authentication or moderation rules
- blur its release lifecycle with launcher executable releases

### Backend (Supabase)

The backend provides identity, protected data access, and metadata required by the launcher.

Responsibilities:

- `Supabase Auth` for identity and session management
- database tables for profiles, roles, bans, news, build releases, and audit logs
- Row Level Security for sensitive data access
- Edge Functions for privileged actions

The backend must not:

- trust the launcher as a privileged environment
- expose unrestricted write access to launcher clients
- collapse admin operations into public client-side flows

### File Hosting

File hosting delivers launcher artifacts and game build artifacts.

Initial platform:

- `GitHub Releases`

Future-compatible direction:

- `Cloudflare R2 + CDN`

Responsibilities:

- host launcher installers or packaged release artifacts
- host MVP game build ZIP archives
- later host manifest-addressable files for granular sync

File hosting must not:

- replace backend authorization logic
- define product state by itself without backend metadata

### Admin Panel

The admin panel is a separate web application for internal staff and is explicitly post-MVP.

Responsibilities:

- moderation tools
- role management
- ban management
- news publishing
- release metadata management
- audit log inspection

The admin panel must not:

- be required for the first public launcher release
- run inside the launcher client

## Trust Model

The launcher runs in an untrusted environment. Users may inspect, modify, or proxy client-side behavior. Because of that:

- only public configuration and authenticated session data may exist in the client
- privileged mutations must go through protected backend paths
- protected data access must be enforced by backend rules, not by UI state

The launcher may know:

- public API URL
- public anonymous client key
- local user settings
- authenticated session data

The launcher must never contain:

- service-role credentials
- direct database admin credentials
- secrets that grant privileged moderation or release control

## Runtime Boundary

### Electron Main Process

The main process is responsible for privileged local machine operations:

- filesystem access for settings and instance management
- process launch for Minecraft and related runtime capture
- self-update coordination
- secure IPC bridge exposure to the renderer

### Renderer

The renderer is responsible for user-facing application behavior:

- UI and navigation
- settings screens
- authentication forms and session feedback
- status, news, and version presentation
- update progress display
- runtime log viewing

The renderer should interact with local machine capabilities through a controlled bridge rather than broad direct access.

## Backend Boundary

The backend contract for the launcher MVP includes:

- authentication via Supabase Auth
- self-scope profile reads
- role lookup for future feature gating
- ban state lookup for launch blocking
- published news reads
- active build release metadata reads

Privileged actions such as assigning roles, creating bans, publishing news, or changing active releases must go through protected Edge Functions or other backend-controlled admin surfaces.

## Delivery Model

### Launcher Update Stream

The launcher executable is released and updated independently from the game build. Startup should include a remote version check and a controlled update apply-and-restart flow.

### Game Build Update Stream

The MVP game build flow is ZIP-based for simplicity and speed of delivery. The long-term target is a manifest-based updater with file-level metadata and hashing.

These two streams must remain separate:

- different artifacts
- different version comparisons
- different rollback concerns

## Deployment Shape

The initial deployment shape is:

- launcher client on player machines
- Supabase for auth, data, and privileged backend logic
- GitHub Releases for launcher and build artifact distribution

The architecture should stay portable enough to support later migration of artifact hosting to R2/CDN without redesigning the trust model or update separation.

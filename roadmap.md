# Minecraft Launcher Roadmap
## Priority-Driven Product Development Plan

## Product Goal

Build a **custom desktop launcher** for a **single Minecraft server** with:

- one fixed game build
- launcher self-update
- build update system
- user authentication
- ban and role checks
- server status and news
- game launch and logs
- admin panel for moderation and content control

---

# 1. Core Product Principles

## 1.1 Main Priority

The **launcher itself** is the highest product priority.

The backend exists to support the launcher, not the other way around.

That means the project should be developed in this order:

1. minimal backend/data foundation
2. launcher core
3. build delivery and update flow
4. game launch and runtime
5. authentication, bans, roles
6. admin panel
7. security hardening, CI/CD, scaling

---

## 1.2 Separation of Concerns

The system must always remain split into clearly separated layers:

- **Launcher** — desktop client
- **Game Build** — Minecraft instance files
- **Backend** — users, roles, bans, metadata, news
- **File Hosting** — build files and launcher releases
- **Admin Panel** — moderation and management UI

---

## 1.3 Two Different Update Flows

Do not mix these two systems.

### Launcher Update
Responsible for updating the launcher executable itself.

### Build Update
Responsible for updating the Minecraft client files.

These are separate release streams and must stay independent.

---

## 1.4 Trusted vs Untrusted Environment

The launcher is a **client application** and must be treated as an **untrusted environment**.

Never place privileged secrets in the launcher.

The launcher may contain:

- public configuration
- public API URL
- public client key
- authenticated user session data

The launcher must never contain:

- admin secrets
- service role keys
- privileged database credentials
- direct write access to secure backend operations

---

# 2. System Architecture

## 2.1 Components

### 2.1.1 Launcher (Electron)
Responsible for:

- UI
- settings
- self-update
- build update
- authentication flow
- ban check
- status/news display
- logs
- Minecraft launch

### 2.1.2 Game Build
A fixed client instance containing:

- `mods/`
- `config/`
- `resourcepacks/`
- `shaderpacks/`
- `versions/`
- `libraries/`
- `logs/`
- launcher metadata files

### 2.1.3 Backend (Supabase)
Responsible for:

- authentication
- profiles
- roles
- bans
- launcher news
- release metadata
- audit logs
- protected admin actions via Edge Functions

### 2.1.4 File Hosting
Used for:

- launcher installers
- build archives
- mod files
- config files
- manifest-linked resources

Initial choice:

- **GitHub Releases**

Future upgrade:

- **Cloudflare R2 + CDN**

### 2.1.5 Admin Panel
A separate web application for admins and moderators.

Responsible for:

- user management
- role management
- bans
- news publishing
- release metadata management
- audit log review

---

# 3. Development Priority Order

## P0 — Minimal Backend and Data Foundation
Only the minimum required for launcher work.

## P1 — Launcher Core Development
Highest implementation priority.

## P2 — Launcher Self-Update
The launcher must be able to update itself independently.

## P3 — Build Update System
The launcher must be able to install and update the game build.

## P4 — Game Launch Runtime
The launcher must reliably run Minecraft and display logs.

## P5 — Authentication, Roles, and Ban Flow
Add protected user flow after launcher basics work.

## P6 — Admin Panel
Build management tools after the launcher-side user flow exists.

## P7 — Security Hardening and Release Infrastructure
Production-readiness work.

## P8 — Scaling and Delivery Optimization
Storage migration, CDN, release optimization, diagnostics.

---

# 4. Product Scope

## 4.1 In Scope

- custom launcher for one server
- one fixed Minecraft version
- one fixed loader
- launcher self-update
- build delivery and update
- manifest-based file sync
- logs
- authentication
- role and ban checks
- admin panel
- server status and news

## 4.2 Out of Scope for Initial Versions

- multiple server profiles
- multiple Minecraft versions
- modpack switching
- in-launcher store
- direct database access from client
- premium billing system
- advanced delta patching from day one
- anti-cheat kernel systems
- full official launcher replacement

---

# 5. Roadmap by Phases

---

# Phase 0 — Project Foundation

## Goal
Create a stable base for future launcher development.

## Objectives
- define product scope
- define architecture boundaries
- define launcher responsibilities
- define backend responsibilities
- define update model
- define build delivery model
- choose Minecraft version and loader
- define local instance layout
- define MVP feature set

## Deliverables
- `PRODUCT.md`
- `ARCHITECTURE.md`
- `MVP_SCOPE.md`
- `SECURITY.md`
- `RELEASE_FLOW.md`

## Exit Criteria
- project goals are fixed
- architecture is documented
- no major open ambiguity remains

---

# Phase 1 — Minimal Backend/Data Foundation

## Goal
Build only the backend foundation required for launcher development.

## Why It Comes First
The launcher needs a backend for authentication, profile lookup, ban checks, news, and release metadata.  
However, backend development must stay minimal until launcher core is working.

## Supabase Responsibilities
- authentication
- profile storage
- roles
- bans
- launcher news
- release metadata
- audit logs
- protected admin actions

## Recommended Database Tables

### `profiles`
- `id`
- `nickname`
- `avatar_url`
- `created_at`
- `last_login_at`

### `user_roles`
- `user_id`
- `role`

### `user_bans`
- `id`
- `user_id`
- `is_banned`
- `reason`
- `banned_until`
- `created_by`
- `created_at`

### `launcher_news`
- `id`
- `title`
- `body`
- `is_published`
- `created_at`
- `created_by`

### `build_releases`
- `id`
- `version`
- `manifest_url`
- `changelog`
- `is_active`
- `created_at`

### `audit_logs`
- `id`
- `actor_user_id`
- `action`
- `target_user_id`
- `payload`
- `created_at`

## Required Security Policies
- users can read only their own profile where appropriate
- users cannot assign roles
- users cannot create bans
- privileged actions must go through Edge Functions
- published news can be read by launcher clients
- release metadata can be read safely
- audit logs must be restricted

## Deliverables
- Supabase project
- database schema
- migrations
- RLS enabled
- base Edge Functions
- seed data for development

## Exit Criteria
- a test user can register and log in
- the launcher can fetch profile data
- the launcher can fetch ban status
- the launcher can fetch published news
- roles and bans are protected

---

# Phase 2 — Launcher Core Shell

## Goal
Build the launcher application shell before advanced backend or admin features.

## Why It Is the Main Priority
This is the core product.  
Everything else exists to support it.

## Main Responsibilities
- window shell
- navigation
- startup flow
- settings storage
- log panel
- error display
- placeholder sections for future modules

## Required Screens

### Splash Screen
Used for:
- launcher initialization
- local config load
- self-update check trigger
- startup diagnostics

### Login Screen
Used for:
- login
- registration entry point
- session restore feedback
- auth error display

### Main Screen
Used for:
- Play button
- news
- server status
- launcher logs
- version info
- update progress
- user info

### Settings Screen
Used for:
- RAM settings
- Java path
- instance path
- language
- debug mode
- launcher behavior preferences

## Local Storage Responsibilities
- user settings
- cached session data
- launcher preferences
- install paths
- debug settings

## Deliverables
- Electron app shell
- page routing
- settings persistence
- log viewer
- UI state management
- launcher config file

## Exit Criteria
- launcher opens correctly
- settings are saved and restored
- navigation works
- logs can be shown inside UI
- launcher is usable as a shell

---

# Phase 3 — Launcher Self-Update

## Goal
Allow the launcher to update itself independently from the game build.

## Responsibilities
- check for new launcher version
- download launcher update
- install launcher update
- restart after update
- keep user settings intact

## Recommended Flow
- launcher starts
- checks remote release source
- compares current launcher version
- downloads update if newer version exists
- applies update
- restarts safely

## Initial Delivery Channel
- GitHub Releases

## Deliverables
- release packaging
- version metadata
- update checks
- update UI feedback
- restart flow

## Exit Criteria
- launcher can update itself from a release source
- users do not need to manually replace the executable
- settings remain intact after update

---

# Phase 4 — Build Delivery MVP (ZIP-Based)

## Goal
Get a working build installation system as fast as possible.

## Why This Comes Before Full Manifest Sync
A ZIP-based updater is the fastest path to a usable MVP.

## Initial Model
- backend provides current build version
- backend provides ZIP URL
- launcher compares installed version
- launcher downloads ZIP if needed
- launcher extracts files into instance folder

## Benefits
- fast to implement
- simple to debug
- reliable for first release

## Drawbacks
- larger downloads
- no partial patching
- inefficient for frequent small updates

## Deliverables
- version comparison
- ZIP download
- extraction flow
- install status tracking
- recovery from failed extraction

## Exit Criteria
- launcher can install a build from scratch
- launcher can replace outdated build
- build version is stored locally
- Play flow is blocked until install/update is complete

---

# Phase 5 — Game Launch Runtime

## Goal
Launch Minecraft reliably from the launcher.

## Responsibilities
- detect Java
- validate Java version
- build JVM arguments
- define instance path
- apply launcher-configured memory settings
- launch process
- capture stdout and stderr
- expose runtime logs to UI

## Configuration Inputs
- Java path
- min RAM
- max RAM
- instance path
- launch behavior
- debug mode
- server address
- loader settings

## Runtime Features
- display startup logs
- detect startup failure
- keep launcher open or close on launch
- show clear launch errors
- distinguish Java failure from build failure

## Deliverables
- Java detection module
- launch config generator
- process runner
- runtime log integration
- launch state handling

## Exit Criteria
- the launcher can start Minecraft
- the game uses the correct instance folder
- runtime logs are visible
- failed launch states are understandable

---

# Phase 6 — Authentication, Roles, and Ban Flow

## Goal
Add protected user flow after the launcher is already operational.

## Responsibilities
- login
- registration
- session restore
- logout
- fetch profile
- fetch role
- fetch ban state
- block launch for banned users

## User States
### Guest
No authenticated session.

### Authenticated User
Allowed to access launcher normally.

### Banned User
Launcher access may be partially allowed, but game launch must be blocked.

### Admin or Moderator
Used later for admin panel permissions.

## Ban Flow
After successful login:
1. fetch current user
2. fetch profile
3. fetch role
4. fetch ban status
5. if banned and ban is active:
   - disable launch
   - show reason
   - show duration or permanent status

## Deliverables
- auth integration
- session persistence
- protected main flow
- banned-user state
- login and logout UX

## Exit Criteria
- user login works
- session survives launcher restart
- ban state blocks launch correctly
- role data is available for future admin features

---

# Phase 7 — News and Server Status

## Goal
Make the launcher informative and alive.

## Responsibilities
- show published launcher news
- show active build version
- show current changelog
- show server online/offline state
- show player count and MOTD if desired

## Data Sources
- news from backend
- release metadata from backend
- server status from backend or dedicated status endpoint

## Deliverables
- news feed UI
- release info panel
- server status widget
- periodic refresh logic

## Exit Criteria
- users can see the latest launcher news
- users can see whether the server is online
- users can see relevant release/build information

---

# Phase 8 — Full Manifest-Based Build Updater

## Goal
Replace ZIP updates with a proper file-based updater.

## Why This Matters
This is the long-term update model and the center of launcher build delivery.

## Manifest Responsibilities
The manifest must define:
- build version
- Minecraft version
- loader type
- file list
- file paths
- file sizes
- file hashes
- file URLs
- required vs optional files

## Recommended Manifest Format

```json
{
  "version": "1.0.0",
  "minecraftVersion": "1.20.1",
  "loader": "Fabric",
  "files": [
    {
      "path": "mods/example.jar",
      "url": "https://cdn.example.com/mods/example.jar",
      "size": 123456,
      "hash": "sha256-...",
      "required": true
    }
  ]
}
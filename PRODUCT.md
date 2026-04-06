# Product Definition

## Product Goal

Build a custom desktop launcher for a single Minecraft server with one fixed game build and one controlled runtime environment. The launcher is the primary product. Its job is to give players a reliable path to authenticate, install updates, launch the game, and understand what is happening when something goes wrong.

## Primary Audience

- Players of one private or community Minecraft server
- Internal moderators and administrators as secondary stakeholders

The launcher is optimized for a managed server experience, not for general-purpose modpack distribution.

## Core User Outcomes

Players should be able to:

- install the launcher with minimal setup friction
- sign in with an email/password account
- restore a previous session without repeated login prompts
- receive launcher updates without manual replacement of files
- install or update the required game build
- see server status and launcher news before launching
- start the correct Minecraft client instance
- understand errors through clear status messages and runtime logs

Internal staff should be able to rely on the launcher as the controlled entry point into the server ecosystem, with role and ban enforcement handled by backend-backed rules rather than informal manual checks.

## Product Principles

### Launcher-First Priority

The launcher is the main product surface. Backend systems, hosting, and future admin tooling exist to support the launcher experience.

### Single-Server Focus

The product is intentionally narrow. It serves one server, one approved build, and one operational flow. That constraint is a feature because it keeps the user experience simple and operational control high.

### Separate Update Streams

Launcher updates and game build updates are different release streams. The launcher executable must be able to update independently from the Minecraft instance files.

### Strict Trust Boundaries

The launcher runs on player machines and must be treated as an untrusted client. It may hold public configuration and user session data, but it must never hold privileged secrets or direct admin capabilities.

### Operational Clarity

The product must prefer understandable flows over advanced optimization in early versions. A simple update model that is easy to debug is better than a sophisticated model that slows delivery.

## What The Product Includes

- a Windows-first desktop launcher built with Electron, React, and TypeScript
- launcher self-update
- game build installation and update
- user authentication via Supabase
- role and ban checks backed by backend data
- server status and launcher news display
- Minecraft launch flow and runtime log display

## Non-Goals

The initial product does not aim to support:

- multiple server profiles
- multiple Minecraft versions
- modpack switching
- optional content selection inside the launcher
- in-launcher billing or store features
- advanced patching as a day-one requirement
- full replacement of the official launcher for broad public use

## Success Criteria For Phase 0 To MVP Planning

The planning phase is considered successful when the team has a stable product definition that supports an implementable MVP with these outcomes:

- the launcher shell is usable
- the build installs and updates reliably
- the game launch flow works with a controlled instance
- bans can block play
- news and server status are visible inside the launcher
- no major ambiguity remains around product boundaries or responsibilities

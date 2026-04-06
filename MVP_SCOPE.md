# MVP Scope

## Purpose

This document defines the first usable public release boundary for the launcher. It converts the roadmap into a hard scope line so implementation can stay focused and avoid expanding into admin tooling or long-term optimization too early.

## MVP Definition

The MVP is a Windows-first launcher release that allows a player to install the launcher, authenticate, update the launcher, install or update the server build, see basic server information, and launch the approved Minecraft instance unless banned.

## In Scope

### Launcher Shell

- splash screen with startup diagnostics and initialization feedback
- main application window and navigation
- settings persistence for launcher preferences
- log viewer inside the launcher UI

### Authentication Flow

- email/password login
- logout
- session restore on launcher restart
- clear auth error presentation

### Main Screen

- Play button
- basic user info
- launcher news feed
- server status display
- launcher version and build version visibility
- update progress visibility

### Settings

- RAM configuration
- Java path selection
- instance path selection
- debug mode toggle

### Launcher Updates

- check for a newer launcher version on startup
- download and apply launcher updates
- restart after update while keeping settings intact

### Game Build Delivery

- compare installed build version against active backend version
- download the current approved build as a ZIP archive
- extract and install the build into the chosen instance directory
- record the installed build version locally
- block Play until install or update is complete

### Game Launch Runtime

- detect Java path from configured or discovered location
- build launch configuration using stored settings
- launch the controlled Minecraft instance
- capture and display runtime logs
- show understandable launch failures

### Ban Enforcement

- fetch current ban state after login or session restore
- block game launch when an active ban is present
- show ban reason and duration state where available

## Out Of Scope

The MVP does not include:

- admin panel UI
- moderator workflows inside the product UI
- multi-profile support
- multi-version Minecraft support
- optional file selection or optional content packs
- manifest-based delta sync as the initial updater
- billing, store, or social platform features
- advanced launcher ecosystem features beyond the single-server use case

## Delivery Order Inside MVP

Implementation priority inside the MVP should be:

1. launcher shell
2. minimal backend integration
3. launcher self-update
4. ZIP-based game build install/update
5. game launch runtime
6. auth, ban, news, and status polish

This order keeps the launcher as the primary product while allowing backend work to stay minimal until it directly supports the client.

## Post-MVP Direction

The following are intended after the first usable release, not before it:

- admin panel
- improved operational tooling
- manifest-based updater
- broader platform support
- release optimization and delivery scaling

## Acceptance Definition

The MVP is accepted when a player can:

- install the launcher
- sign in with an account
- restore a session after restart
- receive launcher updates
- install or update the current approved game build
- see server status and news
- launch the server build successfully when allowed
- be blocked from play when an active ban exists

# Security Baseline

## Purpose

This document captures the minimum security rules for early development so the project does not introduce avoidable trust or authorization mistakes while building the launcher MVP.

## Threat Model Summary

The project assumes the following from day one:

- the launcher client is untrusted
- users may inspect or modify local files
- users may tamper with client-side requests
- public endpoints must assume hostile callers
- client-side checks improve UX but do not provide real authorization

Because of this model, all sensitive trust decisions must be enforced by backend-controlled logic.

## Secret Handling Rules

The launcher may contain:

- public API URL
- public anonymous client key
- local settings
- user session data needed for authenticated use

The launcher must never contain:

- Supabase service-role keys
- direct database admin credentials
- moderation secrets
- release management secrets
- any credential that grants privileged backend access outside normal user scope

## Authentication And Session Rules

- MVP authentication uses `email/password` via `Supabase Auth`
- authenticated session data may be stored locally to support session restore
- session restore is allowed at launcher startup
- logout must clear local session artifacts used by the launcher
- session state shown in UI must not be treated as sufficient proof of authorization without backend verification

## Authorization Rules

- Row Level Security must be enabled on all sensitive tables
- users may only read their own profile data where applicable
- users must not be able to assign roles
- users must not be able to create or remove bans
- users must not be able to publish or edit launcher news directly
- users must not be able to activate or edit release metadata directly
- privileged mutations must be executed through protected backend paths such as Edge Functions
- audit logs must be restricted to authorized internal access

## Network And API Rules

- the launcher should only call safe read endpoints and authenticated self-scope backend operations
- all admin-grade writes must go through Edge Functions or equivalent protected backend handlers
- the backend must validate every privileged action independently of launcher UI state
- public metadata exposed to the launcher should be limited to what is safe for broad client consumption

## Local Machine Safety Rules

- install and extraction paths must be validated before write operations
- the updater must not overwrite arbitrary filesystem locations outside the chosen instance directory
- local settings must not allow unintended elevation of launcher privileges
- runtime and update logs should avoid exposing secrets or full credential material in the UI

## Release Integrity Rules

- release metadata must include version identity for both launcher and game build flows
- launcher updates must only apply from the configured trusted release source
- MVP ZIP-based build updates must validate source and intended version before apply
- the long-term manifest-based updater should validate file hashes and file-level metadata

## Security Boundaries To Preserve During Implementation

- launcher self-update and build update remain separate systems
- the launcher is a consumer of backend policy, not the enforcer of privileged policy
- admin tooling stays outside the launcher client
- backend security decisions must remain valid even if the client is modified

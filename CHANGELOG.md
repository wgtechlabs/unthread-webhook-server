# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [1.1.6] - 2026-08-27

### Changed

- unify CI, release, and container into build-flow (#85)

### Security

- harden project-sync trigger and field id handling

## [1.1.5] - 2026-08-26

### Changed

- allow Bun install scripts in Docker builds
- sync Bun lockfile with dependency updates
- sync bun lockfile with redis 6 and biome 2.4.16
- bump wgtechlabs/container-build-flow-action from 1.8.1 to 1.9.0 (#82)
- bump actions/setup-node from 6 to 7 (#81)
- bump actions/cache from 5 to 6 (#80)
- bump actions/checkout from 6 to 7 (#79)
- bump redis from 5.12.1 to 6.0.0 (#78)
- bump @biomejs/biome in the minor-and-patch group (#77)
- bump gitleaks/gitleaks-action from 2.3.9 to 3.0.0 (#76)

### Security

- remove vulnerable build tooling from runtime image
- upgrade npm in Docker base stage to fix CVE-2026-45149 and CVE-2026-42338 (#83)

## [1.1.4] - 2026-05-21

### Changed

- align Node.js runtime policy to 22/24/26 with default runtime on 26 (#75)
- bump @biomejs/biome in the minor-and-patch group (#74)
- bump actions/cache from 4 to 5 (#73)
- remove push and pull_request triggers from CI workflows
- grant additional permissions for container workflow (#72)
- inherit repository secrets
- bump container-build-flow-action to v1.8.1 and normalise spacing
- add one‑server‑per‑platform guidance and improve tables
- add contribute-now setup and CLI instructions
- configure checkout to fetch full history
- add gitleaks license env var
- use bunx biome for lint and compact biome config arrays
- update ci, add security scans, adopt biome, refactor webhook service
- bump @typescript-eslint packages to 8.59.1
- bump wgtechlabs/container-build-flow-action from 1.7.1 to 1.8.0 (#69)
- bump the minor-and-patch group with 3 updates (#70)

### Removed

- remove contributor rc file

## [1.1.3] - 2026-05-03

### Security

- fix Docker Scout vulnerabilities by updating Node.js, Bun, and picomatch (#67)

## [1.1.2] - 2026-04-29

### Changed

- override release-platforms to amd64 to eliminate QEMU arm64 stalls (#65)

## [1.1.1] - 2026-04-29

### Changed

- consolidate webhook, ci, and dependency maintenance changes (#64)
- build(deps): bump vite in the npm_and_yarn group across 1 directory (#52)
- add dependabot for npm, actions, and docker

## [1.1.0] - 2026-03-03

### Added

- add composite fingerprint deduplication

### Changed

- configure LogEngine with no timestamps
- remove emoji prefixes from log messages
- bump @wgtechlabs/log-engine to 2.3.1
- ignore `.contributerc.json` config file
- add atomic claimFingerprint with NX pattern
- update contribution config
- enhance platform source detection with botName pattern matching
- add GitHub Actions workflow for building production container
- update container build action to v1.3.1
- streamline release workflow and remove unused steps
- adopt clean commit convention (#26)
- replace SECURITY.md with unified security policy (#23)


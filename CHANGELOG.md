# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


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


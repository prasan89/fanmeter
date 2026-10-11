# FanClash — Product Finish Plan

## Product promise
FanClash is where fandoms actively compete: fans vote for contestants, rally their fanbase, react to updates, and debate rival fandoms. The experience should feel energetic but stay safe, fair, and fast on mobile.

## MVP pillars

### 1. Fan voting
- A voting hub with live shows/seasons and eligible contestants.
- One vote per contestant per voting round per voter identity.
- Vote receipt and current results; clearly label results as FanClash community votes, not official show results.
- Voting windows controlled by moderators/admins; closed and upcoming states.
- Rate-limit write endpoints; never trust client-submitted vote totals.
- For initial beta, use a persistent anonymous browser voter ID and clearly explain that clearing browser storage can reset identity. Before public growth, require sign-in/verified identity or stronger abuse controls.

### 2. Fan wars
- Season-level contestant leaderboard and show-level fanbase totals.
- Battle cards: contestant vs contestant, percentage share, vote difference, and shareable results.
- Rank by valid votes from the database. No hardcoded or client-computed totals.
- Future: timed battles, streaks, fan badges, share cards.

### 3. Fan discussions
- Feed scoped to a show/season/contestant.
- Fans can post a short comment, react with a small fixed set (🔥 ❤️ 😂 👏), and remove their own reaction.
- Optimistic UI with server confirmation, pagination, input validation, and basic per-voter rate limits.
- Report action and moderation status built into the data model. No harassment, doxxing, threats, or slurs; rivalry targets the contestants/performances, not real-world groups.

## Technical approach
- Keep existing Next.js 16 + TypeScript + Tailwind frontend and Java 17 Spring Boot + PostgreSQL backend.
- Use Flyway migrations; all vote counts and reaction counts are computed or transactionally updated on the server.
- Add persistent voter identity for the MVP, not a fake auth system. Make the limitations visible and harden before public launch.
- No realtime infrastructure at first: refresh results on interaction/manual refresh, then add short polling only where justified.
- Protect write APIs with validation, idempotency constraints, sensible rate limits, pagination, and moderation controls.

## Milestones
- M4: Voting schema, endpoints, idempotent vote submission, contestant vote totals, tests.
- M5: Vote hub UI integrated with live API; empty/loading/error/closed states.
- M6: Fan wars leaderboard UI and API backed by vote totals.
- M7: Discussion/comments/reactions schema and API, moderation/report support.
- M8: Discussion UI embedded in contestant and season pages.
- M9: abuse controls, accessibility, SEO, mobile QA, responsive empty states, security review.
- M10: CI green, deployment smoke checks, data/rollback plan, launch checklist.

## Release gates
- Backend tests verify duplicate voting is blocked, only eligible contestants can be voted for, and concurrent submissions cannot inflate totals.
- Frontend typecheck, lint, build all pass.
- CI workflow passes on the feature branch; no secrets or private keys are committed.
- Live API URL, Cloud SQL migrations, CORS origins, and Cloud Run deploy are verified before public launch.
- Voting copy clearly states unofficial community poll; admins can close voting; reports can be acted on.

## Not in first release
Direct messages, image/video uploads, anonymous unmoderated live chat, paid votes, and claims that the poll represents official results.

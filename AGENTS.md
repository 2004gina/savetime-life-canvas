<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Ambulance-crew app is a mobile-first web prototype of SaveTime (github.com/bko0529/Savetime). src/lib/domain/stateMachine.ts is a verbatim copy of the repo's server/src/domain/stateMachine.ts — never edit it locally; re-copy from the repo so rules stay identical.
- src/lib/engine.ts is a fake server: every status change goes through transitionTransport/transitionHreq; swap it for API/Socket.IO later without touching screens.
- Login, signup, team (duty) and invites come from the SaveTime server: src/lib/auth-server.ts calls the API (src/lib/api.ts, base URL from VITE_API_BASE_URL, default http://localhost:4000) and Socket.IO /app (src/lib/realtime.ts), then writes into src/lib/auth-store.ts (only consent, permissions, tokens and the server copy of my account/team are stored on the device). On the server, leaving a team = ending duty = logout. Pure rule/mapping functions are tested in src/test/auth-rules.test.ts; AppGate.gateTarget enforces min version → consent → permissions → login → approval → duty, so screens never decide navigation order themselves.
- Duty end, logout and withdrawal all go through src/lib/duty.ts leave() so the last team member's active transport is cancelled with the matching reason.
- Transport state lives in a React context (src/lib/transport-store.tsx) shared across routes; patient name/ID/phone are never collected (repo privacy rule).

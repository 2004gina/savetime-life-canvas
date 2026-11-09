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
- Login/onboarding/duty state is a device-local mock (src/lib/auth-store.ts, pure rule functions tested in src/test/auth-rules.test.ts); AppGate.gateTarget enforces min version → consent → permissions → login → approval → duty, so screens never decide navigation order themselves.
- Duty end, logout and withdrawal all go through src/lib/duty.ts leave() so the last team member's active transport is cancelled with the matching reason.
- Transport state lives in a React context (src/lib/transport-store.tsx) shared across routes; patient name/ID/phone are never collected (repo privacy rule).

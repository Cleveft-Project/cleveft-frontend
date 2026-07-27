# cleveft-frontend

The Cleveft mobile app — an Expo (React Native + TypeScript) client for
recording lectures, reading AI-structured notes, querying them, and preparing
for exams.

Everything the app calls goes through the API gateway on port `8080`. It never
talks to a microservice directly.

## Screens

Routing is file-based via `expo-router`, split into two groups so authenticated
and unauthenticated states cannot bleed into each other.

| Route                | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `(auth)/welcome`     | First-run landing                                              |
| `(auth)/login`       | Sign in                                                        |
| `(auth)/sign-up`     | Register                                                       |
| `(tabs)/home`        | Dashboard — recent lectures, streak, weak areas, readiness      |
| `(tabs)/record`      | Audio recorder with live waveform, plus PDF import              |
| `(tabs)/chat`        | RAG chat over your own lectures, with transcript citations      |
| `(tabs)/examprep`    | Quizzes and performance tracking                                |
| `(tabs)/collab`      | Peers, shared learning paths and threads                        |
| `transcript`         | Transcript reader and note view for one lecture                 |
| `quiz`               | Quiz player                                                     |
| `settings`           | Profile, theme, sign out                                        |
| `upgrade`            | Plan tiers                                                      |

## Project layout

```
app/            routes only — each file is a screen
src/api/        typed gateway client, token storage, audio upload
src/components/ shared UI primitives (cards, meters, headers, tab bar)
src/theme/      light and dark palettes, spacing and typography tokens
src/hooks/      data-fetching and async helpers
src/state/      auth context
src/lib/        pure helpers (streak computation, formatting)
```

Both colour schemes are defined in `src/theme/palettes.ts` with identical keys,
so no component ever branches on which scheme is active.

## Getting started

```bash
npm install
cp .env.example .env
npx expo start
```

### Pointing the app at your backend

`EXPO_PUBLIC_GATEWAY_URL` in `.env` decides which gateway the app calls. The
correct value depends on where the app is running:

| Running on        | Value                                |
| ----------------- | ------------------------------------ |
| Web / simulator   | `http://localhost:8080`              |
| Android emulator  | `http://10.0.2.2:8080`               |
| Physical device   | `http://<your-computer-LAN-IP>:8080` |

A physical device cannot reach `localhost` — that resolves to the phone itself.
Use the LAN address your computer reports on the same Wi-Fi network.

The backend must be running for anything past the welcome screen to work; see
[`cleveft-infra`](https://github.com/Cleveft-Project/cleveft-infra) for bringing
up the stack.

### Expo Go version

Expo Go supports one SDK generation at a time. This project targets **SDK 56**,
so a newer Expo Go installed from the app store will refuse to open it. If you
see "Project is incompatible with this version of Expo Go", install the matching
build from `https://expo.dev/go?sdkVersion=56`.

## Checks

```bash
npx tsc --noEmit     # type check
npx expo lint        # lint
```

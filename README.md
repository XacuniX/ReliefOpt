# ReliefOpt

ReliefOpt is a disaster-relief coordination application for Bangladesh. It combines incident reporting, approvals, mapping, task assignment, inventory, role-based access, offline snapshots, and English voice-to-text reporting in a React web app and a Capacitor Android package. Users can authenticate with a local username/password account or, on the web, with Google Identity Services (GIS).

The detailed functional and non-functional requirements are in [SRS.md](SRS.md).

## Requirements

- Node.js 20 or newer (Node.js 22 is recommended and used by CI)
- npm
- PostgreSQL 14 or newer for persistent development and production
- A Google Cloud OAuth 2.0 web client ID for Google Sign-In
- Chromium for Playwright end-to-end tests
- Android builds: JDK 21, Android Studio or an Android SDK, and internet access for the one-time Whisper model download

On Windows PowerShell, use `npm.cmd` instead of `npm` if the local execution policy blocks `npm.ps1`.

## Install dependencies

From the repository root:

```powershell
npm ci
npm --prefix server ci
```

The client and server have separate lockfiles, so both commands are required.

## Fast local demo (no PostgreSQL required)

The demo server uses an in-memory database and resets whenever it stops.

Terminal 1:

```powershell
npm.cmd --prefix server run e2e
```

Terminal 2:

```powershell
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` and enter any active demo username below with the password `ReliefOpt!123`. The former development-account portal has been removed from the login page. This in-memory server is intended for password-based demos; use the persistent API configuration below to exercise Google Sign-In.

| Role | Active usernames |
| --- | --- |
| Central administrator | `rahim`, `sharmin` |
| Warehouse manager | `fatima`, `roksana` |
| Field worker | `kamal`, `nasrin`, `taslima`, `jahangir`, `abdul` |

`mizanur` is intentionally inactive and cannot sign in.

## Persistent PostgreSQL setup

1. Create a PostgreSQL database and user. The defaults expected by the example configuration are:

   - Database: `reliefopt`
   - User: `reliefopt`
   - Password: `reliefopt`
   - Host and port: `127.0.0.1:5432`

2. Create the API environment file:

```powershell
Copy-Item server/.env.example server/.env
```

3. Review `server/.env`. At minimum:

   - Set a valid `DATABASE_URL`.
   - Replace `JWT_SECRET` with a private random value of at least 32 characters.
   - Set `GOOGLE_CLIENT_ID` to a Google OAuth 2.0 **web** client ID.
   - Keep `DEMO_PASSWORD` at least as long as `PASSWORD_MIN_LENGTH` if you seed demo users.

4. Create a root `.env` for the browser build and set at least:

```dotenv
VITE_API_URL=http://127.0.0.1:4000
VITE_AUTH_TIMEOUT_MS=8000
VITE_GOOGLE_CLIENT_ID=<same-web-client-id>.apps.googleusercontent.com
```

5. Apply all PostgreSQL migrations and optionally seed the demo records:

```powershell
npm run server:migrate
npm run server:seed:demo
```

Migration `007_user_oauth.sql` adds `google_id`, `avatar_url`, and `auth_provider` and permits a null `password_hash` for Google-only accounts. The migration runner only requires the database settings, so `npm run server:migrate` can run before the JWT and Google settings are complete.

6. Start the API and client in separate terminals:

```powershell
npm run server:dev
```

```powershell
npm run dev
```

The default client is at `http://127.0.0.1:5173`, and the API is at `http://127.0.0.1:4000`. Readiness can be checked at `/health/ready`; process liveness is available at `/health/live`.

### Environment variables

The root `.env` controls the browser client:

| Variable | Purpose | Default example |
| --- | --- | --- |
| `VITE_API_URL` | API base URL embedded in the client build | `http://127.0.0.1:4000` |
| `VITE_AUTH_TIMEOUT_MS` | Authentication request timeout | `8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google web OAuth client ID used by the GIS button | `<client-id>.apps.googleusercontent.com` |

Set `GOOGLE_CLIENT_ID` on the API to the same Google web OAuth client ID. For local development, Vite also accepts `GOOGLE_CLIENT_ID` as a fallback when `VITE_GOOGLE_CLIENT_ID` is absent. Add the exact development origins you use, such as `http://127.0.0.1:5173` and `http://localhost:5173`, to that OAuth client's authorized JavaScript origins in Google Cloud Console.

The API loads `server/.env` first and then uses the root `.env` only as a fallback for unset values. `server/.env.example` documents all API settings, including database TLS, connection-pool limits, allowed client origins, JWT and Google settings, password rules, and login rate limits. Never commit `server/.env` or the root `.env`.

## Authentication

ReliefOpt supports two authentication paths:

- **Local:** `POST /api/auth/login` verifies a username/password pair against a bcrypt hash. Public registration at `POST /api/auth/register` creates an active, unassigned `field_worker`.
- **Google GIS:** the official Google button on both web auth forms returns an ID-token credential. The client sends `{ "credential": "<Google ID token>" }` to `POST /api/auth/google`; the API verifies its signature and audience with `google-auth-library` and `GOOGLE_CLIENT_ID`.

For Google authentication, the server first resolves `google_id`. If it has not seen that Google account, it links an existing ReliefOpt user with the same normalized email or creates a passwordless, active, unassigned `field_worker`. Linked local users retain their password. Both paths issue the same ReliefOpt JWT, so protected APIs and role routing are unchanged. A Google client secret and Google refresh token are not used because this flow authenticates identity only; it does not request background access to Google APIs.

Fresh local or Google authentication requires Central Command connectivity. An existing, unexpired ReliefOpt JWT can continue an offline session. GIS is hidden in the Capacitor Android WebView because the current Google web flow does not support that native container; the Android build currently uses username/password authentication.

## Build and preview the web app

```powershell
npm run build
npm run preview
```

The production web output is generated in `dist/`. It is intentionally excluded from Git and should be rebuilt for each release.

## Tests and code quality

Run the full validation suite used by CI:

```powershell
npm run check
```

Useful individual commands:

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

For browser end-to-end tests, install Chromium once and then run Playwright:

```powershell
npx playwright install chromium
npm run test:e2e
```

To run the tests that require a real PostgreSQL instance, set `TEST_DATABASE_URL` and run:

```powershell
npm --prefix server run test:postgres
```

Playwright reports, screenshots, dependency folders, coverage, and build outputs are generated locally and are not stored in the repository.

## Voice reporting

Voice reporting is English-only and uses `Xenova/whisper-base.en`; it does not use the browser speech-recognition service. Recordings are capped at 30 seconds. The transcript parser recognizes all Bangladesh district names and a broader disaster vocabulary when preparing map reports.

- On the web, the quantized model downloads on first use and is cached by the browser. The initial transcription therefore takes longer and requires available browser storage.
- Microphone access requires HTTPS or a localhost origin. Grant microphone permission in both the browser and operating system, then select the correct input device in the voice-report dialog.
- On Android, the quantized model is bundled into the APK by the build workflow, so end users do not download it separately.

## Build the Android APK

The Android source project is in `android/`. Generated Capacitor assets, Gradle output, local SDK paths, and downloaded model files are intentionally excluded from Git.

1. Install the JavaScript dependencies as described above.
2. Make JDK 21 and the Android SDK available. Android Studio can create `android/local.properties` automatically; alternatively configure your normal Android SDK environment variables.
3. Download the quantized Whisper model once:

```powershell
npm run android:download-model
```

4. Build the debug APK on Windows:

```powershell
npm run android:build
```

The workflow builds the web client, regenerates the Capacitor Android assets, copies the downloaded model into those assets, and runs Gradle. The APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To put a convenient copy at the repository root after a build:

```powershell
Copy-Item android/app/build/outputs/apk/debug/app-debug.apk ReliefOpt-debug.apk -Force
```

APK files are ignored by Git. The root copy is a local release artifact, while the Gradle output above is the canonical build location.

On macOS or Linux, synchronize first and invoke the Unix Gradle wrapper:

```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

### Connect an Android build to a development PC

Use the PC's LAN IPv4 address when building, because `127.0.0.1` inside the phone points to the phone itself. Replace `<PC_LAN_IP>` below and allow port `4000` through the PC firewall:

```powershell
$env:VITE_API_URL="http://<PC_LAN_IP>:4000"
$env:E2E_HOST="0.0.0.0"
$env:E2E_CLIENT_ORIGINS="http://<PC_LAN_IP>:5173,capacitor://localhost,http://localhost,https://localhost"
npm --prefix server run e2e
```

In another terminal, build and install the APK:

```powershell
$env:VITE_API_URL="http://<PC_LAN_IP>:4000"
npm run android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Use a persistent API server instead of the in-memory server when testing data durability.

## Nearby offline Android sync

Nearby sync is intended for two Google-certified Android phones with Google Play services. Keep Bluetooth and Wi-Fi enabled and leave ReliefOpt open on both devices.

1. While online, sign in on both phones and refresh the approved operational snapshot.
2. Disconnect the receiving phone from the network.
3. Open **Nearby Offline Sync** on both devices.
4. Start sending on one phone and receiving on the other.
5. Confirm that the verification codes match, accept the transfer, and verify the refreshed data.

Current limitations: one sender and one receiver per transfer, approved snapshots only, a payload below roughly 900 KB, and foreground operation. Nearby sync is Android-only; browser users use the normal network synchronization path.

## Test from another device on the LAN

Start the in-memory API and Vite on all interfaces:

```powershell
$env:E2E_HOST="0.0.0.0"
$env:E2E_CLIENT_ORIGINS="http://<PC_LAN_IP>:5173"
npm --prefix server run e2e
```

```powershell
$env:VITE_API_URL="http://<PC_LAN_IP>:4000"
npm run dev -- --host 0.0.0.0
```

Open `http://<PC_LAN_IP>:5173` from the other device. Browser microphone APIs may be unavailable over plain LAN HTTP; use HTTPS for voice testing outside localhost.

## Repository layout

```text
android/       Android/Capacitor source project
e2e/           Playwright browser tests
public/        Static web assets
scripts/       Android model download and asset synchronization
server/        Express API, PostgreSQL migrations, seed data, and tests
src/           React application
test/          Client and shared-library tests
README.md      Setup, operation, validation, and build guide
SRS.md         Software requirements specification
```

## Troubleshooting

- **Client cannot reach the API:** verify `VITE_API_URL`, start the API, and include the client origin in `CLIENT_ORIGINS` or `E2E_CLIENT_ORIGINS`.
- **API says `DATABASE_URL`, `JWT_SECRET`, or `GOOGLE_CLIENT_ID` is required:** create `server/.env` from `server/.env.example`. Migrations require only the database configuration; running the API requires all three settings.
- **PostgreSQL readiness fails:** verify that PostgreSQL is running, the database exists, credentials are correct, and migrations have completed.
- **Google button is missing:** set `VITE_GOOGLE_CLIENT_ID`, restart Vite so it rebuilds its environment, and test in a web browser. The button is intentionally absent in the Android app.
- **Google verification fails:** make sure the frontend and API use the same web client ID, the exact browser origin is authorized in Google Cloud Console, and the credential is being sent to the persistent API's `POST /api/auth/google` endpoint.
- **Microphone is unavailable:** use localhost or HTTPS, grant browser and OS permission, close other apps holding the device, and select the intended microphone.
- **Whisper fails to load in a browser:** check the connection and browser storage, then reload. The model is cached after its first successful download.
- **Android model is missing:** run `npm run android:download-model` before `npm run android:build`.
- **Gradle cannot find the SDK or Java:** use JDK 21 and open the `android/` project once in Android Studio to configure the local SDK.

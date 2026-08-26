# ReliefOpt

ReliefOpt is a disaster-relief coordination application for Bangladesh. It combines incident reporting, approvals, mapping, task assignment, inventory, role-based access, offline snapshots, and English voice-to-text reporting in a React web app and an Android package.

The detailed functional and non-functional requirements are in [SRS.md](SRS.md).

## Requirements

- Node.js 20 or newer (Node.js 22 is recommended and used by CI)
- npm
- PostgreSQL 14 or newer for persistent development and production
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

```$env:E2E_HOST="0.0.0.0"    
$env:E2E_CLIENT_ORIGINS="https://localhost,http://192.168.110.225:5173"
npm.cmd --prefix server run e2e
```

Terminal 2:

```
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` and sign in with any active demo username below. The demo password is `ReliefOpt!123`.

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

2. Create the environment files:

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
```

3. Review `server/.env`. At minimum, set a valid `DATABASE_URL`, replace `JWT_SECRET` with a private random value of at least 32 characters, and keep `DEMO_PASSWORD` at least as long as `PASSWORD_MIN_LENGTH`.

4. Apply the schema and seed the demo records:

```powershell
npm run server:migrate
npm run server:seed:demo
```

5. Start the API and client in separate terminals:

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

`server/.env.example` documents all API settings, including database TLS, connection-pool limits, allowed client origins, JWT settings, password rules, and login rate limits. Never commit `server/.env` or the root `.env`.

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
SRS.md         Software requirements specification
```

## Troubleshooting

- **Client cannot reach the API:** verify `VITE_API_URL`, start the API, and include the client origin in `CLIENT_ORIGINS` or `E2E_CLIENT_ORIGINS`.
- **PostgreSQL readiness fails:** verify that PostgreSQL is running, the database exists, credentials are correct, and migrations have completed.
- **Microphone is unavailable:** use localhost or HTTPS, grant browser and OS permission, close other apps holding the device, and select the intended microphone.
- **Whisper fails to load in a browser:** check the connection and browser storage, then reload. The model is cached after its first successful download.
- **Android model is missing:** run `npm run android:download-model` before `npm run android:build`.
- **Gradle cannot find the SDK or Java:** use JDK 21 and open the `android/` project once in Android Studio to configure the local SDK.

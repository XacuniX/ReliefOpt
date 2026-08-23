# ReliefOpt

Disaster relief coordination dashboard — React 19 + Vite + PWA.

## Demo login

There are two supported local demo modes.

### Quick demo without PostgreSQL

This starts an in-memory Central Command server. It is intended for a quick
local walkthrough; data is reset whenever the server is stopped.

In one terminal, run:

```powershell
npm.cmd --prefix server run e2e
```

In a second terminal, start the client:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

The quick-demo credentials are:

```text
Username: rahim
Password: ReliefOpt!123
```

The same password works for every active demo account in this mode.

### Persistent demo with PostgreSQL

For persistent local data, start PostgreSQL, copy `server/.env.example` to
`server/.env`, and set `DEMO_PASSWORD` in `server/.env`. For example:

```text
DEMO_PASSWORD=ReliefOpt!123
```

Then run:

```powershell
npm.cmd run server:migrate
npm.cmd run server:seed:demo
npm.cmd run server:dev
```

Start the Vite client separately with `npm.cmd run dev`. The PostgreSQL demo
password is whatever value is configured as `DEMO_PASSWORD`; it is not fixed by
the application code.

Central Admins manage accounts from the Users page. Creating an account requires
a 12-character temporary password. Editing an account can optionally set a new
password; a password change revokes that user's existing access tokens. Role,
status, and team changes are read from PostgreSQL on subsequent authorized
requests, and inactive accounts cannot sign in.

| Username  | Role              |
|-----------|-------------------|
| `rahim`   | Central Admin     |
| `fatima`  | Warehouse Manager |
| `kamal`   | Field Worker      |
| `nasrin`  | Field Worker      |
| `taslima` | Field Worker      |
| `jahangir`| Field Worker      |
| `sharmin` | Central Admin     |
| `abdul`   | Field Worker      |
| `roksana` | Warehouse Manager |

The seeded `mizanur` account is a Warehouse Manager but has status `Inactive`,
so login is intentionally refused until a Central Admin reactivates it.

## Two-phone WebRTC snapshot test

For a local-network test, keep the PC, Phone A, and Phone B on the same Wi-Fi
or Ethernet network. Find the PC's IPv4 address with `ipconfig`, then replace
`<PC_LAN_IP>` below with that address.

Start the in-memory demo server in one PowerShell terminal:

```powershell
$env:E2E_HOST="0.0.0.0"
$env:E2E_CLIENT_ORIGINS="http://<PC_LAN_IP>:5173"
npm.cmd --prefix server run e2e
```

Start the client in a second PowerShell terminal:

```powershell
$env:VITE_API_URL="http://<PC_LAN_IP>:4000"
npm.cmd run dev -- --host 0.0.0.0
```

On both phones, open `http://<PC_LAN_IP>:5173` and sign in before simulating
offline mode. If Windows asks about firewall access for Node.js, allow it on
your private network.

To test snapshot relay, Phone A can stay online, submit a change, and wait for
a Central Admin on the PC to approve it. Phone B then uses **Simulate Offline**
in the Sync dialog. Connect the phones through **Manual (two devices)** by
copying the offer/answer text, then press **Push snapshot** on Phone A. Phone B
will apply the newer authoritative snapshot while remaining offline.

# HAACHIKO FITNESS — Project Summary

> **Stack:** React 18 (CRA) + FastAPI + MySQL  
> **Last updated:** May 2026

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [API Endpoints](#2-api-endpoints)
3. [Database Schema](#3-database-schema)
4. [React Component Structure](#4-react-component-structure)
5. [Design Tokens & Color Scheme](#5-design-tokens--color-scheme)
6. [AI Chatbot (FitAssist)](#6-ai-chatbot-fitassist)
7. [Auth & Session Management](#7-auth--session-management)
8. [Known Bugs & Incomplete Features](#8-known-bugs--incomplete-features)

---

## 1. Project Structure

```
PRO_FITNESS/
├── .env                          # MYSQL_USERNAME, MYSQL_PASSWORD, ANTHROPIC_API_KEY
├── .python-version               # Python ≥ 3.12
├── pyproject.toml                # Backend dependencies (uv)
├── Schema.sql                    # MySQL DDL (note: incomplete — see §8)
├── main.py                       # FastAPI app, CORS, router registration
├── db.py                         # MySQL connection via mysql-connector-python
├── populate.py                   # Seed script
│
├── routes/
│   ├── auth.py                   # POST /register, POST /login
│   ├── auth_dependency.py        # get_current_user, get_optional_user, require_role()
│   ├── users.py                  # CRUD /users/, GET /users/trainers/
│   ├── membership.py             # CRUD /membership_plans/
│   ├── user_membership.py        # GET /memberships, GET /memberships/me, POST /memberships
│   ├── sessions.py               # CRUD /sessions
│   ├── attendance.py             # GET/POST /attendance
│   ├── trainer_availability.py   # GET/POST /trainer_availability/
│   ├── chat_api.py               # POST /chat
│   └── change_password.py        # POST /change-password
│
├── chatbot/
│   ├── tools.py                  # LangGraph agent, all AI tools, response() function
│   ├── streamlit.py              # Legacy Streamlit UI (deprecated)
│   └── pages/signup.py           # Legacy Streamlit signup page (deprecated)
│
└── gym-admin/                    # React frontend (CRA, port 3001)
    ├── package.json
    └── src/
        ├── App.js                # Root: routing by role (admin/trainer/client/landing)
        ├── App.css               # All styles (~3200 lines)
        ├── api.js                # Axios instance + all API call functions
        ├── auth.js               # localStorage helpers (token, name, role, userId)
        ├── bookingEvent.js       # Custom event: pf:booking_confirmed
        ├── chatEvent.js          # Custom event: pf:open_chat
        ├── index.js              # React DOM entry point
        └── components/
            ├── LandingPage.js    # Public landing page with pricing
            ├── LandingChatbot.js # Unauthenticated chatbot widget
            ├── Login.js          # Auth form
            ├── Register.js       # Registration + plan selection + auto-login
            ├── Header.js         # Admin nav header
            ├── ProfileMenu.js    # First-name avatar + sign-out dropdown
            ├── Modal.js          # Reusable modal wrapper
            ├── Dashboard.js      # Admin: stats, expiring memberships, recent activity
            ├── Schedule.js       # Admin: weekly calendar + session creation
            ├── Clients.js        # Admin: client CRUD table
            ├── Trainers.js       # Admin: trainer table + slide-over panel
            ├── TrainerApp.js     # Trainer portal: today/week schedule + availability
            ├── ClientApp.js      # Client portal: hero card + sessions + booking
            └── Chatbot.js        # Authenticated floating chatbot widget
```

---

## 2. API Endpoints

All routes are prefixed `/api`. Backend runs on `http://127.0.0.1:8000`.  
Auth is per-route via FastAPI `Depends()` — no global middleware.

### Auth Helpers

| Helper | Behavior |
|---|---|
| `get_current_user` | Decodes Bearer JWT; raises **401** if missing/expired/invalid |
| `get_optional_user` | Returns decoded payload or `None` (never raises) |
| `require_role(*roles)` | Wraps `get_current_user`; raises **403** if role not in allowed list |

JWT payload: `{ user_id: int, role: str, exp: now+1h }` — signed HS256, secret from `.env`.

---

### POST /api/register
- **Auth:** Public
- **Request body:**
  ```json
  { "f_name": "str", "l_name": "str", "email": "str",
    "phone": "str", "address": "str", "role": "str", "password": "str" }
  ```
  > ⚠️ `role` field is ignored — all registrations create a `client` regardless.
- **Response:** `{ "message": "..." }`

---

### POST /api/login
- **Auth:** Public
- **Request body:** `{ "email": "str", "password": "str" }`
- **Response (success):**
  ```json
  { "message": "Login successful", "token": "<JWT>",
    "role": "admin|trainer|client", "user_id": 1, "first_name": "Jane" }
  ```
- **Response (failure):** `{ "message": "Incorrect email or password. Please try again." }`

---

### GET /api/users/
- **Auth:** `require_role("admin")`
- **Response:** `{ "message": "...", "Data": [ <full user rows> ] }`

### POST /api/users/
- **Auth:** `require_role("admin")`
- **Request body:**
  ```json
  { "f_name": "str", "l_name": "str", "email": "str",
    "phone": "str", "address": "str", "role": "str" }
  ```
  > ⚠️ No `password` field — newly created admin/trainer accounts have no password hash. The frontend sends `password` but the users.py route does not handle it.
- **Response:** `{ "message": "...", "id": 1 }`

### PUT /api/users/{user_id}
- **Auth:** `require_role("admin")`
- **Request body (all optional):** `{ "f_name", "l_name", "email", "phone", "address" }`
- **Response:** `{ "messages": "User updated succesfully" }`

### DELETE /api/users/{user_id}
- **Auth:** `require_role("admin")`
- **Response:** `{ "messages": "User deleted succesfully" }`

### GET /api/users/trainers/
- **Auth:** `get_current_user` (any role)
- **Response:** `{ "message": "...", "Data": [ { "id", "first_name", "last_name" } ] }`

---

### GET /api/membership_plans/
- **Auth:** Public
- **Response:** `{ "message": "...", "Data": [ <plan rows> ] }`

### POST /api/membership_plans/
- **Auth:** `require_role("admin")`
- **Request body:**
  ```json
  { "membership_name": "str", "membership_session_limit": 10,
    "membership_duration": 30, "membership_price": 99 }
  ```
- **Response:** `{ "message": "...", "id": 1 }`

---

### GET /api/memberships
- **Auth:** `require_role("admin")`
- **Response:** `{ "message": "...", "Data": [ <all membership rows> ] }`

### GET /api/memberships/me
- **Auth:** `require_role("client")`
- **Response:** `{ "message": "...", "Data": [ <latest membership row for logged-in client> ] }`

### POST /api/memberships
- **Auth:** `require_role("admin", "client")`
- **Request body:** `{ "client_id": 1, "plan_id": 2, "start_date": "2025-01-01" }`
- **Behavior:** auto-calculates `end_date = start_date + plan.duration_days`, sets `sessions_remaining = plan.session_limit`
- **Response:** `{ "message": "...", "id": 1 }`

---

### GET /api/sessions
- **Auth:** `require_role("admin", "trainer", "client")`
- **Response:** `{ "message": "...", "Data": [ <session rows, scheduled_at as ISO+Z> ] }`
  > ⚠️ Returns ALL sessions — no server-side per-user filtering. Clients and trainers must filter client-side.

### POST /api/sessions
- **Auth:** `require_role("admin", "client")`
- **Request body:**
  ```json
  { "client_id": 1, "trainer_id": 2, "membership_id": 3,
    "scheduled_at": "2025-06-10T10:00:00", "duration_min": 60, "notes": "..." }
  ```
- **Response:** `{ "message": "...", "id": 1 }`

### PUT /api/sessions/{session_id}
- **Auth:** `require_role("admin", "client")`
- **Request body (both optional):** `{ "status": "cancelled", "notes": "..." }`
- **Response:** `{ "message": "Session updated successfully" }`

---

### GET /api/attendance
- **Auth:** `require_role("admin", "client", "trainer")`
- **Response:** `{ "message": "Here are the attedance: <first row as string>" }`
  > ⚠️ Bug — only returns the first row embedded in a message string.

### POST /api/attendance
- **Auth:** `require_role("admin", "trainer")`
- **Request body:**
  ```json
  { "session_id": 1, "user_id": 2, "role": "client",
    "check_in": "2025-06-10", "status": "present" }
  ```
- **Behavior:** if `role == "client"`, decrements `sessions_remaining` on the active membership (if not NULL).
- **Response:** `{ "message": "Attendance Recorded", "id": 1 }`

---

### GET /api/trainer_availability/
- **Auth:** `require_role("admin", "trainer")`
- **Response:**
  ```json
  { "message": "...", "Data": [
    { "trainer_id": 1, "day_of_week": "monday",
      "start_time": "09:00 AM", "end_time": "05:00 PM" }
  ] }
  ```
  > Times are formatted `%h:%i %p` (12-hour). The `id` column is **not** returned by this endpoint — affects client-side delete logic.

### POST /api/trainer_availability/
- **Auth:** `require_role("admin", "trainer")`
- **Request body:**
  ```json
  { "trainer_id": 1, "day_of_week": "monday",
    "start_time": "09:00", "end_time": "17:00" }
  ```
- **Response:** `{ "message": "...", "id": 1 }`

### DELETE /api/trainer_availability/{id}
- **Auth:** `require_role("admin", "trainer")`
- **Response:** `{ "message": "..." }`
  > ⚠️ Frontend calls this but the endpoint **does not exist** in `trainer_availability.py` — will return **404**. Needs to be added.

---

### POST /api/chat
- **Auth:** `get_optional_user` (public — unauthenticated requests get guest chatbot tools)
- **Request body:** `{ "content": "str" }`
- **Response:**
  ```json
  { "reply": "str", "booking_confirmed": false, "booking_cancelled": false }
  ```

---

### POST /api/change-password
- **Auth:** `require_role("admin", "trainer", "client")`
- **Request body:** `{ "original_password": "str", "new_password": "str" }`
- **Response (success):** `{ "message": "Password updated successfully" }`
- **Response (failure):** HTTP 400

---

## 3. Database Schema

**Database name:** `gym_application` (MySQL)  
**Connection:** localhost, credentials from `.env` (`MYSQL_USERNAME`, `MYSQL_PASSWORD`)

### users
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(100) | UNIQUE |
| `phone` | VARCHAR(20) | |
| `address` | VARCHAR(200) | |
| `role` | ENUM('client','admin','trainer') | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `password_hash` | VARCHAR | NOT NULL (inferred) — **missing from Schema.sql** |

### membership_plans
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `name` | VARCHAR(50) | NOT NULL |
| `duration_days` | INT | NOT NULL |
| `session_limit` | INT | DEFAULT NULL (NULL = unlimited) |
| `price` | DECIMAL(10,2) | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |

### memberships
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `client_id` | INT | NOT NULL, FK → users(id) |
| `plan_id` | INT | NOT NULL, FK → membership_plans(id) |
| `start_date` | DATE | NOT NULL |
| `end_date` | DATE | NOT NULL |
| `sessions_remaining` | INT | DEFAULT NULL |
| `status` | ENUM('active','expired','cancelled') | NOT NULL, DEFAULT 'active' |

### sessions
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `client_id` | INT | NOT NULL, FK → users(id) |
| `trainer_id` | INT | NOT NULL, FK → users(id) |
| `membership_id` | INT | NOT NULL, FK → memberships(id) |
| `scheduled_at` | DATETIME | NOT NULL |
| `duration_min` | INT | NOT NULL, DEFAULT 60 |
| `status` | ENUM('scheduled','completed','cancelled','no_show') | NOT NULL, DEFAULT 'scheduled' |
| `notes` | TEXT | |

### attendance
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `session_id` | INT | NOT NULL, FK → sessions(id) |
| `user_id` | INT | NOT NULL, FK → users(id) |
| `role` | ENUM('client','trainer') | NOT NULL |
| `check_in` | DATETIME | |
| `status` | ENUM('present','absent','late') | NOT NULL |

### trainer_availability
| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `trainer_id` | INT | NOT NULL, FK → users(id) |
| `day_of_week` | ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') | NOT NULL |
| `start_time` | TIME | NOT NULL |
| `end_time` | TIME | NOT NULL |

---

## 4. React Component Structure

Frontend port: `http://localhost:3001`  
API base: `http://127.0.0.1:8000/api` (hardcoded in `api.js`)

### Routing (App.js)

```
view state
├── 'landing'   → <LandingPage>
├── 'login'     → <Login>
├── 'register'  → <Register>
├── 'admin'     → <Header> + activeTab → Dashboard | Schedule | Clients | Trainers
│                 + <Chatbot>
├── 'trainer'   → <TrainerApp> (self-contained with header)
└── 'client'    → <ClientApp> (self-contained with header)
```

On mount, App.js reads `pf_token` from localStorage, validates it with `isTokenValid()` (checks `exp`), and routes to the appropriate view via `getRole()`.

---

### Component → API Endpoint Map

| Component | API Calls |
|---|---|
| **LandingPage** | `GET /membership_plans/` (public) |
| **LandingChatbot** | `POST /chat` (no token) |
| **Login** | `POST /login` |
| **Register** | `POST /register` → `POST /login` → `POST /memberships` (if plan selected) |
| **Dashboard** | `GET /users/` `GET /sessions` `GET /memberships` `GET /membership_plans/` → `POST /attendance` `PUT /sessions/{id}` |
| **Schedule** | `GET /sessions` `GET /users/` `GET /memberships` → `POST /sessions` |
| **Clients** | `GET /users/` → `POST /users/` `PUT /users/{id}` `DELETE /users/{id}` |
| **Trainers** | `GET /users/` `GET /trainer_availability/` → `POST /users/` `PUT /users/{id}` `DELETE /users/{id}` `POST /trainer_availability/` `DELETE /trainer_availability/{id}` |
| **TrainerApp** | `GET /sessions` `GET /trainer_availability/` `GET /users/` → `POST /attendance` `PUT /sessions/{id}` `POST /trainer_availability/` |
| **ClientApp** | `GET /sessions` `GET /memberships/me` `GET /membership_plans/` `GET /users/trainers/` |
| **Chatbot** | `POST /chat` (with Bearer token) |
| **ProfileMenu** | none (reads localStorage only) |

---

### Custom Browser Events

| Event name | Emitted by | Consumed by | Purpose |
|---|---|---|---|
| `pf:booking_confirmed` | `Chatbot.js` (via `bookingEvent.js`) | `Dashboard`, `Schedule`, `TrainerApp`, `ClientApp` | Trigger data refresh after AI books a session |
| `pf:open_chat` | `ClientApp.js` (via `chatEvent.js`) | `Chatbot.js` | Open chatbot panel pre-filled with a message |

---

### localStorage Keys

| Key | Value | Set by | Read by |
|---|---|---|---|
| `pf_token` | JWT string | `auth.js: setToken()` | `api.js` (every request), `auth.js` |
| `pf_name` | First name string | `auth.js: setUserName()` | `ProfileMenu`, `TrainerApp`, `ClientApp` |

JWT decoded client-side with `jwt-decode` to extract `role`, `user_id`, and `exp`.

---

## 5. Design Tokens & Color Scheme

```css
/* src/App.css :root */

/* Backgrounds */
--color-bg-primary:    #1a1a1a;           /* app background */
--color-bg-secondary:  #2d2d2d;           /* sidebar/secondary surfaces */
--color-bg-card:       rgba(255,255,255,0.03);  /* card backgrounds */
--color-bg-hover:      rgba(255,255,255,0.05);  /* hover states */

/* Brand accent — warm gold */
--color-accent:        #d4af87;
--color-accent-dark:   #b8956e;

/* Text */
--color-text-primary:   #f5f2eb;          /* headings, primary content */
--color-text-secondary: #888888;          /* metadata, labels */
--color-text-muted:     #666666;          /* placeholders, hints */

/* Status */
--color-success:       #4ade80;           /* green — Available, success states */
--color-danger:        #ff6464;           /* red — errors, remove actions */

/* Typography */
--font-display:  'Playfair Display', serif;   /* headings, hero text */
--font-body:     'DM Sans', sans-serif;        /* all body text */
--font-mono:     'Space Mono', monospace;      /* code, IDs */

/* Border radii */
--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  16px;
--radius-xl:  20px;

/* Shadows */
--shadow-sm:     0 2px 8px rgba(0,0,0,0.2);
--shadow-md:     0 4px 20px rgba(0,0,0,0.3);
--shadow-lg:     0 8px 32px rgba(0,0,0,0.4);
--shadow-accent: 0 4px 20px rgba(212,175,135,0.3);
```

**Design philosophy:** Dark luxury aesthetic. Black/near-black backgrounds with warm gold (`#d4af87`) as the sole accent. Glassmorphism cards (`rgba(255,255,255,0.03)` background + thin borders). Serif display font for titles, sans-serif for UI.

---

## 6. AI Chatbot (FitAssist)

### Model
`claude-haiku-4-5-20251001` via LangChain `init_chat_model` · max_tokens: 1000  
Anthropic API key from `.env` (`ANTHROPIC_API_KEY`)

### Persistence
`InMemorySaver` (LangGraph) keyed by `thread_id = str(user_id or "guest")`.  
> ⚠️ All unauthenticated visitors share a single `"guest"` thread — conversation history bleeds between users.

### Tool Sets by Role

| Role | Tools available |
|---|---|
| **Guest** (no token) | `membership_plan_search`, `trainer_search`, `trainer_availability`, `signup_redirect` |
| **Client** | + `client_membership`, `client_sessions`, `create_booking`, `cancel_booking` |
| **Admin** | + `get_all_users` (everything clients have) |
| **Trainer** | `client_sessions`, `trainer_availability` only |

### Tool Reference

| Tool | Function | Auth |
|---|---|---|
| `membership_plan_search` | `SELECT * FROM membership_plans` | Public |
| `trainer_search` | `SELECT first_name, last_name FROM users WHERE role='trainer'` | Public |
| `trainer_availability` | Availability for a named trainer (TIME_FORMAT 12h) | Public |
| `signup_redirect` | Returns link to `http://localhost:8501/signup` | Public |
| `get_all_users` | `SELECT * FROM users` | Admin only |
| `client_membership` | Membership + plan info for current user | Client+ |
| `client_sessions` | Scheduled sessions for current user | Client+ |
| `create_booking` | Full booking flow (availability check → conflict check → membership check → INSERT sessions) | Client+ |
| `cancel_booking` | UPDATE sessions status='cancelled' + restore sessions_remaining | Client+ |

### Booking Confirmation Detection
The backend inspects raw `ToolMessage` objects in the agent result messages list:
- `booking_confirmed = True` if any message has `name == 'create_booking'` AND `'Booked' in content`
- `booking_cancelled = True` if any message has `name == 'cancel_booking'` AND `'cancelled' in content` (case-insensitive)

The frontend (`Chatbot.js`) fires the `pf:booking_confirmed` custom event when either flag is `true`, triggering a data refresh across all open portals.

---

## 7. Auth & Session Management

### Flow
1. User logs in → `POST /api/login` returns JWT (1-hour TTL)
2. Frontend stores JWT in `localStorage.pf_token`, first name in `localStorage.pf_name`
3. `api.js` Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. 401 response → interceptor calls `clearToken()` and redirects to `/` (landing)
5. On app reload, `isTokenValid()` checks `exp` — if expired, stays on landing

### JWT Payload
```json
{ "user_id": 1, "role": "client|admin|trainer", "exp": 1234567890 }
```

### Helper Functions (`auth.js`)
| Function | Description |
|---|---|
| `setToken(token)` | Saves to `pf_token` |
| `getToken()` | Reads `pf_token` |
| `clearToken()` | Removes both `pf_token` and `pf_name` |
| `isTokenValid()` | Decodes token, checks `exp > Date.now()/1000` |
| `getRole()` | Decodes token, returns `role` string |
| `getUserId()` | Decodes token, returns `user_id` int |
| `setUserName(name)` | Saves to `pf_name` |
| `getUserName()` | Reads `pf_name`, defaults to `''` |

---

## 8. Known Bugs & Incomplete Features

### Critical Bugs

| # | Location | Description |
|---|---|---|
| B1 | `trainer_availability.py` | `DELETE /api/trainer_availability/{id}` **does not exist**. The frontend (`Trainers.js`) calls `deleteTrainerAvailability(id)` which will always return 404. Endpoint needs to be added. |
| B2 | `routes/users.py` — `POST /api/users/` | The endpoint does not accept or store a `password` field. Trainers created via the admin panel (+ Add Trainer) will have no `password_hash` and cannot log in. The `createUser` call in `Trainers.js` sends a `password` field, but the backend ignores it. |
| B3 | `GET /api/trainer_availability/` response | Does not return the slot `id` column. The frontend's `deleteTrainerAvailability(id)` requires this id — slots loaded from the server cannot be deleted because the id is missing in the response payload. |
| B4 | `GET /api/attendance` | Returns only the first row embedded in a message string (`f"Here are the attedance: {response[0]}"`) instead of a proper array. All other GET endpoints return `{ message, Data: [...] }`. |
| B5 | Chatbot guest thread | All unauthenticated visitors share `thread_id = "guest"` in the `InMemorySaver`. One visitor's conversation history is visible to the next guest user. |
| B6 | `GET /api/sessions` | Returns ALL sessions with no server-side filtering by user. Clients and trainers can technically see every session by calling the API directly, even though the UI filters client-side. |

### Schema Inconsistencies

| # | Description |
|---|---|
| S1 | `Schema.sql` does not include the `password_hash` column in the `users` table definition, but `auth.py` inserts into and selects from it. Schema must have been altered manually after initial creation. |
| S2 | `Schema.sql` status should be considered potentially out of date — use it as a reference only, not as ground truth. |

### Incomplete Features

| # | Feature | Status |
|---|---|---|
| F1 | **Trainer password on creation** | UI has a "Temporary Password" field but backend `/api/users/` POST does not handle it. Needs backend route update to hash and store the password. |
| F2 | **Change Password UI** | Backend endpoint `POST /api/change-password` exists and works, but there is no frontend UI to trigger it. |
| F3 | **Session filtering server-side** | `GET /api/sessions` returns all sessions. Should ideally filter by `client_id` or `trainer_id` based on the caller's role. |
| F4 | **Membership expiry automation** | `memberships.status` is never automatically set to `'expired'` — it stays `'active'` past the `end_date` indefinitely. Needs a cron job or on-read check. |
| F5 | **Admin membership plan management** | Backend `POST /api/membership_plans/` exists but there is no UI to create, edit, or delete plans from the admin panel. Plans must be managed directly in the database. |
| F6 | **Legacy Streamlit UI** | `chatbot/streamlit.py` and `chatbot/pages/signup.py` are left over from a previous iteration. The signup redirect in `tools.py` still points to `http://localhost:8501/signup` (Streamlit port). Should be updated to point to the React app. |
| F7 | **CORS origin** | `main.py` only whitelists `http://localhost:3001`. Any deployment to a real domain requires updating `allow_origins`. |
| F8 | **Schedule component tab (admin)** | The `Schedule.js` weekly calendar does not show trainer names on session blocks — only the session time. |

---

*Generated from codebase audit — May 2026*

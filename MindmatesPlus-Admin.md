# MindMates+ Admin Dashboard — Codebase Documentation

> **Purpose:** A comprehensive reference describing every file, component, page, and service in the admin dashboard codebase. Use this document to onboard new developers, plan features, or audit the system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Entry Points](#4-entry-points)
5. [Infrastructure & Configuration](#5-infrastructure--configuration)
6. [Authentication System](#6-authentication-system)
7. [Layout & Navigation Shell](#7-layout--navigation-shell)
8. [Shared Components](#8-shared-components)
9. [Pages (Routes)](#9-pages-routes)
10. [Services Layer](#10-services-layer)
11. [Firestore Data Model](#11-firestore-data-model)
12. [Data Flow Summary](#12-data-flow-summary)

---

## 1. Project Overview

**MindMates+ Admin Dashboard** is a React Single-Page Application (SPA) built for platform administrators of the MindMates+ mental health app. It provides real-time monitoring, moderation, analytics, and management tools over:

- Users and their mental health risk levels
- Peer support groups
- AI-flagged chat messages
- User journal entries and mood trends
- Advisor communication
- Platform feedback
- AI model performance
- System-wide configuration

All backend data is stored in **Firebase Firestore** and authenticated through **Firebase Auth**. Group images are uploaded to **ImageKit** via a server-side auth endpoint.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (with `StrictMode`) |
| Language | TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Icon Library | Lucide React |
| Charts | Recharts (Area, Bar, Pie) |
| Class Utilities | `clsx` + `tailwind-merge` (via `cn()`) |
| Backend / Database | Firebase Firestore (real-time listeners) |
| Authentication | Firebase Auth (email/password) |
| File Storage | ImageKit (via REST API) |
| Build Tool | Vite |

---

## 3. Project Structure

```
src/
├── main.tsx                    # React DOM bootstrap
├── App.tsx                     # Root router + layout wrapper
├── index.css                   # Global CSS / Tailwind directives
├── declarations.d.ts           # Module declarations for non-TS assets
│
├── assets/                     # Static images (logo, sample group images)
│
├── context/
│   └── AuthContext.tsx         # Global auth state (currentUser, signOut)
│
├── lib/
│   ├── firebase.ts             # Firebase app init + service exports
│   └── utils.ts                # cn() class-name utility
│
├── components/
│   ├── Navbar.tsx              # Top header bar (search, bell, user menu)
│   ├── Sidebar.tsx             # Fixed left navigation with route links
│   ├── ProtectedRoute.tsx      # Auth guard — redirects to /login if unauth
│   ├── DashboardCard.tsx       # KPI metric card (icon, value, trend badge)
│   ├── AlertPanel.tsx          # Scrollable list of distress/safety alerts
│   ├── ChartWidget.tsx         # Recharts wrapper (Area / Bar / Pie)
│   └── DataTable.tsx           # Generic sortable table component
│
├── pages/
│   ├── auth/
│   │   ├── SignIn.tsx          # Email/password login form
│   │   ├── SignUp.tsx          # Admin account registration form
│   │   └── ResetPassword.tsx   # Password reset email trigger
│   │
│   ├── Dashboard.tsx           # Main overview — KPIs, charts, alert panel
│   ├── UserManagement.tsx      # User list with risk level, filters, delete modal
│   ├── PeerGroups.tsx          # Group list, create/delete modals, image upload
│   ├── ChatMonitoring.tsx      # AI-flagged messages table + moderation controls
│   ├── JournalInsights.tsx     # Journal analytics — mood trends, activity chart
│   ├── AIInsights.tsx          # AI model performance, recommendations, training status
│   ├── Reports.tsx             # Engagement chart + downloadable report list
│   ├── Feedback.tsx            # User feedback ratings + review table
│   ├── AdvisorChat.tsx         # Real-time chat between admin and advisors
│   └── Settings.tsx            # System configuration (security, notifications)
│
└── services/
    ├── chatService.ts          # Firestore read/write helpers for advisor chat
    ├── feedbackService.ts      # Firestore listener for user feedback documents
    ├── journalService.ts       # Firestore listener for journal_entries subcollection
    └── imageUploadService.ts   # ImageKit upload flow (auth + multipart POST)
```

---

## 4. Entry Points

### `src/main.tsx`
The very first file executed by the browser. Uses React 18's `createRoot` API to mount the `<App />` component into the `#root` DOM element. Wraps everything in `<StrictMode>` to surface potential issues during development.

```
index.html → #root → <StrictMode> → <App />
```

### `src/App.tsx`
The root application component. Responsible for:

1. **Wrapping the entire app in `<AuthProvider>`** — makes auth state globally accessible via `useAuth()`.
2. **Setting up React Router** with two distinct route groups:
   - **Public routes** (`/login`, `/register`, `/reset-password`) — accessible without authentication.
   - **Protected routes** (`/*`) — wrapped in `<ProtectedRoute>`, which redirects unauthenticated visitors to `/login`. All protected routes share the `DashboardLayout` shell.
3. **`DashboardLayout`** — an inner layout component that composes `<Sidebar>` + `<Navbar>` + a `<main>` scrollable content area. All dashboard pages are rendered as `children` inside this layout.

---

## 5. Infrastructure & Configuration

### `src/lib/firebase.ts`
Initialises the Firebase SDK once and exports four service singletons consumed throughout the app:

| Export | Type | Used For |
|---|---|---|
| `app` | `FirebaseApp` | Base app instance (default export) |
| `analytics` | `Analytics` | Firebase Analytics |
| `db` | `Firestore` | All database read/write operations |
| `auth` | `Auth` | Sign-in, sign-up, sign-out, and auth state |
| `storage` | `Storage` | Firebase Storage (imported but not yet actively used) |

All Firebase configuration values are read from **Vite environment variables** (`import.meta.env.VITE_FIREBASE_*`) so secrets are never hard-coded.

### `src/lib/utils.ts`
Exports a single utility function `cn(...inputs)`:
- Combines class strings using `clsx` (handles conditionals, arrays, objects).
- Passes the result through `tailwind-merge` so conflicting Tailwind classes are resolved correctly (e.g., `p-4` and `p-6` → `p-6` wins).
- Used in almost every component for dynamic, conflict-free class names.

### `src/declarations.d.ts`
A TypeScript module declaration file that tells the TypeScript compiler how to handle non-code imports (e.g., `.png`, `.jpg` image files used with `import logo from '...'`).

---

## 6. Authentication System

### `src/context/AuthContext.tsx`
A React Context provider that manages the global auth session.

**What it does:**
- Subscribes to Firebase's `onAuthStateChanged` listener on mount. This gives real-time auth state — if a session token expires or the user signs out in another tab, the context updates automatically.
- Exposes `currentUser` (a Firebase `User` object or `null`), `loading` (boolean), and a `signOut()` function.
- Renders `null` (blocks children) while `loading` is `true` to prevent a flash of unauthenticated content.

**How it's consumed:** Any component calls `useAuth()` to get the current user or trigger sign-out. `useAuth()` throws if called outside `<AuthProvider>`.

---

### `src/components/ProtectedRoute.tsx`
A thin route guard component:
- Reads `currentUser` from `AuthContext`.
- If a user is authenticated → renders `children`.
- If not → navigates to `/login` with `replace` (so the login page doesn't appear in browser history).

---

### `src/pages/auth/SignIn.tsx`
The admin login page (`/login`).

**Behaviour:**
- Form with email + password fields (password show/hide toggle).
- On submit: calls `signInWithEmailAndPassword(auth, email, password)`.
- On success: navigates to `/` (Dashboard).
- On failure: maps Firebase error codes to user-friendly messages (invalid credentials, too many requests, disabled account).
- Shows an inline spinner while the request is in flight.

---

### `src/pages/auth/SignUp.tsx`
The admin registration page (`/register`).

**Behaviour:**
- Form with name, email, password, and confirm-password fields.
- Client-side validation: passwords must match and be ≥ 6 characters.
- On submit:
  1. Creates a Firebase Auth user with `createUserWithEmailAndPassword`.
  2. Updates the Firebase Auth profile `displayName` with the provided name.
  3. Writes an `admins/{uid}` document to Firestore with `{ uid, name, email, role: 'admin', createdAt }`.
  4. Navigates to `/` on success.
- Error handling mirrors `SignIn.tsx`.

---

### `src/pages/auth/ResetPassword.tsx`
The password reset page (`/reset-password`).

**Behaviour:**
- Single email input field.
- On submit: calls `sendPasswordResetEmail(auth, email)`.
- On success: switches to a success state showing "Check your inbox" with the email address.
- Firebase sends the reset link; no server-side code needed.
- Links back to `/login`.

---

## 7. Layout & Navigation Shell

### `src/components/Sidebar.tsx`
The fixed left navigation bar (240px wide, full viewport height, `bg-slate-900`).

**Key parts:**
- **Logo area** — renders the MindMates+ logo from `src/assets/logo.png`.
- **Navigation list** — driven by the `navItems` data array (name, route path, Lucide icon). Uses `<NavLink>` from React Router so the active route gets indigo highlight styling automatically.
- **Admin identity footer** — reads `currentUser.displayName` (or email) from `AuthContext`. Generates initials via `getInitials()` and shows them in a gradient avatar. Displays admin name and email.

The sidebar is `sticky top-0 h-screen` so it stays visible while the main content scrolls.

---

### `src/components/Navbar.tsx`
The top horizontal header bar (64px tall, full width, `bg-white`).

**Key parts:**
- **Search input** — decorative UI; no active search logic wired yet.
- **Bell icon** — notification button with a red dot indicator badge (static; not wired to real data).
- **User dropdown** — shows `currentUser.displayName` and "System Administrator" label. Clicking opens a dropdown with a single **Sign Out** option that calls `signOut()` from `AuthContext`.
- **Click-outside close** — a `useEffect` adds a `mousedown` listener to close the dropdown when clicking elsewhere; cleaned up on unmount.

---

## 8. Shared Components

### `src/components/DashboardCard.tsx`
A reusable metric card used on the Dashboard page.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Label shown below the value |
| `value` | `string \| number` | The big number or text shown |
| `icon` | `LucideIcon` | Icon rendered in the coloured square |
| `trend` | `{ value: number, isUp: boolean }` | Optional percentage badge (green = up, red = down) |
| `color` | `'indigo' \| 'purple' \| 'emerald' \| 'rose' \| 'amber'` | Theme colour for the icon container |

**How it works:** Uses a `colorMap` lookup to apply Tailwind background/text colours matching the `color` prop. The trend badge prepends `+` or `-` and uses emerald/rose colours.

---

### `src/components/AlertPanel.tsx`
A scrollable panel listing safety alerts — journal distress signals and severe mental health profiles.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `alerts` | `Alert[]` | Array of alert objects `{ id, type, message, time, user }` |
| `onDismiss` | `(id: string) => void` | Optional dismiss handler shown on hover |

**Alert types:** `'critical'` (rose), `'warning'` (amber), `'info'` (blue). Each renders a corresponding Lucide icon (`AlertCircle`, `AlertTriangle`, `Info`). The panel has a maximum height of 400px with internal scroll. A footer "View All Alerts" button is present but not yet wired.

---

### `src/components/ChartWidget.tsx`
A reusable Recharts wrapper that renders one of three chart types in a white card.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Card heading |
| `subtitle` | `string` (optional) | Sub-label under the heading |
| `type` | `'area' \| 'bar' \| 'pie'` | Which Recharts chart to render |
| `data` | `ChartDataPoint[]` | Array of `{ name?, value, color?, ...extras }` |
| `height` | `number` | Chart canvas height in px (default: 300) |

**Chart details:**
- **Area** — Indigo gradient fill, monotone curve, `name` on X-axis.
- **Bar** — Indigo bars with rounded top corners, `name` on X-axis.
- **Pie** — Donut chart (innerRadius 60, outerRadius 80), each slice coloured by `entry.color` or falls back to indigo.
- All charts use `ResponsiveContainer` (fills parent width) and share a common styled Tooltip.
- An empty-data guard shows a dashed placeholder instead of a broken chart.

---

### `src/components/DataTable.tsx`
A generic, fully-typed reusable table component.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `columns` | `Column<T>[]` | Column definitions with `header`, `accessor`, optional `className` |
| `data` | `T[]` | Array of row data objects |
| `onRowClick` | `(item: T) => void` (optional) | Makes rows clickable (adds `cursor-pointer`) |

**Column accessor** can be either:
- A key of `T` (`'name' as keyof User`) — renders the raw field value.
- A render function `(item: T) => React.ReactNode` — renders custom JSX (badges, buttons, etc.).

Shows a "No data available" empty state when `data` is empty.

---

## 9. Pages (Routes)

### Dashboard — `src/pages/Dashboard.tsx` → `/`

The main overview page. Entirely data-driven from Firestore via real-time `onSnapshot` listeners.

**Data listeners (5 total):**

| Listener | Firestore Path | Drives |
|---|---|---|
| Admin name | `admins/{uid}` | Welcome message |
| Users | `users` (collection) | Total Users KPI, growth chart, name map |
| Peer groups | `peer_groups` (collection) | Active Peer Groups KPI count |
| Messages today | `collectionGroup('messages')` where `createdAt >= today` | Messages Today KPI |
| Journal entries | `collectionGroup('journal_entries')` | Distress alerts, emotional distribution pie |
| Mental health profiles | `collectionGroup('mentalHealthProfile')` | Distress alert count, alert panel |

**Computed data (via `useMemo`):**

- **`userGrowthData`** — Builds 6-month cumulative registration buckets. Users outside the 6-month window seed the cumulative base.
- **`userTrend`** — Compares this-month vs last-month registrations to produce a `±%` trend badge.
- **`emotionalData`** — Counts journal `mood_tag` values into four buckets (Stable, Anxious, Distressed, Positive), expressed as percentages. Falls back to hardcoded placeholder data when no entries exist.
- **`distressAlertCount`** — Counts unique user IDs that either: (a) have a distress-keyword mood in the last 7 days, or (b) have a severe/moderate mental health profile.
- **`recentAlerts`** — Merges journal distress entries and severe mental health profiles into a unified alert list, sorted by recency, limited to 5.

**UI Sections:**
1. KPI row: Total Users · Active Peer Groups · Messages Today · Distress Alerts
2. User Growth (area chart, 6 months)
3. Emotional Distribution (pie chart) + Key Insights text panel
4. Alert Panel (distress signals from last 7 days)
5. "Next Review Session" reminder card (static UI placeholder)

---

### User Management — `src/pages/UserManagement.tsx` → `/users`

Displays all platform users with real-time data from Firestore, search/filter controls, and a delete confirmation modal.

**Data listeners (2):**
1. `users` collection → maps each doc to a `RawUser` with normalized fields.
2. `collectionGroup('mentalHealthProfile')` → builds `mentalHealthMap: Record<uid, category>`.

**Risk level normalization (`normalizeRiskLevel`):**
- First checks the user's mental health profile category (extremely severe → Critical, severe → High, moderate → Medium).
- Falls back to the user's own `riskLevel` / `risk_level` field.
- Defaults to `'Low'` if neither is available.

**Status normalization (`normalizeStatus`):** Maps raw string values to `'Active' | 'Suspended' | 'Inactive'`.

**Filtering:** Search (name/email/ID) + Risk Level dropdown applied client-side with `.filter()`.

**Table columns:** User ID · Name+Email · Risk Level badge · Peer Group · Status indicator · Last Active · Actions (View, Suspend, Delete, More).

**Delete Modal:** A full-screen overlay with blurred backdrop. Shows user name, email, and ID. Two buttons: "Keep User" (cancel) and "Remove Permanently" (calls `handleConfirmDelete` — currently logs to console, backend not yet implemented).

---

### Peer Groups — `src/pages/PeerGroups.tsx` → `/groups`

Manages peer support groups — displaying both Firestore-created groups and a static dummy dataset.

**Data listener:** `peer_groups` ordered by `created_at asc` → `firestoreGroups` state.

**Create Group flow (`handleCreateGroup`):**
1. Validates that name and category are provided.
2. Counts existing groups to generate the next sequential ID (`PG-001`, `PG-002`, …).
3. If an image is selected: calls `uploadImageToImageKit()` to get a CDN URL.
4. Calls `addDoc(collection(db, 'peer_groups'), { ... })` to persist the group.
5. Shows a success banner for 5 seconds.

**Delete Group flow (`handleConfirmDelete`):**
- Calls `deleteDoc(doc(db, 'peer_groups', groupToDelete.docId))`.
- Shows a loading state on the button ("Deleting...") while the request is pending.
- Shows a success banner for 5 seconds on completion.

**UI Sections:**
1. Page header with "Create New Group" button.
2. 3-card summary strip: Most Active, Fastest Growing (newest Firestore group), Needs Attention.
3. **Firestore-created groups list** — shows thumbnail image (or placeholder icon), name, ID, description, category badge, delete button.
4. **Static dummy groups DataTable** — sample data for Anxiety Support, Depression Support, etc.
5. **Delete Confirmation Modal** — with group name, ID, and description preview.
6. **Create Group Modal** — fields: Group Name (required), Category dropdown (required), Description (optional), Image upload with preview (optional). Accepts PNG/JPG/WEBP ≤ 5MB.

**Predefined categories:**
`Moderate Support`, `Mild Support`, `Wellness - Thriving`, `Wellness - Stress Aware`, `Wellness - Emotionally Aware`, `Recovery & Improvement`

---

### Chat Monitoring — `src/pages/ChatMonitoring.tsx` → `/chat`

A moderation dashboard for reviewing AI-flagged messages from peer group chats.

> **Note:** This page currently uses static dummy data. No Firestore listener is wired.

**UI Sections:**
1. Page header with shield icon.
2. Two-panel stats row:
   - **Moderation Stats card** — Flagged Today (24), Auto-Resolved (18), Pending Review (6). Static values.
   - **AI Sensitivity Settings card** — Three range sliders for Self-Harm Detection (90%), Harassment Detection (75%), Spam Detection (40%). UI only; not wired to any backend setting.
3. **Flagged Messages DataTable** — columns: User · Group · Message Content (truncated italic) · Reason · Severity badge (High/Medium/Low) · Time · Actions (Resolve ✓ / Flag User).

**Severity badge colours:** High = rose, Medium = amber, Low = blue.

---

### Journal Insights — `src/pages/JournalInsights.tsx` → `/journals`

Analytics page for platform-wide journaling activity and emotional trends.

**Data source:** `journalService.listenToJournals()` — real-time Firestore listener on `collectionGroup('journal_entries')`.

**Computed analytics:**

| Metric | How calculated |
|---|---|
| Total Entries | `entries.length` |
| Entries Today | entries where `date >= todayStart` |
| Unique Moods | distinct `moodTag` values |
| Weekly Activity | entries per day-of-week for last 7 days |
| Top Moods | sorted `moodTag` frequency, top 5 |

**UI Sections:**
1. 3 stat cards: Total Entries · Entries Today · Unique Moods.
2. Bar chart (journaling activity, last 7 days) + Top Moods ranked list.
3. **AI Semantic Analysis panel** — shows a dynamic summary of entry count and top mood; placeholder note that ML pipeline results will appear here.
4. **Recent Entries DataTable** — columns: Title · Content (truncated) · Mood badge (colour-coded) · Date (relative time).

**Mood colour map:** happy=emerald, sad=blue, angry=rose, anxious=amber, neutral=slate, excited=violet.

---

### AI Insights — `src/pages/AIInsights.tsx` → `/ai-insights`

Monitoring dashboard for the platform's AI and ML model health.

> **Note:** All data on this page is static/hardcoded. No Firestore listener.

**UI Sections:**
1. **Model Accuracy Bar Chart** — 4 bars: Sentiment (98%), Risk Detection (94%), Topic Extraction (88%), Response Gen (92%).
2. **System Latency KPI** — 142ms (−12% from avg). Static.
3. **Safety Filters KPI** — 100% uptime. Static.
4. **AI Recommendations panel** — 2 data-driven recommendation cards:
   - New Support Group Opportunity (Eco-Anxiety cluster detected).
   - Prompt Optimization (weekend journaling drop suggestion).
5. **Model Training Status panel** (dark `bg-slate-900` card):
   - Sentiment Model v2.4 — Training 85% (progress bar).
   - Risk Detection v3.1 — Deployed (100% progress bar, emerald).
   - "Manage Models" button (placeholder, no action yet).
   - Progress bars have ARIA attributes (`role`, `aria-valuenow`, etc.) for accessibility.

---

### Reports & Analytics — `src/pages/Reports.tsx` → `/reports`

Report generation and download interface.

> **Note:** Chart data and report list are static/hardcoded. No backend download logic.

**UI Sections:**
1. Header with date range selector ("Last 30 Days") and "Export All" button.
2. **User Engagement Area Chart** — 4 weeks of WAU data (4500 → 5200 → 4800 → 6100).
3. **Available Reports list** — 5 sample reports with name, date, size, and a download icon button.
4. **Custom Report Generator form** — 3 dropdowns (Metric Type, Date Range, Format) + "Generate Report" button. UI only; no generation logic implemented.

---

### User Feedback — `src/pages/Feedback.tsx` → `/feedback`

Displays and analyses user-submitted feedback from the app.

**Data source:** `feedbackService.listenToFeedback()` — real-time Firestore listener on `collectionGroup('feedback')`.

**Computed metrics:**

| Metric | Logic |
|---|---|
| Average Rating | `sum(ratings) / count` |
| Positive % | `rating >= 4` as % of total |
| Negative % | `rating <= 2` as % of total |
| New Today | `date >= todayStart` |

**UI Sections:**
1. 3 stat cards: Overall Satisfaction (star rating average) · Positive/Negative % split · New Feedback Today (indigo CTA card).
2. **Feedback DataTable** — columns: App Feedback (comment) · Peer Feedback (comment) · Rating (5-star visual) · Date (relative time).

---

### Advisor Chat — `src/pages/AdvisorChat.tsx` → `/advisor-chat`

A real-time private messaging interface between the admin and individual advisors.

**Data sources:**
1. `advisors` collection — real-time listener. Falls back to 4 hardcoded dummy advisors if the collection is empty.
2. `chatService.listenToAdminChats(adminId)` — listens to all `privateChats` where the admin is a participant.
3. `chatService.listenToMessages(chatId)` — listens to messages in the selected advisor's chat thread.

**Chat ID format:** `{adminUid}_{advisorId}` — deterministic, so the same chat is always found.

**Key interactions:**
- **Selecting an advisor** — calls `chatService.getOrCreateChat()` which creates the `privateChats/{chatId}` document if it doesn't exist, then starts listening to its messages.
- **Sending a message** — calls `chatService.sendMessage()` which adds to `privateChats/{chatId}/messages` and updates the parent chat's `lastMessage` field.
- **Auto-scroll** — `messagesEndRef` div + `scrollIntoView` called whenever `messages` state changes.

**UI Layout (split-pane):**
- **Left panel (320px)** — advisor list with search, online/offline status dot, last message preview.
- **Right panel (flex-1)** — chat header (name, status, Phone/Video/More buttons) + message area + input form.
- Messages sent by the admin appear right-aligned in indigo; received messages appear left-aligned in white.
- Empty state shows an invitation to "Connect with Advisors" when no advisor is selected.

---

### System Settings — `src/pages/Settings.tsx` → `/settings`

Global platform configuration UI.

> **Note:** All form inputs are static (`defaultValue`). No save/submit logic is implemented yet. The save button and toggles are UI-only.

**Sections:**

#### General Configuration
- Platform Name input (default: "MindMates+")
- Support Email input (default: "support@mindmates.plus")
- Maintenance Mode toggle (static; visually off)

#### Security & Privacy
- Two-Factor Authentication toggle (visually on / indigo)
- Data Encryption status badge ("Enabled" — AES-256 for journal entries)
- "Reset All Admin Passwords" danger action button

#### Notifications
- Three checkboxes:
  - Email alerts for critical distress signals (checked by default)
  - Weekly system performance summary (checked by default)
  - New user registration notifications (unchecked by default)

**Action buttons:** "Discard Changes" + "Save Configuration" — no handlers attached yet.

---

## 10. Services Layer

All services in `src/services/` are plain TypeScript modules (not React components). They abstract Firestore and external API calls from UI components.

---

### `src/services/chatService.ts`

Handles all Firestore operations for the admin↔advisor private chat system.

**Exports:** `ChatMessage` interface, `PrivateChat` interface, `chatService` object.

| Method | Description |
|---|---|
| `getChatId(adminId, advisorId)` | Returns the deterministic chat document ID `{adminId}_{advisorId}` |
| `getOrCreateChat(adminId, advisorId)` | Fetches the chat doc; if it doesn't exist, creates it with participant metadata and `serverTimestamp` fields |
| `sendMessage(chatId, senderId, senderRole, receiverId, text)` | Adds a message to `privateChats/{chatId}/messages` subcollection and updates the parent chat's `lastMessage`, `lastMessageAt`, `updatedAt` |
| `listenToMessages(chatId, callback)` | Real-time `onSnapshot` on `privateChats/{chatId}/messages` ordered by `createdAt asc` |
| `listenToAdminChats(adminId, callback)` | Real-time `onSnapshot` on `privateChats` where admin is in `participants` array and `chatType == 'admin_advisor'`, ordered by `updatedAt desc` |

**`PrivateChat` fields:** `participants[]`, `participantRoles{}`, `chatType`, `lastMessage`, `lastMessageSenderId`, `lastMessageAt`, `createdAt`, `updatedAt`

**`ChatMessage` fields:** `senderId`, `senderRole`, `receiverId`, `messageText`, `messageType: 'text'`, `createdAt`, `isRead`

---

### `src/services/feedbackService.ts`

Real-time listener for user feedback submitted through the MindMates+ app.

| Method | Description |
|---|---|
| `listenToFeedback(callback)` | Subscribes to `collectionGroup('feedback')` — queries across all `users/{userId}/feedback` subcollections simultaneously. Returns an unsubscribe function. |

**Firestore field mapping:**

| Firestore field | Interface property | Notes |
|---|---|---|
| `app_comment` | `appComment` | Comments about the app |
| `peer_comment` | `peerComment` | Comments about peer interactions |
| `rating` | `rating` | Clamped 0–5 |
| `date` | `date` | Handles both `Timestamp` and raw `{ seconds }` objects |

Results are sorted newest-first before calling the callback.

---

### `src/services/journalService.ts`

Real-time listener for journal entries written by users.

| Method | Description |
|---|---|
| `listenToJournals(callback)` | Subscribes to `collectionGroup('journal_entries')` — crosses all `users/{userId}/journal_entries` subcollections. Returns an unsubscribe function. |

**Firestore field mapping:**

| Firestore field | Interface property |
|---|---|
| `title` | `title` |
| `content` | `content` |
| `mood_tag` | `moodTag` |
| `date` | `date` (converted from Timestamp) |
| `analysis` | `analysis` |
| `ml_analysis` | `mlAnalysis` |

Results sorted newest-first.

---

### `src/services/imageUploadService.ts`

Handles secure image uploads to ImageKit for peer group images.

**Function:** `uploadImageToImageKit(file: File, folder?: string): Promise<string>`

**Upload flow (two-step):**
1. **Auth token fetch** — Makes a GET request to `{VITE_API_BASE_URL}/imagekit-auth` (your backend endpoint) to get `{ token, expire, signature }`. This keeps the ImageKit private key server-side.
2. **Multipart upload** — POSTs to `https://upload.imagekit.io/api/v1/files/upload` with the file, a timestamped filename, public key, and the auth credentials from step 1.
3. Returns `data.url` — the publicly accessible CDN URL of the uploaded image.

**Environment variables required:**
- `VITE_IMAGEKIT_PUBLIC_KEY`
- `VITE_API_BASE_URL` (your backend server that issues ImageKit auth tokens)

---

## 11. Firestore Data Model

The following Firestore collections and subcollections are read or written by this admin dashboard:

```
firestore/
│
├── admins/
│   └── {uid}               # Written on SignUp
│       ├── uid: string
│       ├── name: string
│       ├── email: string
│       ├── role: 'admin'
│       └── createdAt: Timestamp
│
├── users/                  # Read-only (created by the mobile app)
│   └── {uid}
│       ├── nickname / displayName / name: string
│       ├── email: string
│       ├── riskLevel / risk_level: string
│       ├── peerGroup / peer_group: string
│       ├── status: string
│       ├── lastActive / last_active / updatedAt / createdAt: Timestamp
│       └── mentalHealthProfile/     # Subcollection
│           └── {docId}
│               ├── activeRecommendationCategory: string
│               └── initialQuestionnaireScore: {
│                       category: string,
│                       mainCondition: string,
│                       totalScore: number,
│                       completedAt: Timestamp
│                   }
│       └── journal_entries/         # Subcollection
│           └── {entryId}
│               ├── title: string
│               ├── content: string
│               ├── mood_tag: string
│               ├── date: Timestamp
│               ├── analysis: string
│               └── ml_analysis: string
│       └── feedback/                # Subcollection
│           └── {feedbackId}
│               ├── app_comment: string
│               ├── peer_comment: string
│               ├── rating: number (0–5)
│               └── date: Timestamp
│
├── peer_groups/             # Read + Write (created by admin dashboard)
│   └── {docId}
│       ├── group_id: string (e.g. 'PG-001')
│       ├── group_name: string
│       ├── group_category: string
│       ├── group_description: string
│       ├── group_image_url: string (ImageKit CDN URL)
│       ├── created_at: Timestamp
│       └── updated_at: Timestamp
│
├── advisors/               # Read-only
│   └── {advisorId}
│       ├── name: string
│       ├── email: string
│       ├── specialization: string
│       ├── status: 'online' | 'offline'
│       └── lastSeen: Timestamp
│
└── privateChats/           # Read + Write (advisor chat)
    └── {adminId}_{advisorId}
        ├── participants: string[]
        ├── participantRoles: { [uid]: 'admin' | 'advisor' }
        ├── chatType: 'admin_advisor'
        ├── lastMessage: string
        ├── lastMessageSenderId: string
        ├── lastMessageAt: Timestamp
        ├── createdAt: Timestamp
        ├── updatedAt: Timestamp
        └── messages/           # Subcollection
            └── {messageId}
                ├── senderId: string
                ├── senderRole: 'admin' | 'advisor'
                ├── receiverId: string
                ├── messageText: string
                ├── messageType: 'text'
                ├── createdAt: Timestamp
                └── isRead: boolean
```

> **`collectionGroup` queries used:**
> - `collectionGroup('messages')` — Dashboard (messages today count)
> - `collectionGroup('journal_entries')` — Dashboard, JournalInsights
> - `collectionGroup('mentalHealthProfile')` — Dashboard, UserManagement
> - `collectionGroup('feedback')` — Feedback page

---

## 12. Data Flow Summary

```
Firebase Auth
    │
    ▼
AuthContext (onAuthStateChanged)
    │
    ├──▶ ProtectedRoute (gates all dashboard routes)
    ├──▶ Sidebar (displays admin name/initials)
    └──▶ Navbar (displays admin name, sign-out)

Firestore (onSnapshot real-time listeners)
    │
    ├──▶ Dashboard.tsx
    │       users ──────────────────────▶ Total Users KPI, Growth Chart
    │       peer_groups ────────────────▶ Peer Groups KPI
    │       messages (collectionGroup) ─▶ Messages Today KPI
    │       journal_entries (cGroup) ───▶ Emotional Dist., Distress Alerts
    │       mentalHealthProfile (cGroup)▶ Distress Alert Count + Panel
    │
    ├──▶ UserManagement.tsx
    │       users ──────────────────────▶ User Table
    │       mentalHealthProfile (cGroup)▶ Risk Level overlay
    │
    ├──▶ PeerGroups.tsx
    │       peer_groups ────────────────▶ Created Groups List
    │       [write] addDoc / deleteDoc ─▶ Create / Delete Groups
    │
    ├──▶ JournalInsights.tsx
    │       journalService (cGroup) ────▶ Stats, Charts, Table
    │
    ├──▶ Feedback.tsx
    │       feedbackService (cGroup) ───▶ Ratings, Stats, Table
    │
    └──▶ AdvisorChat.tsx
            advisors ──────────────────▶ Advisor List
            privateChats ──────────────▶ Chat Threads
            privateChats/.../messages ─▶ Message Thread
            [write] sendMessage ────────▶ New Messages

ImageKit (external CDN)
    └──▶ PeerGroups.tsx
            imageUploadService ─────────▶ Group image CDN URLs
```

---

*Documentation generated from source analysis of the `Admin_improvements` branch. Last updated: 2026-05-23.*

# SpendTrack — Personal Offline Expense Tracker

SpendTrack is a private, offline-first personal expense tracking mobile application built with React Native and Expo. It allows you to log daily expenses in under 5 seconds, organize by categories and payment methods, set monthly budgets with alert thresholds, schedule recurring expenses, view spending insights and charts, and export or back up data locally without ever connecting to an external server.

---

## Key Features

- **Lightning-Fast Expense Logging:** Focused numeric entry with smart pre-selection of last used category, payment method, and note autocomplete.
- **100% Offline & Private:** Zero backend, zero tracking, no account required. All data stays strictly on your device in SQLite.
- **Accurate Money Math:** Monetary values are strictly stored and computed as integer **paise** (`₹1 = 100 paise`), preventing floating-point rounding errors.
- **Home Expense Feed:** Grouped by day with daily sums, friendly date labels, search, and category/payment-method filters.
- **Delete with Undo:** 5-second undo snackbar before any deletion is finalized.
- **Budget Management:** Set an overall monthly limit and per-category limits with visual status cues (normal, 80% warning, 100% exceeded) and local threshold alerts.
- **Customizable Salary Month Cycle:** Define your month starting day (1st to 31st) to align with salary cycles.
- **Recurring Expenses:** Automatically generates daily, weekly, monthly, and yearly recurring expenses upon app launch (idempotent with month-end clamp handling).
- **Daily Reminders:** Optional scheduled local notifications reminding you to log daily purchases.
- **Biometric / PIN Lock:** Optional app gate using device biometrics (Fingerprint / Face ID) or device credentials.
- **Export & Backup:**
  - Export expenses to standard CSV for Excel / Google Sheets.
  - Full JSON backup & restore with version validation and choice of **Merge** or **Replace**.
  - Emergency Wipe All Data option with double confirmation.

---

## Tech Stack

- **Framework:** React Native with Expo SDK 58 (Managed workflow)
- **Language:** TypeScript (`strict: true`)
- **Navigation:** Expo Router (File-based tabs and modal navigation)
- **Local Database:** `expo-sqlite` (Pragma foreign keys, WAL mode, migrations)
- **Preferences:** `@react-native-async-storage/async-storage` via Zustand `persist`
- **Charts:** `react-native-gifted-charts` + `react-native-svg`
- **Security & Notifications:** `expo-local-authentication`, `expo-notifications`
- **File System:** `expo-file-system`, `expo-sharing`, `expo-document-picker`

---

## Project Structure

```
spendtrack/
├── app/
│   ├── _layout.tsx              # Root layout, DB initialization, lock gate
│   ├── onboarding.tsx           # First-launch onboarding flow
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab navigation
│   │   ├── index.tsx            # Home expense list & filters
│   │   ├── stats.tsx            # Insights & charts
│   │   ├── budgets.tsx          # Monthly budgets & progress
│   │   └── settings.tsx         # User preferences & security
│   ├── add-expense.tsx          # Add / Edit expense modal
│   ├── categories/
│   │   ├── index.tsx            # Category list & archive
│   │   └── edit.tsx             # Category creation & editing
│   ├── recurring/
│   │   ├── index.tsx            # Recurring rules list
│   │   └── edit.tsx             # Recurring rule creation & editing
│   ├── export-import.tsx        # CSV export, JSON backup & restore
│   └── lock.tsx                 # Biometric / PIN unlock screen
├── components/
│   ├── AmountInput.tsx          # Hero amount input
│   ├── CategoryPicker.tsx       # Quick category selection chips
│   ├── DaySectionHeader.tsx     # Daily total & friendly date labels
│   ├── ExpenseItem.tsx          # Expense card with swipe / long-press duplicate
│   ├── MonthSwitcher.tsx        # Month cycle navigation
│   ├── BudgetProgress.tsx       # Visual budget progress bar
│   ├── EmptyState.tsx           # Empty list state
│   ├── Snackbar.tsx             # Undo deletion snackbar
│   └── charts/                  # Gifted charts (CategoryDonut, DailyBars, MonthlyTrend)
├── db/
│   ├── database.ts              # SQLite connection & WAL pragma
│   ├── seed.ts                  # Default categories seed
│   ├── migrations/              # Versioned schema migrations
│   └── repositories/            # Typed SQL queries (expense, category, budget, recurring)
├── hooks/                       # Custom hooks (useExpenses, useStats, useBudgets, etc.)
├── services/                    # Cross-cutting services (recurring, alerts, backup, lock)
├── store/                       # Zustand state stores (dataStore, settingsStore, authStore)
├── constants/                   # Theme, strings, and default categories
├── utils/                       # Money, date, validation, and CSV helpers
└── __tests__/                   # Unit and benchmark tests
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- Expo CLI (`npx expo`)

### Installation

```bash
# Clone the repository and navigate into the project directory
git clone <repository_url>
cd myexpenses

# Install dependencies
npm install
```

### Running the App

```bash
# Start the Expo development server
npm start

# Run on Android emulator / connected device
npm run android

# Run on iOS simulator (macOS required)
npm run ios
```

---

## Running Tests & Quality Checks

SpendTrack includes comprehensive unit tests covering money utilities, date ranges, idempotent recurring generation, budget thresholds, CSV generation, and backup restore round-trips:

```bash
# Run unit tests
npm test

# Run TypeScript type check
npm run typecheck

# Run ESLint
npm run lint
```

---

## Building an Installable Android APK

The project includes `eas.json` configured with an APK build profile for direct device installation:

```bash
# Install EAS CLI globally if not already installed
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build standalone Android APK
npm run build:apk
# or: eas build -p android --profile preview
```

The resulting `.apk` file can be downloaded and installed directly on your Android phone.

---

## Backup and Restore Guide

### Exporting Expenses to CSV
1. Open **Settings** > **Export & Backup**.
2. Tap **Export All Expenses (CSV)**.
3. Use the system share sheet to save the `.csv` file to Google Drive, send via email, or open in Excel.

### Creating a Full JSON Backup
1. Open **Settings** > **Export & Backup**.
2. Tap **Export Full Backup (JSON)**.
3. Save the resulting timestamped `.json` file. It contains all expenses, custom categories, budgets, recurring rules, and preferences.

### Restoring from Backup
1. Open **Settings** > **Export & Backup**.
2. Tap **Restore from JSON Backup** and select your `.json` file.
3. Choose your restore strategy:
   - **Merge**: Adds new records from the backup while keeping existing ones intact.
   - **Replace**: Completely restores the database to match the backup file.

---

## Design Decisions & Architectural Notes

1. **Integer Arithmetic for Currency:** To prevent floating-point inaccuracies (`0.1 + 0.2 != 0.3`), all expense and budget amounts are stored in SQLite as integer paise (`amount_paise INTEGER`). Conversions occur exclusively at the UI input and display boundaries.
2. **Offline-First Resilience:** Network calls are strictly avoided. No analytics, tracking SDKs, or cloud synchronization are bundled, ensuring complete financial privacy and instant performance.
3. **Reactive Data Refresh:** Changes to expenses, categories, or budgets update a lightweight global version counter, prompting active screens and stats to re-query without manual pull-to-refresh.
4. **Idempotent Recurring Generation:** Recurring expenses check both `last_generated_date` and an internal composite key (`recurring_id` + `date`), ensuring that re-opening the app or resuming from background never logs duplicate items.

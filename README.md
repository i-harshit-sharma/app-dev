# FinVault

FinVault is a full-stack personal finance application built as a working prototype with:

- A mobile app in Expo + React Native (TypeScript, Expo Router)
- A backend in Node.js + Express + MongoDB

This repository contains production-like flows for authentication, transaction tracking, AI-assisted insights, OCR-assisted data entry, voice input, and notification-based transaction drafting.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Core Features](#core-features)
5. [System Architecture](#system-architecture)
6. [Prerequisites](#prerequisites)
7. [Environment Variables](#environment-variables)
8. [Backend Setup](#backend-setup)
9. [Mobile App Setup](#mobile-app-setup)
10. [Android SDK Fix (Windows)](#android-sdk-fix-windows)
11. [Running the App](#running-the-app)
12. [API Endpoints](#api-endpoints)
13. [Data and Storage](#data-and-storage)
14. [Security Notes](#security-notes)
15. [Troubleshooting](#troubleshooting)
16. [Scripts](#scripts)
17. [Roadmap Suggestions](#roadmap-suggestions)
18. [Contributors](#contributors)

## Project Overview

FinVault helps users track spending and make better financial decisions with a hybrid model:

- Manual transaction management
- Automated transaction drafting from notifications
- OCR extraction from receipt images
- Voice-driven draft creation
- AI-generated insights from summarized financial context

The app is designed for practical testing and iterative improvement.

## Tech Stack

### Mobile App (myApp)

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router (file-based routing)
- Expo SQLite (local transaction storage)
- Expo Secure Store (sensitive local settings)
- ML Kit Text Recognition (receipt OCR)
- Gemini API integration for AI insights and parsing enhancement

### Backend (backend)

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- Nodemailer for OTP email delivery

## Repository Structure

```text
app-dev-main/
	README.md
	backend/
		config/
		controllers/
		middleware/
		models/
		routes/
		services/
		server.js
	myApp/
		app/
		assets/
		components/
		constants/
		context/
		hooks/
		services/
		android/
		app.json
```

## Core Features

### Authentication

- User registration and login
- OTP-based email verification
- JWT-protected profile endpoints
- Profile updates from app

### Transaction Management

- Add, edit, delete transactions
- Local persistence via SQLite
- Monthly grouping and summaries
- Category and payment-method tracking

### AI and Assistant Layer

- Context-based financial insights (Gemini)
- Strict-format JSON response handling
- Fallback strategy for unavailable AI responses

### OCR and Parsing

- On-device OCR extraction for receipts
- Optional AI enhancement for structured extraction
- Rule-based parser fallback

### Notification-Derived Drafts (Android)

- Native Android notification listener bridge
- Live capture of posted/removed notifications
- Parsing for debit/credit amount and merchant detection
- Pending transaction cards with confirm/ignore actions

### Personalization and UX

- Light/Dark theme support
- Multi-language context support
- Biometric gate option in app
- Data export/import helpers

## System Architecture

### High-Level Flow

1. Mobile app authenticates user against backend API.
2. Auth token is stored on-device and used for protected calls.
3. Transactions are primarily managed locally in SQLite (scoped by user ID).
4. AI services consume summarized financial context and return recommendations.
5. Android notification listener feeds transaction draft candidates into app state.

### Key Context Providers (Mobile)

- AuthProvider: session and user profile state
- TransactionProvider: transaction CRUD, summaries, financial plans
- NotificationProvider: notification ingestion and pending draft queue
- ThemeProvider: theme state and palette
- LanguageProvider: localization preferences

## Prerequisites

- Node.js 18+
- npm 9+
- Android Studio (for Android local builds)
- JDK 17 (already expected by current Gradle and React Native setup)
- MongoDB connection string (Atlas or local)
- Gmail app password (if using OTP email through Gmail SMTP)

## Environment Variables

Create environment files before running.

### Mobile app (myApp/.env)

```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
EXPO_PUBLIC_GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
EXPO_PUBLIC_GEMINI_MODEL=gemini-flash-lite-latest
EXPO_PUBLIC_GOOGLE_MAP_API=<YOUR_GOOGLE_MAPS_API_KEY>
```

Notes:

- If EXPO_PUBLIC_API_URL is missing, the app currently falls back to a deployed API URL in AuthService.
- Gemini key is required for AI insight and some parsing-enhancement paths.

### Backend (backend/.env)

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_SECRET=<VERY_STRONG_SECRET>

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASS=<gmail-app-password>
EMAIL_FROM=noreply@finvault.com

OTP_EXPIRY_MINUTES=10
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Expected output:

- MongoDB connected log
- Server listening on configured port (default 5000)

Health check:

```bash
GET http://localhost:5000/
```

Response should be:

```text
API running...
```

## Mobile App Setup

```bash
cd myApp
npm install
```

For Expo Go development:

```bash
npx expo start
```

For native Android dev build:

```bash
npx expo run:android
```

## Android SDK Fix (Windows)

If you see errors like:

- Failed to resolve the Android SDK path
- SDK location not found

Use these steps:

1. Install SDK components from Android Studio SDK Manager:
	 - Android SDK Platform
	 - Android SDK Build-Tools
	 - Android SDK Platform-Tools
	 - Android SDK Command-line Tools (latest)
2. Set user environment variables in PowerShell:

```powershell
$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkPath, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkPath, "User")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @("$SdkPath\platform-tools", "$SdkPath\emulator", "$SdkPath\cmdline-tools\latest\bin")
foreach ($p in $parts) {
	if ($userPath -notlike "*$p*") { $userPath = "$userPath;$p" }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")
```

3. Create local SDK mapping file:

```powershell
$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$Escaped = $SdkPath.Replace('\\','\\\\')
Set-Content -Path "myApp\android\local.properties" -Value "sdk.dir=$Escaped"
```

4. Restart terminal and run:

```powershell
cd myApp
npx expo run:android
```

## Running the App

Recommended local workflow:

1. Start backend first.
2. Ensure myApp/.env has EXPO_PUBLIC_API_URL pointing to backend.
3. Start app using Expo:
	 - Expo Go: npx expo start
	 - Android native build: npx expo run:android

## API Endpoints

Base path: /api

Auth routes:

- POST /auth/register
- POST /auth/verify-otp
- POST /auth/resend-otp
- POST /auth/login
- GET /auth/me (protected)
- PUT /auth/profile (protected)

User routes:

- POST /users
- GET /users

## Data and Storage

### On Device

- SQLite DB: transaction records (table: transactions)
- Secure Store: auth/session and sensitive preferences
- AsyncStorage: notifications cache, pending drafts, and non-sensitive UI state

### On Backend

- MongoDB: user auth/profile data and verification state

## Security Notes

- Password hashing: bcrypt
- API auth: JWT bearer tokens
- OTP verification with expiry
- On-device OCR reduces need to upload raw receipt images for basic extraction

Important hardening note:

- Backend currently has a fallback JWT secret if JWT_SECRET is missing.
- For production, always provide a strong JWT_SECRET and remove insecure defaults.

## Troubleshooting

### 1) Android SDK not found

- Follow [Android SDK Fix (Windows)](#android-sdk-fix-windows)

### 2) OTP email not received

- Verify backend .env SMTP values
- Check Gmail app password and sender account restrictions
- Confirm EMAIL_USER and EMAIL_PASS are valid

### 3) API calls failing from device

- Ensure EXPO_PUBLIC_API_URL is reachable from device/emulator
- If using physical device, use host machine LAN IP, not localhost

### 4) Notification parsing false positives

- Improve parser regex patterns in myApp/services/ParserService.ts
- Prioritize debit/credit intents and penalize balance/reference contexts

### 5) Notification listener features not working

- Android only
- Enable Notification Access for FinVault in system settings

## Scripts

### Mobile (myApp/package.json)

- npm run start
- npm run start:dev
- npm run android
- npm run android:dev
- npm run ios
- npm run web
- npm run lint

### Backend (backend/package.json)

- npm run start
- npm run dev

## Roadmap Suggestions

- Add automated tests for parser and auth flows
- Add stricter schema validation on backend routes
- Introduce CI for lint/build checks
- Add explicit privacy policy and retention policy docs
- Remove fallback JWT secret and enforce env validation at startup

## Contributors

This project is part of the Theory of App Development course (6th semester).

Team members:

- Dheeraj
- Daksh
- Harshit

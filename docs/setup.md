# Setup and Local Run Guide

Follow these steps to set up and run the Unified Organization Workspace application locally.

---

## 1. Prerequisites

Ensure you have the following installed on your developer machine:
- **Node.js** (v18.x or higher)
- **PostgreSQL** database instance
- **Redis** server instance (optional, fallbacks to in-memory store if offline)
- **Git**

---

## 2. Environment Variables Configuration

### Backend Config
Create a `.env` file in the `workspace-backend` directory with the following variables configured:
```env
PORT=5000
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<dbname>?schema=public"
JWT_SECRET="supersecret_jwt_sign_key_phrase"
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="your-gemini-ai-api-key"
```

### Frontend Config
*(Optional)* For local development, **no `.env` file is required** in the `workspace-frontend` directory because the local Vite server is pre-configured with proxy rules in `vite.config.js` to automatically forward `/api` and `/health` requests to the Express backend on `http://localhost:5000`.

---

## 3. Database Initialization

Navigate to the `workspace-backend` directory and perform the following database initialization commands:
```powershell
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Force database schema generation and run migrations
npx prisma db push

# 4. Seed the PostgreSQL instance with test users, organizations, and initial data
npm run db:seed
```

Seeding generates the following credentials:
- **Acme Corp (Org Admin)**: `admin@acme.com` / `admin123`
- **Acme Corp (Support Agent)**: `agent@acme.com` / `agent123`
- **Stark Industries (Reviewer)**: `reviewer@stark.com` / `review123`

---

## 4. Run the Dev Environments

### Launch Backend
In the `workspace-backend` directory, run:
```powershell
npm run dev
```
The backend server spins up on port **`5000`**.

### Launch Frontend
In a new terminal window, navigate to the `workspace-frontend` directory and run:
```powershell
npm install
npm run dev
```
The frontend Vite server spins up on port **`5173`**. Access the app at `http://localhost:5173`.

---

## 5. Simulating GitHub Webhook (Optional)

To mirror pull request status changes via webhook:
1. Fire up a tunnel forwarding port 5000:
   ```powershell
   npx ngrok http 5000
   ```
2. Register the generated HTTPS URL in your GitHub repository webhooks panel (`https://<your-subdomain>.ngrok-free.dev/api/webhooks/github`) selecting content-type `application/json` and subscribing to `pull_request` events.
3. Open or synchronize a pull request on GitHub to see the changes flow into your local dashboard.

---

## 6. Running Security Verification Tests

To execute the automated scoping, BOLA isolation, and RBAC tests:
```powershell
cd workspace-backend
node security_verification.js
```
The script will run through the security check matrix and verify all isolation boundaries (BOLA, Cross-Org Sharing parameters, RBAC roles, and AI digest context data leaks).

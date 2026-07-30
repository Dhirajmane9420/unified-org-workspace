# Deployment Guide (Hosted Project URL)

This document provides step-by-step instructions on how to deploy the application services to public clouds to get a live hosted project URL.

---

## 1. Database & Cache Provisioning

### PostgreSQL Database
You can provision a free managed PostgreSQL database on:
- **Neon** (https://neon.tech)
- **Supabase** (https://supabase.com)
- **Render PostgreSQL** (https://render.com)

After creation, copy the connection string (e.g., `postgresql://<user>:<password>@<host>/<db>?sslmode=require`) to use as your `DATABASE_URL`.

### Redis Session Cache
You can provision a free managed Redis cache instance on:
- **Upstash** (https://upstash.com) - Highly recommended (provides a free serverless Redis instance).
- **Aiven Redis** (https://aiven.io)

Copy the connection URL (e.g., `rediss://default:<password>@<host>:<port>`) to use as your `REDIS_URL`.

---

## 2. Backend Service Deployment (e.g., Render or Railway)

Deploy the `workspace-backend` to **Render** or **Railway**:

1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Root Directory**: `workspace-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `node src/app.js` (or `npm run start` if tsx is configured)
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: *[Your PostgreSQL Connection String]*
   - `REDIS_URL`: *[Your Redis Connection URL]*
   - `JWT_SECRET`: *[A secure random string]*
   - `JWT_EXPIRES_IN`: `7d`
   - `PORT`: `10000` (Render binds automatically)
   - `GEMINI_API_KEY`: *[Your Gemini API Key]*
5. Deploy the service and copy the live backend URL (e.g., `https://unified-backend.onrender.com`).

---

## 3. Frontend Hub Deployment (e.g., Vercel or Netlify)

Deploy the `workspace-frontend` to **Vercel**:

1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your GitHub repository.
3. Configure the project:
   - **Root Directory**: `workspace-frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: *[Your live backend URL generated in Step 2]* (e.g., `https://unified-backend.onrender.com`)
5. Click **Deploy**. Vercel will output a public URL (e.g., `https://unified-workspace.vercel.app`).

---

## 4. Final Database Migration

Once the live backend is up, run the migrations and seed data against the live database from your local machine:

1. Update the local `DATABASE_URL` in your `workspace-backend/.env` temporarily to point to your live hosted database.
2. Run the database setup commands:
   ```powershell
   # Deploy schema
   npx prisma db push
   
   # Populate seed entries
   npm run db:seed
   ```
3. Revert your local `.env` database URL back to localhost.

---

## 5. Reviewer Credentials

Include these test credentials in your submission for evaluation:
* **Acme Corp (Org Admin)**: `admin@acme.com` / `admin123`
* **Acme Corp (Support Agent)**: `agent@acme.com` / `agent123`
* **Stark Industries (Reviewer)**: `reviewer@stark.com` / `review123`

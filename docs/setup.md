### Local Setup & Run Guide 

### Prerequisites 
Make sure you have these tools installed: 
• Node.js (v18.x or later) 
• PostgreSQL 
• Redis (Optional. If down, the system defaults to in-memory caching) 
• Git 


### Environment Variables 
Backend Setup 
Create a file named .env inside the workspace-backend directory: 
DATABASE_URL="postgresql://postgres.pddweavatdoqirtenutq:dhirajmane%
402025@aws-1-ap-south
1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" 
PORT=5000 
NODE_ENV=development 
REDIS_URL="rediss://default:gQAAAAAAAkvDAAIgcDE3NWZhYzM3Yj
U2YzI0YzdhOGFmYmQ2OGE3YzIyZGY5Yg@heroic-mink
150467.upstash.io:6379" 
JWT_SECRET="unified_org_workshop@123" 
JWT_EXPIRES_IN="7d" 
FRONTEND_SUPPORT_URL="http://localhost:3000" 
FRONTEND_REVIEW_URL="http://localhost:3001" 
GEMINI_API_KEY="AIzaSyAAYGX12qb8ecVxB0aEJl8u8CFHBwBkkhg" 
DIGEST_CRON_INTERVAL="0 */5 * * *" 
Frontend Setup 
No local .env file is required for development. The Vite configuration file 
(vite.config.js) handles proxy forwarding automatically from port 5173 to the 
backend on http://localhost:5000 


### Database & App Initialization 
Open your terminal, go to the workspace-backend folder, and run the 
following setup chain: 
# 1. Install workspace dependencies 
npm install 
# 2. Build local Prisma Client artifacts 
npx prisma generate 
# 3. Synchronize database schema architecture 
npx prisma db push 
# 4. Populate development lookup data and dummy records 
npm run db:seed 
Seed User Logins 
The seed execution establishes these test user accounts: 
• Pune Instutute Of Computer Technology(Org Admin) : 
manedhiraj762@gmail.com / dhirajmane@123 
• Acme Corp (Org Admin): admin@acme.com / admin123 
• Acme Corp (Support Agent): agent@acme.com / agent123 
• Stark Industries (Reviewer): reviewer@stark.com / review123 


### Launching the Apps 
1. Boot the API Service 
From the workspace-backend directory: 
npm run dev 
The Express application listening engine will bind to port 5000. 

2. Boot the UI Bundler 
Open a secondary terminal workspace, switch into workspace-frontend, 
and run: 
npm install  
npm run dev 
The client dashboard layer spins up at http://localhost:5173. Open this 
URL in your web browser to test the authentication flows.


### Webhook Integration Testing  
To receive live GitHub pull request payloads on your local workspace: 
1. Create a secure public ingress tunnel routing traffic to your local 
server: 
npx ngrok http 5000 

2. Head to your GitHub Repository settings layout, create a new 
webhook, and use this configuration: 
• Payload URL: https://<your-ngrok-subdomain>.ngrok
free.dev/api/webhooks/github 
• Content type: application/json 
• Events: Toggle Let me select individual events and check Pull 
requests. 

3. Updating an issue status or pulling changes on your repository 
will automatically trigger visual changes on the dashboard view.



### Access Control & Boundary Validation 

To review structural code isolation, multi-tenant boundaries (BOLA 
prevention), and automated role access permissions, run the security script: 
cd workspace-backend 
node security_verification.js 
The terminal log prints granular results for each rule verification check 
block. 
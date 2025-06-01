PBN Automation
Setup

Backend:cd backend
npm install
cp .env.example .env
# Add OPENAI_API_KEY and GITHUB_PAT
npm run dev


Frontend:cd frontend
npm install
npm run dev


MongoDB: Ensure MongoDB is running locally.
Create sites folder:mkdir sites



Usage

Open http://localhost:3000.
Create a project with prompts, site count, interval.
Click "Run" to start generating PBN pages.
Edit or delete projects as needed.
Monitor progress in the UI.


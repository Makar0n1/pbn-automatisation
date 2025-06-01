# PBN Automation

PBN Automation is a web application for creating and managing Private Blog Network (PBN) sites. It automates the generation of SEO-optimized HTML pages, deploys them to GitHub repositories, and hosts them on Vercel.

## Features

- **Project Creation**: Create projects with custom prompts for generating casino/gambling-themed HTML pages.
- **Automated Site Generation**: Uses OpenAI's GPT-4o to generate SEO-optimized HTML content.
- **GitHub Integration**: Creates private repositories for each site.
- **Vercel Deployment**: Deploys sites to Vercel with custom domains.
- **Real-time Updates**: WebSocket updates for project status and progress.
- **Project Management**: Edit, delete, and view deployed sites.
- **User Authentication**: Login via UI, registration via API.

## Prerequisites

- Node.js v22.11.0 or higher
- MongoDB running locally
- OpenAI API key
- GitHub Personal Access Token (PAT) with `repo` and `delete_repo` scopes
- Vercel API token

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pbn-automation
   ```

2. **Install dependencies**:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**:
   Create `backend/.env` with:
   ```
   USER_NAME=Studibucht
   GITHUB_PAT=github_pat_...
   OPENAI_API_KEY=sk-proj-...
   VERCEL_TOKEN=...
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/pbn_automation4
   PORT=5000
   ```

4. **Run the application**:
   - Start MongoDB:
     ```bash
     mongod
     ```
   - Start backend:
     ```bash
     cd backend
     npm run dev
     ```
   - Start frontend:
     ```bash
     cd frontend
     npm run dev
     ```

## Usage

1. **Register a user** (via API):
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -ContentType "application/json" -Body '{"username":"test","password":"test123"}'
   ```

2. **Login**:
   - Open `http://localhost:5173/login`.
   - Enter `username: test`, `password: test123`.

3. **Create a Project**:
   - Click the "+" button.
   - Fill in project details (name, prompts, site count, interval).
   - Project name is auto-formatted to `lower-case-with-dashes`.

4. **Run Project**:
   - Click "Run" to generate and deploy sites.
   - First run skips deletion; subsequent runs clear previous resources.
   - Sites are created in `sites/<project_name>` and pushed to GitHub.

5. **View Sites**:
   - Click "Show Sites" to see deployed sites or a placeholder message if none exist.

6. **Edit/Delete Project**:
   - Click "Edit" to modify project details.
   - Click "Delete" to remove project, files, and repositories.

## Troubleshooting

- **"No token provided"**: Ensure you are logged in. Check `localStorage.getItem('token')` in browser console.
- **404 GitHub errors**: Verify `GITHUB_PAT` scopes and `USER_NAME` matches GitHub user.
- **"USER_NAME is not defined"**: Check `backend/.env` for `USER_NAME=Studibucht`.
- **MongoDB errors**: Ensure MongoDB is running and `MONGODB_URI` is correct.

## License

© 2025 PBN Automation. All rights reserved.
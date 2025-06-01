const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('octokit');
const simpleGit = require('simple-git');
const Project = require('../models/Project');

const generateHTML = async (systemPrompt, userPrompt, retries = 3) => {
  try {
    console.log('Sending request to OpenAI');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 30000
      }
    );
    const content = JSON.parse(response.data.choices[0].message.content);
    return content.html;
  } catch (error) {
    console.error('Error generating HTML:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      throw new Error(`Bad request to OpenAI: ${error.response.data.error?.message || 'Invalid request'}`);
    }
    if (retries > 0 && (error.code === 'ECONNRESET' || error.response?.status === 429 || error.response?.status === 502)) {
      console.log(`Retrying OpenAI request (${retries} attempts left) after 20s delay`);
      await new Promise(resolve => setTimeout(resolve, 20000));
      return generateHTML(systemPrompt, userPrompt, retries - 1);
    }
    throw error;
  }
};

const createGitHubRepo = async (repoName) => {
  try {
    if (!process.env.GITHUB_PAT) {
      throw new Error('GITHUB_PAT is not defined in .env');
    }
    console.log(`Creating GitHub repo: ${repoName}`);
    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const response = await octokit.request('POST /user/repos', {
      name: repoName,
      private: true,
      auto_init: false
    });
    const owner = response.data.owner.login;
    console.log(`GitHub repo created: ${response.data.clone_url}, owner: ${owner}`);
    if (process.env.USER_NAME && owner !== process.env.USER_NAME) {
      console.warn(`Warning: GitHub owner (${owner}) does not match USER_NAME (${process.env.USER_NAME})`);
    }
    return { clone_url: response.data.clone_url, id: response.data.id, owner };
  } catch (error) {
    console.error('Error creating GitHub repo:', error);
    throw error;
  }
};

const getDefaultBranch = async (owner, repo) => {
  try {
    console.log(`Fetching default branch for ${owner}/${repo}`);
    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const response = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo
    });
    return response.data.default_branch;
  } catch (error) {
    console.error('Error getting default branch:', error);
    return 'main';
  }
};

const createVercelProject = async (repoName, repoId, owner) => {
  try {
    console.log(`Creating Vercel project: ${repoName}`);
    const response = await axios.post(
      'https://api.vercel.com/v10/projects',
      {
        name: repoName,
        gitRepository: {
          type: 'github',
          repo: `${owner}/${repoName}`,
          repoId: repoId
        },
        framework: null,
        buildCommand: null,
        installCommand: null,
        outputDirectory: null
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
        }
      }
    );
    const domain = response.data.domains?.[0] || `${repoName}.vercel.app`;
    return {
      projectId: response.data.id,
      domain: `https://${domain}`
    };
  } catch (error) {
    console.error('Error creating Vercel project:', error.response?.data || error.message);
    throw error;
  }
};

const triggerVercelDeploy = async (repoName, repoId, owner) => {
  try {
    console.log(`Triggering Vercel deploy for repo: ${repoName}`);
    const response = await axios.post(
      'https://api.vercel.com/v13/deployments',
      {
        name: repoName,
        target: 'production',
        gitSource: {
          type: 'github',
          repo: `${owner}/${repoName}`,
          repoId: repoId,
          ref: 'main'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
        }
      }
    );
    return response.data.id;
  } catch (error) {
    console.error('Error triggering Vercel deploy:', error.response?.data || error.message);
    throw error;
  }
};

const deleteVercelProject = async (projectId) => {
  try {
    console.log(`Deleting Vercel project: ${projectId}`);
    await axios.delete(`https://api.vercel.com/v10/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
      }
    });
  } catch (error) {
    console.error('Error deleting Vercel project:', error.response?.data || error.message);
  }
};

const createSite = async (projectId, siteId, projectDir, io) => {
  console.log(`Creating site ${siteId} for project ${projectId}`);
  try {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');
    
    io.emit('projectUpdate', {
      projectId,
      status: 'running',
      progress: project.progress,
      siteCount: project.siteCount,
      isRunning: true
    });

    const html = await generateHTML(project.systemPrompt, project.userPrompt);
    const siteDir = path.join(projectDir, `site-${siteId}`);
    console.log(`Creating directory: ${siteDir}`);
    await fs.mkdir(siteDir, { recursive: true });
    await fs.writeFile(path.join(siteDir, 'index.html'), html);

    console.log(`Creating GitHub repo: ${siteId}`);
    const repoName = `site-${siteId}`;
    const { clone_url: repoUrl, id: repoId, owner } = await createGitHubRepo(repoName);

    console.log(`Waiting for GitHub repo sync...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    const defaultBranch = await getDefaultBranch(owner, repoName);

    console.log(`Initializing git in ${siteDir} with branch ${defaultBranch}`);
    const git = simpleGit(siteDir);
    await git.init();
    await git.checkoutLocalBranch(defaultBranch);
    await git.addRemote('origin', repoUrl.replace('https://', `https://${process.env.GITHUB_PAT}@`));

    await git.add('.');
    await git.commit('Add PBN page');
    console.log(`Pushing to ${defaultBranch}`);
    await git.push('origin', defaultBranch, { '--set-upstream': null });

    console.log(`Verifying repo contents`);
    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const repoContents = await octokit.request('GET /repos/{owner}/{repo}/contents', {
      owner,
      repo: repoName,
      ref: defaultBranch
    });
    console.log('Repo contents:', repoContents.data.map(item => item.name));

    console.log(`Waiting for GitHub sync...`);
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log(`Creating Vercel project for ${repoName}`);
    const vercelData = await createVercelProject(repoName, repoId, owner);

    console.log(`Triggering Vercel deploy for ${repoName}`);
    await triggerVercelDeploy(repoName, repoId, owner);

    console.log(`Updating project progress`);
    await Project.updateOne(
      { _id: projectId },
      {
        $push: {
          progress: {
            siteId,
            status: 'deployed',
            createdAt: new Date(),
            repoUrl,
            repoName,
            vercelUrl: vercelData.domain,
            vercelProjectId: vercelData.projectId,
            owner // Сохраняем owner
          }
        }
      }
    );

    const updatedProject = await Project.findById(projectId);
    io.emit('projectUpdate', {
      projectId,
      status: updatedProject.progress.length >= project.siteCount ? 'completed' : 'running',
      progress: updatedProject.progress,
      siteCount: project.siteCount,
      isRunning: updatedProject.progress.length < project.siteCount
    });
  } catch (error) {
    console.error(`Error creating site ${siteId}:`, error);
    throw error;
  }
};

const deleteProjectFiles = async (projectName) => {
  try {
    const projectDir = path.join(__dirname, '../../sites', projectName);
    console.log(`Deleting directory: ${projectDir}`);
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error deleting project files:', error);
    throw error;
  }
};

const deleteGitHubRepos = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;
    if (!process.env.GITHUB_PAT) {
      throw new Error('GITHUB_PAT is not defined in .env');
    }
    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    for (const prog of project.progress) {
      try {
        const repoName = prog.repoName || `site-${prog.siteId}`;
        const owner = prog.owner || process.env.USER_NAME || 'Studibucht'; // Фallback на USER_NAME или Studibucht
        console.log(`Checking GitHub repo: ${owner}/${repoName}`);
        await octokit.request('GET /repos/{owner}/{repo}', {
          owner,
          repo: repoName
        }).catch(error => {
          if (error.status === 404) {
            console.log(`Repository ${owner}/${repoName} not found, skipping deletion`);
            return null;
          }
          throw error;
        });
        console.log(`Deleting GitHub repo: ${owner}/${repoName}`);
        await octokit.request('DELETE /repos/{owner}/{repo}', {
          owner,
          repo: repoName
        });
        console.log(`Successfully deleted repo: ${owner}/${repoName}`);
      } catch (error) {
        console.error(`Error deleting repo ${prog.repoName || `site-${prog.siteId}`}:`, error);
      }
    }
  } catch (error) {
    console.error('Error deleting GitHub repos:', error);
    throw error;
  }
};

const deleteVercelProjects = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;
    for (const prog of project.progress) {
      if (prog.vercelProjectId) {
        try {
          console.log(`Deleting Vercel project: ${prog.vercelProjectId}`);
          await deleteVercelProject(prog.vercelProjectId);
        } catch (error) {
          console.error(`Error deleting Vercel project ${prog.vercelProjectId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting Vercel projects:', error);
    throw error;
  }
};

module.exports = { createSite, deleteProjectFiles, deleteGitHubRepos, deleteVercelProjects };
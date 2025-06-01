const express = require('express');
const router = express.Router();
const path = require('path');
const Project = require('../models/Project');
const { createSite, deleteProjectFiles, deleteGitHubRepos, deleteVercelProjects } = require('../services/pbnService');
const fs = require('fs').promises;

router.post('/', async (req, res) => {
  try {
    const { name, systemPrompt, userPrompt, siteCount, interval } = req.body;
    if (!name || !systemPrompt || !userPrompt || !siteCount || !interval) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existingProject = await Project.findOne({ name });
    if (existingProject) {
      return res.status(400).json({ error: 'Project name already exists' });
    }
    const project = new Project({
      name,
      systemPrompt,
      userPrompt,
      siteCount,
      interval
    });
    await project.save();
    const io = req.app.get('io');
    const projects = await Project.find();
    const summary = await calculateSummary();
    io.emit('summaryUpdate', summary);
    res.json({ projectId: project._id });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/run', async (req, res) => {
  console.log(`Run request for project ${req.params.id}`);
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      console.log('Project not found');
      return res.status(400).json({ error: 'Project not found' });
    }
    if (project.isRunning) {
      console.log('Project already running');
      return res.status(400).json({ error: 'Project already running' });
    }

    console.log('Clearing previous files');
    await deleteProjectFiles(project.name);
    await deleteGitHubRepos(req.params.id);
    await deleteVercelProjects(req.params.id);
    await Project.updateOne({ _id: req.params.id }, { $set: { progress: [], status: 'running', isRunning: true } });

    const io = req.app.get('io');
    io.emit('projectUpdate', { projectId: req.params.id, status: 'running', progress: [], siteCount: project.siteCount, isRunning: true });

    const projectDir = path.join(__dirname, '../../sites', project.name);
    console.log(`Creating directory: ${projectDir}`);
    await fs.mkdir(projectDir, { recursive: true });

    let intervalRunning = false;
    const intervalId = setInterval(async () => {
      if (intervalRunning) return;
      intervalRunning = true;
      try {
        const updatedProject = await Project.findById(req.params.id);
        if (!updatedProject) {
          clearInterval(intervalId);
          return;
        }
        const currentSite = updatedProject.progress.length + 1;
        if (currentSite > updatedProject.siteCount) {
          clearInterval(intervalId);
          console.log('All sites created');
          await Project.updateOne({ _id: req.params.id }, { status: 'completed', isRunning: false });
          io.emit('projectUpdate', { projectId: req.params.id, status: 'completed', progress: updatedProject.progress, siteCount: updatedProject.siteCount, isRunning: false });
          io.emit('summaryUpdate', await calculateSummary());
          return;
        }
        console.log(`Creating site ${currentSite}`);
        const siteId = `pbn-${Date.now()}-${currentSite}`;
        try {
          await createSite(req.params.id, siteId, projectDir, io);
          io.emit('summaryUpdate', await calculateSummary());
        } catch (error) {
          console.error(`Error creating site ${currentSite}:`, error);
          clearInterval(intervalId);
          await deleteProjectFiles(project.name);
          await deleteGitHubRepos(req.params.id);
          await deleteVercelProjects(req.params.id);
          await Project.updateOne({ _id: req.params.id }, { status: 'error', isRunning: false });
          io.emit('projectUpdate', { projectId: req.params.id, status: 'error', progress: updatedProject.progress, siteCount: updatedProject.siteCount, isRunning: false });
          io.emit('summaryUpdate', await calculateSummary());
        }
      } catch (error) {
        console.error('Unexpected error in interval:', error);
        clearInterval(intervalId);
        await deleteProjectFiles(project.name);
        await deleteGitHubRepos(req.params.id);
        await deleteVercelProjects(req.params.id);
        await Project.updateOne({ _id: req.params.id }, { status: 'error', isRunning: false });
        io.emit('projectUpdate', { projectId: req.params.id, status: 'error', progress: [], siteCount: project.siteCount, isRunning: false });
        io.emit('summaryUpdate', await calculateSummary());
      } finally {
        intervalRunning = false;
      }
    }, project.interval * 1000);

    res.json({ message: 'Project started' });
  } catch (error) {
    console.error('Error running project:', error);
    await Project.updateOne({ _id: req.params.id }, { status: 'error', isRunning: false });
    const io = req.app.get('io');
    io.emit('projectUpdate', { projectId: req.params.id, status: 'error', progress: [], siteCount: project.siteCount, isRunning: false });
    io.emit('summaryUpdate', await calculateSummary());
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, systemPrompt, userPrompt, siteCount, interval } = req.body;
    if (!name || !systemPrompt || !userPrompt || !siteCount || !interval) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existingProject = await Project.findOne({ name, _id: { $ne: req.params.id } });
    if (existingProject) {
      return res.status(400).json({ error: 'Project name already exists' });
    }
    await Project.updateOne(
      { _id: req.params.id },
      { name, systemPrompt, userPrompt, siteCount, interval }
    );
    const io = req.app.get('io');
    io.emit('summaryUpdate', await calculateSummary());
    res.json({ message: 'Project updated' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(400).json({ error: 'Project not found' });

    const io = req.app.get('io');
    io.emit('projectUpdate', { projectId: req.params.id, status: 'deleting', progress: project.progress, siteCount: project.siteCount, isRunning: true });

    await deleteProjectFiles(project.name);
    await deleteGitHubRepos(req.params.id);
    await deleteVercelProjects(req.params.id);
    await Project.deleteOne({ _id: req.params.id });

    io.emit('summaryUpdate', await calculateSummary());
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    const io = req.app.get('io');
    io.emit('projectUpdate', { projectId: req.params.id, status: 'error', progress: [], siteCount: 0, isRunning: false });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await calculateSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

async function calculateSummary() {
  const projects = await Project.find();
  const totalProjects = projects.length;
  const totalSites = projects.reduce((sum, p) => sum + p.progress.length, 0);
  const creationTimes = projects
    .flatMap(p => p.progress)
    .filter(p => p.createdAt)
    .map(p => new Date(p.createdAt).getTime());
  const averageCreationTime = creationTimes.length
    ? (creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length - creationTimes[0]) / 1000 / creationTimes.length
    : 0;
  const lastSiteDate = creationTimes.length
    ? new Date(Math.max(...creationTimes)).toLocaleString()
    : 'N/A';
  return {
    totalProjects,
    totalSites,
    averageCreationTime: averageCreationTime.toFixed(2),
    aiModel: 'gpt-4o',
    lastSiteDate
  };
}

module.exports = router;
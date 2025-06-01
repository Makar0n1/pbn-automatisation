const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  systemPrompt: { type: String, required: true },
  userPrompt: { type: String, required: true },
  siteCount: { type: Number, required: true },
  interval: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  isRunning: { type: Boolean, default: false },
  progress: [{
    siteId: String,
    status: String,
    createdAt: Date,
    repoUrl: String,
    repoName: String,
    vercelUrl: String,
    vercelProjectId: String,
    owner: String // Добавляем owner
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
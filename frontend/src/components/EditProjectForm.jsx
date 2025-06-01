import { useState } from 'react';
import axios from 'axios';

function EditProjectForm({ project, setProjects, setEditing }) {
  const [formData, setFormData] = useState({
    name: project.name,
    systemPrompt: project.systemPrompt,
    userPrompt: project.userPrompt,
    siteCount: project.siteCount,
    interval: project.interval
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/projects/${project._id}`, formData);
      setProjects((prev) =>
        prev.map((p) =>
          p._id === project._id ? { ...p, ...formData } : p
        )
      );
      setEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.error || 'Failed to update project');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="card">
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-1">Project Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-1">System Prompt</label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows="6"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-1">User Prompt</label>
          <textarea
            value={formData.userPrompt}
            onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows="6"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary mb-1">Number of Sites</label>
          <input
            type="number"
            value={formData.siteCount}
            onChange={(e) => setFormData({ ...formData, siteCount: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="1"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-1">Interval (seconds)</label>
          <input
            type="number"
            value={formData.interval}
            onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="10"
            required
          />
        </div>
        <div className="flex space-x-4">
          <button type="submit" className="btn flex-1">Save</button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn flex-1 bg-gray-500 hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjectForm;
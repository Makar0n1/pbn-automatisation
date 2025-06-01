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
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token provided');
      const res = await axios.put(`/api/projects/${project._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects((prev) =>
        prev.map((p) => (p._id === project._id ? { ...p, ...formData } : p))
      );
      setError(null);
      setEditing();
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.error || error.message || 'Failed to update project');
    }
  };

  const handleNumberChange = (e, field) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      [field]: value === '' ? '' : parseInt(value) || 1
    });
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows="6"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User Prompt</label>
          <textarea
            value={formData.userPrompt}
            onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows="6"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Sites</label>
          <input
            type="number"
            value={formData.siteCount}
            onChange={(e) => handleNumberChange(e, 'siteCount')}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interval (seconds)</label>
          <input
            type="number"
            value={formData.interval}
            onChange={(e) => handleNumberChange(e, 'interval')}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            min="10"
            required
          />
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
          >
            Save
          </button>
          <button
            onClick={setEditing}
            className="btn bg-gray-500 hover:bg-gray-600 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjectForm;
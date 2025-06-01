import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import ProjectForm from '../components/ProjectForm';
import EditProjectForm from '../components/EditProjectForm';

const socket = io('http://localhost:5000');

function Home() {
  const { setIsAuthenticated } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState({});
  const [showModal, setShowModal] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [summary, setSummary] = useState({
    totalProjects: 0,
    totalSites: 0,
    averageCreationTime: 0,
    aiModel: 'gpt-4o',
    lastSiteDate: 'N/A'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(res.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching projects:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          navigate('/login', { replace: true });
        } else {
          setError('Failed to load projects');
        }
      }
    };
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/projects/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSummary(res.data);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
    };
    fetchProjects();
    fetchSummary();

    socket.on('projectUpdate', (update) => {
      setProjects((prev) =>
        prev.map((p) =>
          p._id === update.projectId
            ? {
                ...p,
                status: update.status || p.status,
                progress: update.progress || p.progress,
                isRunning: update.isRunning ?? p.isRunning
              }
            : p
        )
      );
      setLoading((prev) => ({
        ...prev,
        [update.projectId]: update.isRunning || update.status === 'deleting' || update.status === 'running'
      }));
    });

    socket.on('summaryUpdate', (update) => {
      setSummary(update);
    });

    return () => {
      socket.off('projectUpdate');
      socket.off('summaryUpdate');
    };
  }, [navigate, setIsAuthenticated]);

  useEffect(() => {
    if (showModal || showFormModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal, showFormModal]);

  const handleRun = async (projectId) => {
    try {
      setLoading((prev) => ({ ...prev, [projectId]: true }));
      setProjects((prev) =>
        prev.map((p) =>
          p._id === projectId ? { ...p, status: 'running', isRunning: true } : p
        )
      );
      const token = localStorage.getItem('token');
      await axios.post(`/api/projects/${projectId}/run`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setError(null);
    } catch (error) {
      console.error('Error running project:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      } else {
        setError(error.response?.data?.error || 'Failed to run project');
        setLoading((prev) => ({ ...prev, [projectId]: false }));
        setProjects((prev) =>
          prev.map((p) =>
            p._id === projectId ? { ...p, status: 'error', isRunning: false } : p
          )
        );
      }
    }
  };

  const handleDelete = async (projectId) => {
    try {
      setLoading((prev) => ({ ...prev, [projectId]: true }));
      const token = localStorage.getItem('token');
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      setError(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      } else {
        setError('Failed to delete project');
      }
    } finally {
      setLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleShowSites = (projectId) => {
    setShowModal(projectId);
  };

  const handleExportCSV = (progress) => {
    const headers = ['Site ID', 'Vercel URL', 'Status', 'Created At'];
    const rows = progress.map(p => [
      p.siteId,
      p.vercelUrl,
      p.status,
      new Date(p.createdAt).toLocaleString()
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'deployed_sites.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  const handleOpenFormModal = () => {
    setShowFormModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-400';
      case 'running': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'deleting': return 'bg-yellow-600';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'running': return 'Creating';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      case 'deleting': return 'Deleting';
      default: return 'Pending';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <header className="bg-blue-900 text-white py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
          <h1 className="text-2xl font-bold">PBN Automation</h1>
          <button
            onClick={handleLogout}
            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center animate-fade-in h-[180px]">
            <button
              onClick={handleOpenFormModal}
              className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105 animate-pulse"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <p className="mt-2 text-lg font-bold text-gray-600 transition-all duration-300 hover:text-blue-600">Create Project</p>
          </div>
          <div className="flex-1 ml-8">
            <div className="bg-white p-4 rounded-lg shadow-md mb-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-800 text-center">Project Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 animate-slide-up">
              <div className="bg-white p-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <p className="text-gray-600 font-semibold">Projects & Sites</p>
                <p className="text-gray-800">Projects: {summary.totalProjects}</p>
                <p className="text-gray-800">Sites: {summary.totalSites}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <p className="text-gray-600 font-semibold">Creation Details</p>
                <p className="text-gray-800">Avg. Time: {summary.averageCreationTime} sec</p>
                <p className="text-gray-800 pt-[1px]">AI Model: {summary.aiModel}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <p className="text-gray-600 font-semibold">Last Activity</p>
                <p className="text-gray-800">Last Site: {summary.lastSiteDate}</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects yet.</p>
          ) : (
            projects.map((project) => (
              <div key={project._id} className="bg-white p-6 rounded-lg shadow-md mb-4">
                {editingProject === project._id ? (
                  <EditProjectForm
                    project={project}
                    setProjects={setProjects}
                    setEditing={() => setEditingProject(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(project.status)}`}></div>
                    </div>
                    <p className="text-gray-600">Status: <span className="capitalize">{getStatusText(project.status)}</span></p>
                    <p className="text-gray-600">Sites: {project.siteCount}</p>
                    <p className="text-gray-600">Interval: {project.interval}s</p>
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800">Progress:</h4>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${(project.progress.length / project.siteCount) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-600 mt-1">
                        {project.progress.length} of {project.siteCount} sites created
                      </p>
                    </div>
                    <div className="mt-4 flex space-x-4">
                      {loading[project._id] || project.isRunning ? (
                        <div className="flex-1 flex justify-center">
                          <div className="loader" style={{ display: 'inline-block', width: '2rem', height: '2rem' }}></div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRun(project._id)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                            disabled={project.isRunning}
                          >
                            Run
                          </button>
                          <button
                            onClick={() => setEditingProject(project._id)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                            disabled={project.isRunning}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleShowSites(project._id)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                          >
                            Show Sites
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                            disabled={project.isRunning}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {showModal === project._id && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
                    onClick={() => setShowModal(null)}
                  >
                    <div 
                      className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Deployed Sites</h2>
                      {project.progress.length === 0 ? (
                        <p className="text-gray-600 text-center py-20">
                          Start the creation process first, results will appear here
                        </p>
                      ) : (
                        <>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="border p-2 text-left">Site ID</th>
                                <th className="border p-2 text-left">Vercel URL</th>
                                <th className="border p-2 text-left">Status</th>
                                <th className="border p-2 text-left">Created At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.progress.map((p) => (
                                <tr key={p.siteId}>
                                  <td className="border p-2">{p.siteId}</td>
                                  <td className="border p-2">
                                    <a href={p.vercelUrl} target="_blank" className="text-blue-600">{p.vercelUrl}</a>
                                  </td>
                                  <td className="border p-2 capitalize">{p.status}</td>
                                  <td className="border p-2">{new Date(p.createdAt).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-4 flex justify-end space-x-4">
                            <button
                              onClick={() => handleExportCSV(project.progress)}
                              className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                              Export to CSV
                            </button>
                            <button
                              onClick={() => setShowModal(null)}
                              className="btn bg-gray-500 hover:bg-gray-600 text-white rounded-md px-4 py-2 shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                              Close
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {showFormModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
            onClick={() => setShowFormModal(false)}
          >
            <div 
              className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Project</h2>
              <ProjectForm setProjects={setProjects} closeModal={() => setShowFormModal(false)} />
              <button
                onClick={() => setShowFormModal(false)}
                className="btn bg-gray-500 hover:bg-gray-600 text-white rounded-md px-4 py-2 mt-4 w-full shadow-md transition-all duration-300 transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="bg-blue-900 text-white py-4">
        <div className="max-w-7xl mx-auto text-center">
          <p>© 2025 PBN Automation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
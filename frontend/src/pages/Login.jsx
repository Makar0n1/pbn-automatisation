import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

function Login() {
  const { setIsAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        username: formData.username,
        password: formData.password
      });
      localStorage.setItem('token', res.data.token);
      setIsAuthenticated(true);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.error || 'Failed to login');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <header className="bg-blue-900 text-white py-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold">PBN Automation</h1>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <button
              type="submit"
              className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 w-full shadow-md transition-all duration-300 transform hover:scale-105"
            >
              Login
            </button>
          </form>
        </div>
      </main>
      <footer className="bg-blue-900 text-white py-4">
        <div className="max-w-7xl mx-auto text-center">
          <p>© 2025 PBN Automation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Login;
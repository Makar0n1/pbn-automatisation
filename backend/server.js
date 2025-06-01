const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

// Загрузка .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('USER_NAME:', process.env.USER_NAME); // Отладка
console.log('GITHUB_PAT exists:', !!process.env.GITHUB_PAT);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.set('io', io);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
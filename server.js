const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;
let isConnected = false;

async function connectMongoDB() {
  try {
    const mongoClient = new MongoClient(MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 45000,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    await mongoClient.connect();
    db = mongoClient.db('portfolio');
    isConnected = true;
    console.log('✅ Connected to MongoDB');
    
    // Test connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    return true;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    isConnected = false;
    return false;
  }
}

// ========== AUTHENTICATION ==========
// Password stored in environment variable (secret)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JennaJen24/7!!!';

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  if (password === ADMIN_PASSWORD) {
    // Password is correct - return success
    // Frontend will handle the token/session
    res.json({ success: true, message: 'Login successful' });
  } else {
    // Wrong password
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Health Check (no DB needed)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running ✅',
    mongoConnected: isConnected,
    timestamp: new Date() 
  });
});

// Middleware to check DB connection (for all other endpoints)
app.use((req, res, next) => {
  if (!db || !isConnected) {
    return res.status(503).json({ error: 'Database not ready. Please try again in a moment.' });
  }
  next();
});

// ========== PROJECTS ==========
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.collection('projects').find({}).toArray();
    res.json(projects || []);
  } catch (err) {
    console.error('GET /api/projects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { cat, name, desc } = req.body;
    if (!cat || !name || !desc) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await db.collection('projects').insertOne({
      id: Date.now(),
      cat, name, desc,
      createdAt: new Date()
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (err) {
    console.error('POST /api/projects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await db.collection('projects').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/projects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== PORTFOLIO ==========
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await db.collection('portfolio').find({}).toArray();
    res.json(portfolio || []);
  } catch (err) {
    console.error('GET /api/portfolio:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portfolio', async (req, res) => {
  try {
    const { company, url, desc, img } = req.body;
    if (!company || !url || !desc) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await db.collection('portfolio').insertOne({
      id: Date.now(),
      company, url, desc, img: img || '',
      createdAt: new Date()
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (err) {
    console.error('POST /api/portfolio:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    await db.collection('portfolio').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/portfolio:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== SERVICES ==========
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.collection('services').find({}).toArray();
    res.json(services || []);
  } catch (err) {
    console.error('GET /api/services:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const { name, price, desc, features } = req.body;
    if (!name || !price || !desc || !features) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const featuresList = Array.isArray(features) ? features : 
      (typeof features === 'string' ? features.split(',').map(f => f.trim()) : []);
    
    const result = await db.collection('services').insertOne({
      id: Date.now(),
      name, price: parseInt(price), desc, features: featuresList,
      createdAt: new Date()
    });
    
    res.json({ id: result.insertedId, ...req.body, features: featuresList });
  } catch (err) {
    console.error('POST /api/services:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    await db.collection('services').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/services:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== COURSES ==========
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.collection('courses').find({}).toArray();
    res.json(courses || []);
  } catch (err) {
    console.error('GET /api/courses:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { name, platform, status, progress } = req.body;
    if (!name || !platform || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await db.collection('courses').insertOne({
      id: Date.now(),
      name, platform, status, progress: parseInt(progress) || 0,
      createdAt: new Date()
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (err) {
    console.error('POST /api/courses:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await db.collection('courses').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/courses:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== DIPLOMAS ==========
app.get('/api/diplomas', async (req, res) => {
  try {
    const diplomas = await db.collection('diplomas').find({}).toArray();
    res.json(diplomas || []);
  } catch (err) {
    console.error('GET /api/diplomas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diplomas', async (req, res) => {
  try {
    const { name, institution, year, img } = req.body;
    if (!name || !institution || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await db.collection('diplomas').insertOne({
      id: Date.now(),
      name, institution, year: parseInt(year), img: img || '',
      createdAt: new Date()
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (err) {
    console.error('POST /api/diplomas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/diplomas/:id', async (req, res) => {
  try {
    await db.collection('diplomas').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/diplomas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== BUSINESS DESCRIPTION ==========
app.get('/api/business-desc', async (req, res) => {
  try {
    let desc = await db.collection('settings').findOne({ key: 'businessDescription' });
    if (!desc) {
      desc = { value: 'Welcome to my freelance web development services.' };
    }
    res.json({ description: desc.value });
  } catch (err) {
    console.error('GET /api/business-desc:', err.message);
    res.json({ description: 'Welcome to my freelance web development services.' });
  }
});

app.post('/api/business-desc', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }
    
    await db.collection('settings').updateOne(
      { key: 'businessDescription' },
      { $set: { key: 'businessDescription', value: description, updatedAt: new Date() } },
      { upsert: true }
    );
    
    res.json({ success: true, description });
  } catch (err) {
    console.error('POST /api/business-desc:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📡 Connecting to MongoDB...');
  
  // Connect to MongoDB with aggressive retry
  let attempts = 0;
  const maxAttempts = 10;
  
  async function tryConnect() {
    attempts++;
    console.log(`Connection attempt ${attempts}/${maxAttempts}...`);
    const connected = await connectMongoDB();
    
    if (!connected && attempts < maxAttempts) {
      console.log(`⚠️  Retrying in 10 seconds (attempt ${attempts}/${maxAttempts})...`);
      setTimeout(tryConnect, 10000);
    } else if (!connected) {
      console.error('❌ Failed to connect after max attempts');
    }
  }
  
  tryConnect();
});

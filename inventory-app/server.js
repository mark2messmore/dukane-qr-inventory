const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Token endpoint for AssemblyAI
app.get('/api/token', async (req, res) => {
  try {
    const expiresInSeconds = 300; // 5 minutes
    const url = `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: process.env.VITE_ASSEMBLYAI_API_KEY,
      },
    });

    console.log('Token generated successfully');
    res.json({ token: response.data.token });
  } catch (error) {
    console.error('Error generating token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Token endpoint: http://localhost:${PORT}/api/token`);
  console.log(`- Web app: http://localhost:${PORT}`);
});

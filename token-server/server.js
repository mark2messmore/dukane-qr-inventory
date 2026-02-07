const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/token', async (req, res) => {
  try {
    const expiresInSeconds = 300; // 5 minutes
    const url = `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    });

    console.log('Token generated successfully');
    res.json({ token: response.data.token });
  } catch (error) {
    console.error('Error generating token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Token server running on port ${PORT}`);
});

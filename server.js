const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); 
require('dotenv').config();

const app = express();
// Menggunakan port dari environment variable (Wajib untuk Render)
const PORT = process.env.PORT || 3001;

// Keamanan: Izinkan Frontend berkomunikasi dengan Backend ini
app.use(cors());
app.use(express.json());

// Halaman depan untuk health check (Render membutuhkan ini agar server tidak dianggap mati)
app.get('/', (req, res) => {
  res.send('✅ Backend Proxy Arkan AI (NexaBot) Aktif. Siap melayani request.');
});

// Endpoint proxy lokal untuk menerima request dari frontend Arkan AI
app.post('/api/nexabot/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;

    // 1. Membaca API Key dari Environment Variable (Aman)
    const NEXABOT_API_KEY = process.env.NEXABOT_API_KEY;

    if (!NEXABOT_API_KEY) {
      return res.status(500).json({ message: 'Backend Error: API Key NexaBot belum dikonfigurasi di server.' });
    }

    // 2. Pemetaan Rasio
    // Dokumentasi: "ratio: 2" berarti orientasi portrait 9:16
    let ratioValue = 1; // Default fallback
    if (aspectRatio === '9:16' || aspectRatio === '3:4') {
        ratioValue = 2; // Portrait
    } else if (aspectRatio === '16:9') {
        ratioValue = 3; // Asumsi landscape jika 3, sesuaikan jika dokumentasi memiliki nilai pasti
    } else if (aspectRatio === '1:1') {
        ratioValue = 1; // Asumsi square
    }

    // 3. Format Request Payload Resmi NexaBot
    const requestPayload = {
      mode: "img",
      prompt: prompt,
      ratio: ratioValue
    };

    console.log("Mengirim request ke NexaBot dengan payload:", requestPayload);

    // 4. Melakukan HTTP Request ke Endpoint Resmi NexaBot
    const response = await fetch("https://nexabot.id/api/v1/api", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEXABOT_API_KEY // Autentikasi sesuai dokumentasi
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("NexaBot API Error:", data);
      return res.status(response.status).json({ message: data.message || data.error || 'NexaBot API Error' });
    }

    console.log("Berhasil mendapat balikan dari NexaBot!");

    // 5. Penanganan Response Fleksibel
    // Karena dokumentasi response tidak diberikan, proxy mengembalikan nilai base64 yang umum
    // dan juga menyertakan raw data agar jika formatnya URL/Job ID, frontend tetap bisa membacanya tanpa error.
    let base64String = data.image_base64 || data.base64 || data.data || (data.result && data.result.base64);

    res.json({
      image_base64: base64String, // Ekstraksi otomatis jika formatnya standar
      raw_response: data          // Data utuh untuk inspeksi jika format balikan berupa URL / Job ID
    });

  } catch (error) {
    console.error("Proxy Internal Error:", error);
    res.status(500).json({ message: 'Terjadi kesalahan internal saat menghubungi NexaBot API.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server Backend Proxy berjalan di port: ${PORT}`);
});
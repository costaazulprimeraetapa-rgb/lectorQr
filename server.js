// server.js
require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- CONFIGURACIÓN ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

// Autenticación con la cuenta de servicio usando variables de entorno
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      universe_domain: 'googleapis.com'
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return await auth.getClient();
}

app.post('/buscar-qr', async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) {
    return res.status(400).json({ error: 'Falta el código QR' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'La hoja está vacía' });
    }

    const headers = rows[0];
    const codigoIndex = headers.findIndex(h =>
      h.toString().trim().toUpperCase() === 'CODIGO' ||
      h.toString().trim().toUpperCase() === 'CÓDIGO'
    );

    if (codigoIndex === -1) {
      return res.status(500).json({
        error: 'No se encontró la columna CODIGO',
        headers: headers
      });
    }

    let filaEncontrada = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][codigoIndex] === codigo) {
        filaEncontrada = rows[i];
        break;
      }
    }

    if (!filaEncontrada) {
      return res.status(404).json({ error: 'Código no encontrado', codigo });
    }

    const registro = {};
    headers.forEach((header, idx) => {
      registro[header] = filaEncontrada[idx] || '';
    });

    res.json({ success: true, data: registro });

  } catch (error) {
    console.error('❌ ERROR DETALLADO EN BACKEND:', error); // ← SALDRÁ EN TU TERMINAL
    res.status(500).json({
      error: 'Error al consultar Google Sheets',
      detalle: error.message,
      respuesta: error.response?.data || null
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
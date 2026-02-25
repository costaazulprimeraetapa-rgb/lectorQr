// server.js
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
const SPREADSHEET_ID = '1u8go_4XYqn_b0NmAGMiqmlJ07MoOtsINs5nlWeLPUnQ';
const SHEET_NAME = 'ACCESODEUSUARIOS';

// Autenticación con la cuenta de servicio
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
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
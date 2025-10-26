// D:\e-booklet-app-main\netlify\functions\submit-approval.js

// Menggunakan utility database kita yang konsisten
const { db } = require('../utils/database'); // <-- PATH DIPERBAIKI

exports.handler = async function (event, context) {
  console.log('=== submit-approval called ===');
  
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'Method Not Allowed' 
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  // --- LOGIKA DIPERBARUI ---
  // Kita mengharapkan data JSON lengkap, bukan hanya signature
  const { token, persetujuanData } = body; 

  if (!token || !persetujuanData) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Token dan persetujuanData wajib diisi' })
    };
  }

  console.log('Submitting approval for token:', token);

  try {
    // Cek status pasien
    const currentStatus = await db.query(
      'SELECT "StatusPersetujuan" FROM patients WHERE "TokenAkses" = $1',
      [token]
    );

    if (currentStatus.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Pasien tidak ditemukan' }),
      };
    }

    if (currentStatus.rows[0].StatusPersetujuan === 'Disetujui') {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Persetujuan sudah disetujui sebelumnya' }),
      };
    }

    // --- QUERY UPDATE DIPERBARUI ---
    // Sekarang kita simpan data JSON ke kolom "PersetujuanData"
    const result = await db.query(
      `UPDATE patients 
       SET 
         "StatusPersetujuan" = 'Disetujui', 
         "TimestampPersetujuan" = NOW(),
         "PersetujuanData" = $1
       WHERE "TokenAkses" = $2
       RETURNING "NomorMR", "NamaPasien", "StatusPersetujuan"`,
      [persetujuanData, token] // Simpan objek JSON
    );
    // --- AKHIR QUERY UPDATE ---

    const patient = result.rows[0];
    console.log('Approval updated for:', patient.NamaPasien);
    
    // --- PDF GENERATION DIHAPUS DARI SINI ---
    // (Ini akan ditangani oleh generate-pdf.js untuk admin)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Persetujuan berhasil disimpan',
        patient: patient
      }),
    };
  } catch (error) {
    console.error('Error submitting approval:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Gagal menyimpan persetujuan',
        details: error.message 
      }),
    };
  }
  // 'finally' dengan client.release() tidak diperlukan
  // karena kita menggunakan 'db.query' dari utility
};

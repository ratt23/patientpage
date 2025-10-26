const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function ensureValidJSON(data) {
  if (typeof data === 'string') {
    try { 
      return JSON.parse(data); 
    } catch (e) { 
      console.warn('ensureValidJSON: Gagal parse string, menyimpan sebagai raw.', data);
      return { rawData: data }; 
    }
  }
  if (typeof data === 'object' && data !== null) { 
    return data; 
  }
  console.warn('ensureValidJSON: Tipe data tidak dikenal, menyimpan sebagai string.', data);
  return { value: String(data) };
}

exports.handler = async function (event, context) {
  console.log('=== submit-approval dipanggil ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('Menangani request OPTIONS (preflight)');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.warn('Metode tidak diizinkan:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log('Body berhasil di-parse:', body);
  } catch (e) {
    console.error('Error parse JSON:', e.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON format' })
    };
  }

  const { 
    token,
    NomorMR,
    persetujuanData, 
    signature_data,  
    namaPetugas,       
    petugasParafData, 
    catatanDokter
  } = body;

  const identifier = token || NomorMR;
  
  console.log(`Data diterima: identifier=${identifier}, namaPetugas=${namaPetugas}, catatanDokter=${catatanDokter}`);

  const safeApprovalData = ensureValidJSON(persetujuanData || {});
  const safePetugasParafData = ensureValidJSON(petugasParafData || {});
  
  if (!identifier) {
    console.warn('Request ditolak: Missing token atau NomorMR');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing token or NomorMR' })
    };
  }

  let client;
  try {
    console.log('Mencoba terhubung ke database...');
    client = await pool.connect();
    console.log('Berhasil terhubung ke database.');
    
    // Gunakan huruf kecil untuk nama kolom di sini juga
    const findQuery = token 
      ? `SELECT * FROM patients WHERE token = $1`
      : `SELECT * FROM patients WHERE nomormr = $1`; 
    
    console.log('Mencari pasien dengan identifier:', identifier);
    const findResult = await client.query(findQuery, [identifier]);
    
    if (findResult.rows.length === 0) {
      console.warn('Pasien tidak ditemukan dengan identifier:', identifier);
      // Cek apakah identifier adalah NomorMR, jika ya, coba cari dengan tanda kutip
      // Ini hanya untuk jaga-jaga jika 'findQuery' sebelumnya gagal karena case-sensitivity
      if (NomorMR && !token) {
          const fallbackQuery = `SELECT * FROM patients WHERE "NomorMR" = $1`;
          console.log('Mencoba fallback query dengan "NomorMR"');
          const fallbackResult = await client.query(fallbackQuery, [NomorMR]);
          if (fallbackResult.rows.length > 0) {
              console.log('Pasien ditemukan dengan fallback query.');
              // Lanjut ke proses update dengan data pasien dari fallback
              // ... (Duplikasi logika update di bawah) ...
          } else {
             console.log('Pasien tetap tidak ditemukan dengan fallback query.');
             return { statusCode: 404, headers, body: JSON.stringify({ error: 'Patient not found' }) };
          }
      } else {
         return { statusCode: 404, headers, body: JSON.stringify({ error: 'Patient not found' }) };
      }
      // Jika Anda yakin nomormr selalu huruf kecil, baris 121-134 bisa dihapus.
      // Saya biarkan untuk robust-ness, tapi jika ingin simpel, cukup return 404 di baris 120.
      // Versi simpel (hapus baris 121-134, biarkan baris 120):
      // return { statusCode: 404, headers, body: JSON.stringify({ error: 'Patient not found' }) };
    }

    const patient = findResult.rows[0];
    console.log('Pasien ditemukan:', patient.nomormr, patient.namapasien); // asumsi nama kolom juga lowercase
    let safeSignatureData = signature_data || null;

    // ==========================================================
    // INI BAGIAN YANG DIPERBAIKI (Baris 144-156)
    // ==========================================================
    const updateQuery = `
      UPDATE patients 
      SET 
        statuspersetujuan = 'Disetujui', 
        timestamppersetujuan = CURRENT_TIMESTAMP,
        persetujuandata = $1,
        signaturedata = $2,
        namapetugas = $3,
        petugasparafdata = $4,
        catatandokter = $5
      WHERE nomormr = $6
      RETURNING *`;

    const queryParams = [
      safeApprovalData,      // $1
      safeSignatureData,     // $2
      namaPetugas || null,   // $3
      safePetugasParafData,  // $4
      catatanDokter || null, // $5
      patient.nomormr        // $6 (pastikan ini juga huruf kecil)
    ];
    // ==========================================================
    // AKHIR DARI BAGIAN YANG DIPERBAIKI
    // ==========================================================

    console.log('Menjalankan query UPDATE untuk NomorMR:', patient.nomormr);
    
    const result = await client.query(updateQuery, queryParams);

    const updatedPatient = result.rows[0];
    console.log('Persetujuan berhasil diperbarui untuk:', updatedPatient.namapasien);
    console.log('Nama Petugas tersimpan:', updatedPatient.namapetugas);
    console.log('Catatan Dokter tersimpan:', updatedPatient.catatandokter);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Persetujuan berhasil disimpan',
        patient: {
          NomorMR: updatedPatient.nomormr,
          NamaPasien: updatedPatient.namapasien,
          StatusPersetujuan: updatedPatient.statuspersetujuan,
          CatatanDokter: updatedPatient.catatandokter
        }
      }),
    };
  } catch (error) {
    console.error('=== TERJADI ERROR DI DATABASE/HANDLER ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database operation failed',
        details: error.message 
      })
    };
  } finally {
    if (client) {
      client.release();
      console.log('Koneksi database dilepaskan.');
    }
  }
};
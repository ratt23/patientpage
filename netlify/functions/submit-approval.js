const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function ensureValidJSON(data) {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return { rawData: data }; }
  }
  if (typeof data === 'object' && data !== null) { return data; }
  return { value: String(data) };
}

exports.handler = async function (event, context) {
  console.log('=== submit-approval called ===');
  
  // ... (Kode OPTIONS dan Method Check tidak berubah)

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) { /* ... (Error JSON handling) ... */ }

  // --- PERUBAHAN: Ambil data baru 'catatanDokter' ---
  const { 
    token,
    NomorMR,
    persetujuanData, 
    signature_data,  
    namaPetugas,       
    petugasParafData, 
    catatanDokter     // <-- TAMBAHKAN INI
  } = body;
  // --- AKHIR PERUBAHAN ---

  const identifier = token || NomorMR;
  const safeApprovalData = ensureValidJSON(persetujuanData || {});
  const safePetugasParafData = ensureValidJSON(petugasParafData || {});
  
  if (!identifier) { /* ... (Error identifier handling) ... */ }

  let client;
  try {
    client = await pool.connect();
    
    // ... (Kode pengecekan pasien tidak berubah)
    
    let safeSignatureData = signature_data || null;

    // --- PERUBAHAN: Query UPDATE ditambah kolom 'CatatanDokter' ---
    const updateQuery = `
      UPDATE patients 
      SET 
        "StatusPersetujuan" = 'Disetujui', 
        "TimestampPersetujuan" = CURRENT_TIMESTAMP,
        "PersetujuanData" = $1,
        "SignatureData" = $2,
        "NamaPetugas" = $3,
        "PetugasParafData" = $4,
        "CatatanDokter" = $5        // <-- TAMBAHKAN INI
      WHERE "NomorMR" = $6          // <-- Ubah nomor parameter
      RETURNING *`;

    console.log('Executing update with petugas and catatan data...');
    const result = await client.query(updateQuery, [
      safeApprovalData,      // $1
      safeSignatureData,     // $2
      namaPetugas || null,     // $3
      safePetugasParafData,   // $4
      catatanDokter || null,   // $5 <-- TAMBAHKAN INI
      patient.NomorMR        // $6 <-- Ubah nomor parameter
    ]);
    // --- AKHIR PERUBAHAN ---

    const updatedPatient = result.rows[0];
    console.log('Approval updated for:', updatedPatient.NamaPasien);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ /* ... (Respons tidak berubah) ... */ }),
    };
  } catch (error) {
     // ... (Error handling)
  } finally {
     // ... (Client release)
  }
};
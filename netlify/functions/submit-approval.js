// D:\patient-app\netlify\functions\submit-approval.js

const { Pool } = require('pg');
const { PDFDocument, rgb } = require('pdf-lib');

// --- PERBAIKAN SSL ---

// 1. Ambil URL database dari environment
const dbUrl = process.env.DATABASE_URL;

// 2. Bersihkan query params (?sslmode=... dll.) dari URL
//    Ini untuk menghindari konflik dengan pengaturan SSL di bawah
const cleanDbUrl = dbUrl.split('?')[0]; 

// 3. Konfigurasi Pool secara eksplisit
const poolConfig = {
  connectionString: cleanDbUrl, // Gunakan URL yang sudah bersih
  ssl: {
    rejectUnauthorized: false // Tentukan SSL secara eksplisit di sini
  }
};

// 4. Buat Pool dengan konfigurasi baru
const pool = new Pool(poolConfig);

// --- AKHIR PERBAIKAN SSL ---

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

  const { NomorMR, signature_data } = body;

  if (!NomorMR) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'NomorMR is required' })
    };
  }

  console.log('Submitting approval for NomorMR:', NomorMR);

  let client;

  try {
    client = await pool.connect();
    console.log('Database connected, updating approval status...');
    
    // First, check current status
    const currentStatus = await client.query(
      'SELECT "StatusPersetujuan" FROM patients WHERE "NomorMR" = $1',
      [NomorMR]
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

    // Update approval status
    const result = await client.query(
      `UPDATE patients 
       SET "StatusPersetujuan" = 'Disetujui', "TimestampPersetujuan" = CURRENT_TIMESTAMP 
       WHERE "NomorMR" = $1 
       RETURNING *`,
      [NomorMR]
    );

    const patient = result.rows[0];
    console.log('Approval updated for:', patient.NamaPasien);
    
    // Generate PDF bukti persetujuan
    console.log('Generating PDF...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    
    page.drawText('BUKTI PERSETUJUAN TINDAKAN OPERASI', { x: 50, y: height - 60, size: 18, color: rgb(0, 0, 0), });
    page.drawText(`Nama Pasien: ${patient.NamaPasien}`, { x: 50, y: height - 100, size: 12, });
    page.drawText(`Nomor MR: ${patient.NomorMR}`, { x: 50, y: height - 120, size: 12, });
    if (patient.JadwalOperasi) {
      page.drawText(`Jadwal Operasi: ${new Date(patient.JadwalOperasi).toLocaleDateString('id-ID')}`, { x: 50, y: height - 140, size: 12, });
    }
    page.drawText(`Status Persetujuan: ${patient.StatusPersetujuan}`, { x: 50, y: height - 160, size: 12, });
    page.drawText(`Tanggal Persetujuan: ${new Date().toLocaleString('id-ID')}`, { x: 50, y: height - 180, size: 12, });
    page.drawText('Tanda Tangan Pasien/Keluarga:', { x: 50, y: height - 220, size: 12, });
    page.drawText('[Tanda tangan tersedia dalam sistem]', { x: 50, y: height - 240, size: 10, color: rgb(0.5, 0.5, 0.5), });

    const pdfBytes = await pdfDoc.saveAsBase64();
    
    console.log('PDF generated successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Persetujuan berhasil disimpan',
        pdf_data: pdfBytes,
        patient: {
          NomorMR: patient.NomorMR,
          NamaPasien: patient.NamaPasien,
          StatusPersetujuan: patient.StatusPersetujuan,
          TimestampPersetujuan: patient.TimestampPersetujuan
        }
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
  } finally {
    if (client) {
      client.release();
      console.log('Client released');
    }
  }
};
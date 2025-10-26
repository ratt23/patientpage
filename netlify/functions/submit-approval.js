// D:\patient-app\netlify\functions\submit-approval.js

const { Pool } = require('pg');
const { PDFDocument, rgb } = require('pdf-lib');

// Konfigurasi database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async function (event, context) {
  console.log('=== submit-approval called ===');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log('Received body:', JSON.stringify(body, null, 2));
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return {
      statusCode: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Invalid JSON body',
        details: e.message 
      })
    };
  }

  // FLEXIBLE DATA HANDLING - terima berbagai format
  const { 
    token,           // Format baru (dari patient app)
    persetujuanData, // Format baru  
    NomorMR,         // Format lama
    signature_data,  // Format lama
    // Tambahan fields yang mungkin dikirim
    patientData,
    formData,
    consentData
  } = body;

  // Tentukan identifier yang akan digunakan
  const identifier = token || NomorMR;
  const approvalData = persetujuanData || signature_data || patientData || formData || consentData || body;

  console.log('Using identifier:', identifier);
  console.log('Using approval data:', approvalData);

  if (!identifier) {
    return {
      statusCode: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Token/NomorMR wajib diisi',
        receivedFields: Object.keys(body),
        suggestion: 'Pastikan mengirim "token" atau "NomorMR" dalam request body'
      })
    };
  }

  console.log('Processing approval for:', identifier);

  let client;

  try {
    client = await pool.connect();
    console.log('Database connected successfully');
    
    // CEK PASIEN DENGAN FLEKSIBEL - coba kedua identifier
    let currentStatus;
    
    // Coba dengan TokenAkses dulu (untuk patient app)
    currentStatus = await client.query(
      'SELECT "StatusPersetujuan", "NamaPasien", "NomorMR", "JadwalOperasi" FROM patients WHERE "TokenAkses" = $1',
      [identifier]
    );

    // Jika tidak ketemu, coba dengan NomorMR
    if (currentStatus.rows.length === 0) {
      currentStatus = await client.query(
        'SELECT "StatusPersetujuan", "NamaPasien", "NomorMR", "JadwalOperasi" FROM patients WHERE "NomorMR" = $1',
        [identifier]
      );
    }

    if (currentStatus.rows.length === 0) {
      console.log('Patient not found for identifier:', identifier);
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Pasien tidak ditemukan',
          identifier: identifier
        }),
      };
    }

    const patient = currentStatus.rows[0];
    
    if (patient.StatusPersetujuan === 'Disetujui') {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Persetujuan sudah disetujui sebelumnya',
          patient: patient.NamaPasien
        }),
      };
    }

    // UPDATE DATA - gunakan identifier yang berhasil
    const updateQuery = `
      UPDATE patients 
      SET 
        "StatusPersetujuan" = 'Disetujui', 
        "TimestampPersetujuan" = CURRENT_TIMESTAMP,
        "PersetujuanData" = $1,
        "SignatureData" = $2
      WHERE "NomorMR" = $3
      RETURNING *`;

    const result = await client.query(updateQuery, [
      approvalData, 
      signature_data || null, 
      patient.NomorMR
    ]);

    const updatedPatient = result.rows[0];
    console.log('Approval updated for:', updatedPatient.NamaPasien);
    
    // GENERATE PDF (opsional - bisa dihapus jika tidak diperlukan)
    console.log('Generating PDF...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    
    // Konten PDF
    page.drawText('BUKTI PERSETUJUAN TINDAKAN OPERASI', { 
      x: 50, y: height - 60, size: 18, color: rgb(0, 0, 0) 
    });
    page.drawText(`Nama Pasien: ${updatedPatient.NamaPasien}`, { 
      x: 50, y: height - 100, size: 12 
    });
    page.drawText(`Nomor MR: ${updatedPatient.NomorMR}`, { 
      x: 50, y: height - 120, size: 12 
    });
    
    if (updatedPatient.JadwalOperasi) {
      page.drawText(`Jadwal Operasi: ${new Date(updatedPatient.JadwalOperasi).toLocaleDateString('id-ID')}`, { 
        x: 50, y: height - 140, size: 12 
      });
    }
    
    page.drawText(`Status Persetujuan: ${updatedPatient.StatusPersetujuan}`, { 
      x: 50, y: height - 160, size: 12 
    });
    page.drawText(`Tanggal Persetujuan: ${new Date().toLocaleString('id-ID')}`, { 
      x: 50, y: height - 180, size: 12 
    });
    
    // Tambahkan data persetujuan ke PDF jika ada
    if (approvalData && typeof approvalData === 'object') {
      page.drawText('Data Persetujuan:', { 
        x: 50, y: height - 210, size: 12 
      });
      
      let yPos = height - 230;
      Object.entries(approvalData).forEach(([key, value]) => {
        if (yPos > 100) { // Prevent overflow
          const text = `${key}: ${JSON.stringify(value).substring(0, 50)}...`;
          page.drawText(text, { x: 50, y: yPos, size: 10 });
          yPos -= 15;
        }
      });
    }

    const pdfBytes = await pdfDoc.saveAsBase64();
    console.log('PDF generated successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: 'Persetujuan berhasil disimpan',
        pdf_data: pdfBytes, // Opsional - bisa dihapus
        patient: {
          NomorMR: updatedPatient.NomorMR,
          NamaPasien: updatedPatient.NamaPasien,
          StatusPersetujuan: updatedPatient.StatusPersetujuan,
          TimestampPersetujuan: updatedPatient.TimestampPersetujuan
        }
      }),
    };
  } catch (error) {
    console.error('Error submitting approval:', error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Gagal menyimpan persetujuan',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
  }
};
// patient-app/src/components/PatientPage.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <-- useParams sudah di-import
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css';

const PatientPage = () => {
  // --- PERUBAHAN: Ambil 'token', bukan 'NomorMR' ---
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const signatureContainerRef = useRef(null);
  const [consentChecks, setConsentChecks] = useState({
    check1: false, check2: false, check3: false,
    check4: false, check5: false, check6: false,
  });

  const sections = [
    'informasi-pasien', 'persiapan-mental', 'persiapan-fisik',
    'pencegahan-infeksi', 'pengelolaan-nyeri', 'persetujuan'
  ];

  // Efek untuk Canvas (tidak berubah)
  useLayoutEffect(() => {
    const updateCanvasWidth = () => {
      if (signatureContainerRef.current) {
        setCanvasWidth(signatureContainerRef.current.offsetWidth);
      }
    };
    updateCanvasWidth();
    window.addEventListener('resize', updateCanvasWidth);
    return () => window.removeEventListener('resize', updateCanvasWidth);
  }, [signatureContainerRef]);

  // Efek untuk mengambil data pasien
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // --- PERUBAHAN: Gunakan 'token' di URL query ---
        const response = await axios.get(`/.netlify/functions/get-patient-details?token=${token}`);
        if (response.data.StatusPersetujuan === 'Disetujui') {
          alert('E-booklet ini sudah disetujui sebelumnya.');
          navigate('/terima-kasih');
        }
        setPatient(response.data);
      } catch (error) {
        console.error('Error fetching patient:', error);
        alert('Data pasien tidak ditemukan');
      }
    };
    fetchPatientData();
  // --- PERUBAHAN: Gunakan 'token' di dependency array ---
  }, [token, navigate]);

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setConsentChecks(prev => ({ ...prev, [name]: checked }));
  };

  const allChecked = Object.values(consentChecks).every(Boolean);

  const handleSubmit = async () => {
    if (!allChecked) {
      alert('Harap setujui semua poin pernyataan sebelum mengirim.');
      return;
    }
    if (signaturePad.isEmpty()) {
      alert('Harap berikan tanda tangan terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureData = signaturePad.toDataURL();
      // PENTING: Kita tetap mengirim 'patient.NomorMR' ke backend
      // Ini aman karena 'patient' adalah data yang kita fetch
      // menggunakan token yang aman.
      await axios.post('/.netlify/functions/submit-approval', {
        NomorMR: patient.NomorMR, 
        signature_data: signatureData
      });
      navigate('/terima-kasih');
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Gagal mengirim persetujuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => { signaturePad.clear(); };
  const nextSection = () => { if (currentSection < sections.length - 1) { setCurrentSection(currentSection + 1); window.scrollTo(0, 0); } };
  const prevSection = () => { if (currentSection > 0) { setCurrentSection(currentSection - 1); window.scrollTo(0, 0); } };

  if (!patient) {
    return ( <div className="loading-container"><div className="loading">Memuat data e-booklet...</div></div> );
  }

  return (
    <div className="patient-page">
      {/* Header */}
      <header className="ebooklet-header">
        <div className="logo-placeholder"><img src="https://via.placeholder.com/200x60?text=LOGO+ANDA" alt="Logo Rumah Sakit" /></div>
        <div className="header-text">
          <div className="document-title">
            <h1>BOOKLET PERSIAPAN OPERASI</h1><p>SURGICAL PREPARATION GUIDE</p>
          </div>
          <div className="hospital-info">
            <h2>SILOAM HOSPITALS AMBON</h2><p>Telp: (xxx) xxxx xxxx</p>
          </div>
        </div>
      </header>

      {/* Navigasi */}
      <nav className="section-nav">
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}></div></div>
        <div className="section-steps">
          <span className={currentSection >= 0 ? 'active' : ''}>Informasi</span>
          <span className={currentSection >= 1 ? 'active' : ''}>Mental</span>
          <span className={currentSection >= 2 ? 'active' : ''}>Fisik</span>
          <span className={currentSection >= 3 ? 'active' : ''}>Infeksi</span>
          <span className={currentSection >= 4 ? 'active' : ''}>Nyeri</span>
          <span className={currentSection >= 5 ? 'active' : ''}>Persetujuan</span>
        </div>
      </nav>

      {/* Wrapper Konten */}
      <div className="content-wrapper">
        
        {/* Section 1: Informasi Pasien & Jadwal */}
        {currentSection === 0 && (
          <section id="informasi-pasien" className="content-section">
            <h2>📋 INFORMASI PASIEN & JADWAL</h2>
            <div className="patient-info-grid">
              <div className="info-item"><label>Nomor MR:</label><span>{patient.NomorMR}</span></div>
              <div className="info-item"><label>Nama Pasien:</label><span>{patient.NamaPasien}</span></div>
              <div className="info-item"><label>Rencana Operasi:</label><span>{patient.JadwalOperasi ? new Date(patient.JadwalOperasi).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Akan dijadwalkan'}</span></div>
              <div className="info-item"><label>Waktu Operasi:</label><span>{patient.JadwalOperasi ? new Date(patient.JadwalOperasi).toLocaleTimeString('id-ID') : 'Menunggu konfirmasi'}</span></div>
              <div className="info-item"><label>Mulai Puasa:</label><span>{patient.JadwalPuasa ? new Date(patient.JadwalPuasa).toLocaleTimeString('id-ID') : '6 jam sebelum operasi'}</span></div>
              <div className="info-item"><label>Dokter:</label><span>{patient.Dokter || 'Akan ditentukan'}</span></div>
            </div>
            <div className="prep-category">
              <h3>📄 Dokumen yang Perlu Dibawa:</h3>
              <ul><li>Surat pengantar operasi</li><li>Laporan medis awal</li><li>Fotokopi KTP</li><li>Fotokopi kartu asuransi</li><li>Hasil laboratorium dan radiologi</li></ul>
            </div>
            <div className="section-navigation"><button onClick={nextSection} className="btn-next">Lanjut ke Persiapan Mental →</button></div>
          </section>
        )}

        {/* Section 2: Persiapan Mental & Psikologis */}
        {currentSection === 1 && (
          <section id="persiapan-mental" className="content-section">
            <h2>🧠 PERSIAPAN MENTAL & PSIKOLOGIS</h2>
            <div className="prep-category"><h3>Rasa Takut dan Cemas...</h3>{/* ... */}</div>
            <div className="prep-category"><h3>Konseling dan Dukungan...</h3>{/* ... */}</div>
            <div className="important-note"><h4>💡 Tips Mengatasi Kecemasan...</h4>{/* ... */}</div>
            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Informasi</button><button onClick={nextSection} className="btn-next">Lanjut ke Persiapan Fisik →</button></div>
          </section>
        )}

        {/* Section 3: Persiapan Fisik */}
        {currentSection === 2 && (
          <section id="persiapan-fisik" className="content-section">
            <h2>💪 PERSIAPAN FISIK</h2>
            <div className="prep-category"><h3>Persiapan Fisik...</h3>{/* ... */}</div>
            <div className="prep-category"><h3>Petunjuk Umum...</h3>{/* ... */}</div>
            <div className="reminder"><h4>📝 Yang Perlu Diinformasikan...</h4>{/* ... */}</div>
            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Mental</button><button onClick={nextSection} className="btn-next">Lanjut ke Pencegahan Infeksi →</button></div>
          </section>
        )}

        {/* Section 4: Pencegahan Infeksi */}
        {currentSection === 3 && (
          <section id="pencegahan-infeksi" className="content-section">
            <h2>🦠 PENCEGAHAN INFEKSI DAERAH OPERASI</h2>
            <div className="risk-category"><h3>Apa Itu Infeksi...</h3>{/* ... */}</div>
            <div className="prep-category"><h3>Pencegahan Sebelum Operasi...</h3>{/* ... */}</div>
            <div className="phase"><h3>Perawatan Luka...</h3>{/* ... */}</div>
            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Fisik</button><button onClick={nextSection} className="btn-next">Lanjut ke Pengelolaan Nyeri →</button></div>
          </section>
        )}

        {/* Section 5: Pengelolaan Nyeri */}
        {currentSection === 4 && (
          <section id="pengelolaan-nyeri" className="content-section">
            <h2>😣 PENGELOLAAN NYERI</h2>
            <div className="prep-category"><h3>Mengenal Nyeri...</h3>{/* ... */}</div>
            <div className="risk-category"><h3>Pengobatan Nyeri Tanpa Obat...</h3>{/* ... */}</div>
            <div className="phase"><h3>Pengobatan Nyeri dengan Obat...</h3>{/* ... */}</div>
            <div className="important-note"><h4>📊 Alat Pengukur Skor Nyeri...</h4>{/* ... */}</div>
            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Pencegahan Infeksi</button><button onClick={nextSection} className="btn-next">Lanjut ke Persetujuan Tindakan →</button></div>
          </section>
        )}

        {/* Section 6: Formulir Persetujuan */}
        {currentSection === 5 && (
          <section id="persetujuan" className="content-section consent-section">
            <h2>📝 FORMULIR PERSETUJUAN TINDAKAN</h2>
            <div className="consent-declaration">
              <div className="declaration-text">
                <p><strong>Surat Persetujuan Tindakan...</strong>{/* ... */}</p>
                <p>Saya yang bertanda tangan di bawah ini, <strong>{patient.NamaPasien}</strong> (Nomor MR: <strong>{patient.NomorMR}</strong>), ... menyatakan:</p>
                
                {/* Checkbox Persetujuan */}
                <div className="consent-points">
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check1" checked={consentChecks.check1} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Telah memahami penjelasan mengenai indikasi dan manfaat tindakan operasi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check2" checked={consentChecks.check2} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Menyetujui pelaksanaan tindakan operasi sesuai jadwal</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check3" checked={consentChecks.check3} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami risiko dan komplikasi yang mungkin terjadi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check4" checked={consentChecks.check4} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia mengikuti seluruh prosedur persiapan operasi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check5" checked={consentChecks.check5} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami tata laksana pengelolaan nyeri pasca operasi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check6" checked={consentChecks.check6} onChange={handleCheckboxChange} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia melakukan pencegahan infeksi sesuai panduan</span>
                  </label>
                </div>
              </div>

              {/* Area Tanda Tangan */}
              <div className="signature-area">
                <h3>Tanda Tangan Pasien/Penanggung Jawab</h3>
                <div className="signature-pad-container" ref={signatureContainerRef}>
                  <SignatureCanvas
                    ref={(ref) => setSignaturePad(ref)}
                    canvasProps={{ width: canvasWidth, height: 200, className: 'signature-canvas' }}
                  />
                </div>
                <div className="signature-actions"><button onClick={clearSignature} className="btn-clear">🗑️ Hapus Tanda Tangan</button></div>
                <div className="signature-details">
                  <div className="detail-item"><label>Nama Terang:</label><span>{patient.NamaPasien}</span></div>
                  <div className="detail-item"><label>Tanggal:</label><span>{new Date().toLocaleDateString('id-ID')}</span></div>
                  <div className="detail-item"><label>Waktu:</label><span>{new Date().toLocaleTimeString('id-ID')}</span></div>
                </div>
              </div>

              {/* Tombol Submit */}
              <div className="final-submission">
                <p className="confirmation-text">Persiapan yang baik selama periode operasi...</p>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !allChecked} // Tombol nonaktif jika belum allChecked
                  className="btn-submit-consent"
                >
                  {isSubmitting ? '🔄 Mengirim Persetujuan...' : '✅ SETUJU & KIRIM PERSETUJUAN'}
                </button>
              </div>
            </div>

            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Pengelolaan Nyeri</button></div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="ebooklet-footer">
        <p><strong>SILOAM HOSPITALS AMBON</strong></p>
        <p className="footer-contact">Ambulans 24 Jam: 1-500-911 | Informasi: 1-500-181</p>
      </footer>
    </div>
  );
};

export default PatientPage;
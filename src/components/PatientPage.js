import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css'; // Pastikan CSS Anda ada

// --- KOMPONEN BARU: MODAL PETUGAS ---
const PetugasModal = ({ onSubmit }) => {
  const [nama, setNama] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nama.trim()) {
      onSubmit(nama);
    } else {
      alert('Nama petugas tidak boleh kosong.');
    }
  };

  return (
    <div className="petugas-modal-overlay">
      <form className="petugas-modal-content" onSubmit={handleSubmit}>
        <h3>Verifikasi Petugas</h3>
        <p>Silakan masukkan nama Anda sebagai petugas yang mendampingi pasien.</p>
        <div className="form-group">
          <label htmlFor="namaPetugas">Nama Petugas</label>
          <input
            id="namaPetugas"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Masukkan nama lengkap Anda"
            required
          />
        </div>
        <button type="submit" className="btn-submit-petugas">
          Submit
        </button>
      </form>
    </div>
  );
};

// --- KOMPONEN BARU: PARAF PETUGAS ---
const PetugasParaf = ({ sectionKey, isChecked, onChange, isReadOnly, label }) => {
  return (
    <div className="petugas-paraf-container">
      <label className="consent-item-checkbox paraf">
        <input
          type="checkbox"
          name={sectionKey}
          checked={isChecked}
          onChange={onChange}
          disabled={isReadOnly}
        />
        <span className="custom-checkbox"></span>
        <span className="consent-text paraf-text">
          {isReadOnly 
            ? `Petugas telah memverifikasi halaman: ${label}`
            : `Saya (petugas) telah menjelaskan halaman ini kepada pasien.`
          }
        </span>
      </label>
    </div>
  );
};


const PatientPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const signatureContainerRef = useRef(null);

  // --- STATE BARU ---
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const [showPetugasModal, setShowPetugasModal] = useState(false);
  const [namaPetugas, setNamaPetugas] = useState('');
  
  // State untuk 5 paraf petugas (0-4)
  const [petugasCheckboxes, setPetugasCheckboxes] = useState({
    paraf0: false, paraf1: false, paraf2: false, paraf3: false, paraf4: false,
  });

  // State untuk 6 checkbox persetujuan pasien
  const [consentChecks, setConsentChecks] = useState({
    check1: false, check2: false, check3: false,
    check4: false, check5: false, check6: false,
  });
  // --- AKHIR STATE BARU ---

  const sections = [
    'informasi-pasien', 'persiapan-mental', 'persiapan-fisik',
    'pencegahan-infeksi', 'pengelolaan-nyeri', 'persetujuan'
  ];

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

  // --- LOGIKA FETCH DATA DIPERBARUI ---
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await axios.get(`/.netlify/functions/get-patient-details?token=${token}`);
        setPatient(response.data);
        
        if (response.data.StatusPersetujuan === 'Disetujui') {
          // --- MODE READ-ONLY ---
          setIsReadOnly(true);
          setShowPetugasModal(false); // Jangan tampilkan modal jika sudah
          
          // Isi semua data yang tersimpan
          setNamaPetugas(response.data.NamaPetugas || 'Petugas (Arsip)');
          setConsentChecks(response.data.PersetujuanData || {});
          setPetugasCheckboxes(response.data.PetugasParafData || {});
          setSavedSignature(response.data.SignatureData || null);
          
          // JANGAN auto-navigate ke halaman terakhir
          // setCurrentSection(sections.length - 1); <-- DIHAPUS
        } else {
          // --- MODE MENGISI BARU ---
          setIsReadOnly(false);
          setShowPetugasModal(true); // Tampilkan modal petugas
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
        alert('Data pasien tidak ditemukan');
      }
    };
    fetchPatientData();
  }, [token]);
  // --- AKHIR LOGIKA FETCH DATA ---

  // Handler untuk checkbox persetujuan pasien
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setConsentChecks(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handler untuk checkbox paraf petugas
  const handlePetugasCheckChange = (e) => {
    const { name, checked } = e.target;
    setPetugasCheckboxes(prev => ({ ...prev, [name]: checked }));
  };

  const allConsentChecked = Object.values(consentChecks).every(Boolean);

  // Handler untuk submit modal petugas
  const handlePetugasSubmit = (nama) => {
    setNamaPetugas(nama);
    setShowPetugasModal(false);
  };

  // --- LOGIKA SUBMIT DIPERBARUI ---
  const handleSubmit = async () => {
    if (!allConsentChecked) {
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
      
      await axios.post('/.netlify/functions/submit-approval', {
        NomorMR: patient.NomorMR, 
        signature_data: signatureData,
        persetujuanData: consentChecks,
        namaPetugas: namaPetugas,           // Data baru
        petugasParafData: petugasCheckboxes // Data baru
      });
      
      navigate('/terima-kasih');
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Gagal mengirim persetujuan: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- AKHIR LOGIKA SUBMIT ---

  const clearSignature = () => { signaturePad.clear(); };
  const nextSection = () => { if (currentSection < sections.length - 1) { setCurrentSection(currentSection + 1); window.scrollTo(0, 0); } };
  const prevSection = () => { if (currentSection > 0) { setCurrentSection(currentSection - 1); window.scrollTo(0, 0); } };

  // --- LOGIKA RENDER BARU ---
  
  // 1. Tampilkan modal jika diperlukan
  if (showPetugasModal) {
    return <PetugasModal onSubmit={handlePetugasSubmit} />;
  }

  // 2. Tampilkan loading jika data pasien belum ada
  if (!patient) {
    return ( <div className="loading-container"><div className="loading">Memuat data e-booklet...</div></div> );
  }

  // 3. Tampilkan halaman e-booklet
  return (
    <div className="patient-page">
      <header className="ebooklet-header">
        <div className="logo-placeholder"><img src="https://via.placeholder.com/200x60?text=LOGO+ANDA" alt="Logo Rumah Sakit" /></div>
        <div className="header-text">
          <div className="document-title">
            <h1>BOOKLET PERSIAPAN OPERASI</h1><p>SURGICAL PREPARATION GUIDE</p>
          </div>
          <div className="hospital-info">
            <h2>SILOAM HOSPITALS AMBON</h2><p>Telp: (xxx) xxxx xxxx</p>
            {/* Tampilkan nama petugas jika sudah di-set */}
            {namaPetugas && <p style={{ color: '#ffcf0b', fontWeight: 'bold' }}>Petugas: {namaPetugas}</p>}
          </div>
        </div>
      </header>

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
            {/* ... (Konten lainnya) ... */}
            <PetugasParaf
              sectionKey="paraf0"
              isChecked={petugasCheckboxes.paraf0}
              onChange={handlePetugasCheckChange}
              isReadOnly={isReadOnly}
              label="Informasi Pasien"
            />
            <div className="section-navigation">
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf0 && !isReadOnly}>
                Lanjut ke Persiapan Mental →
              </button>
            </div>
          </section>
        )}

        {/* Section 2: Persiapan Mental & Psikologis */}
        {currentSection === 1 && (
          <section id="persiapan-mental" className="content-section">
            <h2>🧠 PERSIAPAN MENTAL & PSIKOLOGIS</h2>
            {/* ... (Konten Anda) ... */}
            <PetugasParaf
              sectionKey="paraf1"
              isChecked={petugasCheckboxes.paraf1}
              onChange={handlePetugasCheckChange}
              isReadOnly={isReadOnly}
              label="Persiapan Mental"
            />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Informasi</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf1 && !isReadOnly}>
                Lanjut ke Persiapan Fisik →
              </button>
            </div>
          </section>
        )}

        {/* Section 3: Persiapan Fisik */}
        {currentSection === 2 && (
          <section id="persiapan-fisik" className="content-section">
            <h2>💪 PERSIAPAN FISIK</h2>
            {/* ... (Konten Anda) ... */}
            <PetugasParaf
              sectionKey="paraf2"
              isChecked={petugasCheckboxes.paraf2}
              onChange={handlePetugasCheckChange}
              isReadOnly={isReadOnly}
              label="Persiapan Fisik"
            />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Mental</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf2 && !isReadOnly}>
                Lanjut ke Pencegahan Infeksi →
              </button>
            </div>
          </section>
        )}

        {/* Section 4: Pencegahan Infeksi */}
        {currentSection === 3 && (
          <section id="pencegahan-infeksi" className="content-section">
            <h2>🦠 PENCEGAHAN INFEKSI DAERAH OPERASI</h2>
            {/* ... (Konten Anda) ... */}
            <PetugasParaf
              sectionKey="paraf3"
              isChecked={petugasCheckboxes.paraf3}
              onChange={handlePetugasCheckChange}
              isReadOnly={isReadOnly}
              label="Pencegahan Infeksi"
            />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Fisik</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf3 && !isReadOnly}>
                Lanjut ke Pengelolaan Nyeri →
              </button>
            </div>
          </section>
        )}

        {/* Section 5: Pengelolaan Nyeri */}
        {currentSection === 4 && (
          <section id="pengelolaan-nyeri" className="content-section">
            <h2>😣 PENGELOLAAN NYERI</h2>
            {/* ... (Konten Anda) ... */}
            <PetugasParaf
              sectionKey="paraf4"
              isChecked={petugasCheckboxes.paraf4}
              onChange={handlePetugasCheckChange}
              isReadOnly={isReadOnly}
              label="Pengelolaan Nyeri"
            />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Pencegahan Infeksi</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf4 && !isReadOnly}>
                Lanjut ke Persetujuan Tindakan →
              </button>
            </div>
          </section>
        )}

        {/* Section 6: Formulir Persetujuan */}
        {currentSection === 5 && (
          <section id="persetujuan" className="content-section consent-section">
            <h2>📝 FORMULIR PERSETUJUAN TINDAKAN</h2>
            <div className="consent-declaration">
              <div className="declaration-text">
                <p>Saya yang bertanda tangan di bawah ini, <strong>{patient.NamaPasien}</strong> (Nomor MR: <strong>{patient.NomorMR}</strong>), ... dengan ini menyatakan:</p>
                
                <div className="consent-points">
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check1" checked={consentChecks.check1} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Telah memahami penjelasan...</span>
                  </label>
                  {/* ... (Checkbox 2 s/d 6 lainnya) ... */}
                   <label className="consent-item-checkbox">
                    <input type="checkbox" name="check2" checked={consentChecks.check2} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Menyetujui pelaksanaan tindakan...</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check3" checked={consentChecks.check3} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami risiko dan komplikasi...</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check4" checked={consentChecks.check4} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia mengikuti seluruh prosedur...</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check5" checked={consentChecks.check5} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami tata laksana pengelolaan nyeri...</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check6" checked={consentChecks.check6} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia melakukan pencegahan infeksi...</span>
                  </label>
                </div>
              </div>

              <div className="signature-area">
                <h3>Tanda Tangan Pasien/Penanggung Jawab</h3>
                
                {/* --- PERBAIKAN BUG GAMBAR TTD --- */}
                {isReadOnly && savedSignature ? (
                  <div className="saved-signature-container" style={{ textAlign: 'center', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px' }}>
                    <img src={savedSignature} alt="Tanda Tangan Tersimpan" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px' }} />
                    <p style={{ fontStyle: 'italic', color: '#555', fontSize: '14px', marginTop: '10px' }}>
                      Telah ditandatangani pada: {new Date(patient.TimestampPersetujuan).toLocaleString('id-ID')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="signature-pad-container" ref={signatureContainerRef}>
                      <SignatureCanvas
                        ref={(ref) => setSignaturePad(ref)}
                        canvasProps={{ width: canvasWidth, height: 200, className: 'signature-canvas' }}
                      />
                    </div>
                    <div className="signature-actions"><button onClick={clearSignature} className="btn-clear">🗑️ Hapus Tanda Tangan</button></div>
                  </>
                )}
                
                <div className="signature-details">
                  <div className="detail-item"><label>Nama Terang:</label><span>{patient.NamaPasien}</span></div>
                  <div className="detail-item"><label>Tanggal:</label><span>{isReadOnly ? new Date(patient.TimestampPersetujuan).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID')}</span></div>
                  <div className="detail-item"><label>Waktu:</label><span>{isReadOnly ? new Date(patient.TimestampPersetujuan).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID')}</span></div>
                </div>
              </div>

              <div className="final-submission">
                <p className="confirmation-text">
                  {isReadOnly 
                    ? "Dokumen ini telah disetujui dan diarsipkan. Anda dapat melihat kembali informasi ini kapan saja."
                    : "Dengan mengirim persetujuan ini, saya menyatakan telah memahami semua informasi yang diberikan."
                  }
                </p>
                
                {!isReadOnly && (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !allConsentChecked}
                    className="btn-submit-consent"
                  >
                    {isSubmitting ? '🔄 Mengirim Persetujuan...' : '✅ SETUJU & KIRIM PERSETUJUAN'}
                  </button>
                )}
              </div>
            </div>

            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Pengelolaan Nyeri</button></div>
          </section>
        )}
      </div>

      <footer className="ebooklet-footer">
        {/* ... (Konten footer) ... */}
      </footer>
    </div>
  );
};

export default PatientPage;
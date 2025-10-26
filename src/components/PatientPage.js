import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css';

// --- Komponen Modal Petugas (Tidak Berubah) ---
const PetugasModal = ({ onSubmit }) => {
  const [nama, setNama] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (nama.trim()) { onSubmit(nama); } else { alert('Nama petugas tidak boleh kosong.'); }
  };
  return (
    <div className="petugas-modal-overlay">
      <form className="petugas-modal-content" onSubmit={handleSubmit}>
        <h3>Verifikasi Petugas</h3>
        <p>Silakan masukkan nama Anda sebagai petugas yang mendampingi pasien.</p>
        <div className="form-group">
          <label htmlFor="namaPetugas">Nama Petugas</label>
          <input
            id="namaPetugas" type="text" value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Masukkan nama lengkap Anda" required
          />
        </div>
        <button type="submit" className="btn-submit-petugas">Submit</button>
      </form>
    </div>
  );
};

// --- Komponen Paraf Petugas (Tidak Berubah) ---
const PetugasParaf = ({ sectionKey, isChecked, onChange, isReadOnly, label }) => {
  return (
    <div className="petugas-paraf-container">
      <label className="consent-item-checkbox paraf">
        <input
          type="checkbox" name={sectionKey} checked={isChecked}
          onChange={onChange} disabled={isReadOnly}
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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const [showPetugasModal, setShowPetugasModal] = useState(false);
  const [namaPetugas, setNamaPetugas] = useState('');
  
  const [petugasCheckboxes, setPetugasCheckboxes] = useState({
    paraf0: false, paraf1: false, paraf2: false, paraf3: false, paraf4: false,
  });
  const [consentChecks, setConsentChecks] = useState({
    check1: false, check2: false, check3: false,
    check4: false, check5: false, check6: false,
  });

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

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await axios.get(`/.netlify/functions/get-patient-details?token=${token}`);
        setPatient(response.data);
        
        if (response.data.StatusPersetujuan === 'Disetujui') {
          setIsReadOnly(true);
          setShowPetugasModal(false); 
          setNamaPetugas(response.data.NamaPetugas || 'Petugas (Arsip)');
          setConsentChecks(response.data.PersetujuanData || {});
          setPetugasCheckboxes(response.data.PetugasParafData || {});
          setSavedSignature(response.data.SignatureData || null);
        } else {
          setIsReadOnly(false);
          setShowPetugasModal(true);
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
        alert('Data pasien tidak ditemukan');
      }
    };
    fetchPatientData();
  }, [token]);

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setConsentChecks(prev => ({ ...prev, [name]: checked }));
  };
  
  const handlePetugasCheckChange = (e) => {
    const { name, checked } = e.target;
    setPetugasCheckboxes(prev => ({ ...prev, [name]: checked }));
  };

  const allConsentChecked = Object.values(consentChecks).every(Boolean);

  const handlePetugasSubmit = (nama) => {
    setNamaPetugas(nama);
    setShowPetugasModal(false);
  };

  const handleSubmit = async () => {
    if (!allConsentChecked) {
      alert('Harap setujui semua poin pernyataan sebelum mengirim.'); return;
    }
    const allPetugasChecked = Object.values(petugasCheckboxes).every(Boolean);
    if (!allPetugasChecked) {
      alert('Harap petugas memverifikasi (mencentang) semua halaman sebelum submit.'); return;
    }
    if (signaturePad.isEmpty()) {
      alert('Harap berikan tanda tangan terlebih dahulu'); return;
    }

    setIsSubmitting(true);
    try {
      const signatureData = signaturePad.toDataURL();
      await axios.post('/.netlify/functions/submit-approval', {
        NomorMR: patient.NomorMR, 
        token: token, // Kirim token juga untuk identifikasi
        signature_data: signatureData,
        persetujuanData: consentChecks,
        namaPetugas: namaPetugas,
        petugasParafData: petugasCheckboxes
      });
      navigate('/terima-kasih');
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Gagal mengirim persetujuan: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => { signaturePad.clear(); };
  const nextSection = () => { if (currentSection < sections.length - 1) { setCurrentSection(currentSection + 1); window.scrollTo(0, 0); } };
  const prevSection = () => { if (currentSection > 0) { setCurrentSection(currentSection - 1); window.scrollTo(0, 0); } };

  if (showPetugasModal) {
    return <PetugasModal onSubmit={handlePetugasSubmit} />;
  }

  if (!patient) {
    return ( <div className="loading-container"><div className="loading">Memuat data e-booklet...</div></div> );
  }

  return (
    <div className="patient-page">
      {/* --- PERUBAHAN STRUKTUR HEADER & LOGO --- */}
      <header className="ebooklet-header">
        {/* Logo dipindah ke sini. Path /asset... berasumsi 'asset' ada di folder 'public' */}
        <img src="/asset/logoputih.png" alt="Logo Rumah Sakit" className="hospital-logo" />
        
        <div className="header-text-block">
          <div className="document-title">
            <h1>BOOKLET PERSIAPAN OPERASI</h1>
            <p>SURGICAL PREPARATION GUIDE</p>
          </div>
          <div className="hospital-info">
            {/* Nama Petugas dipindah ke sini */}
            {namaPetugas && (
              <p className="petugas-info">
                Petugas: {namaPetugas}
              </p>
            )}
          </div>
        </div>
      </header>
      {/* --- AKHIR PERUBAHAN HEADER --- */}

      <nav className="section-nav">
        {/* ... (Navigasi tidak berubah) ... */}
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
              {/* ... (Konten tidak berubah) ... */}
            </div>
            {/* ... (Konten lainnya) ... */}
            <PetugasParaf
              sectionKey="paraf0" isChecked={petugasCheckboxes.paraf0}
              onChange={handlePetugasCheckChange} isReadOnly={isReadOnly}
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
              sectionKey="paraf1" isChecked={petugasCheckboxes.paraf1}
              onChange={handlePetugasCheckChange} isReadOnly={isReadOnly}
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
              sectionKey="paraf2" isChecked={petugasCheckboxes.paraf2}
              onChange={handlePetugasCheckChange} isReadOnly={isReadOnly}
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
              sectionKey="paraf3" isChecked={petugasCheckboxes.paraf3}
              onChange={handlePetugasCheckChange} isReadOnly={isReadOnly}
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
              sectionKey="paraf4" isChecked={petugasCheckboxes.paraf4}
              onChange={handlePetugasCheckChange} isReadOnly={isReadOnly}
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
                {/* ... (Konten tidak berubah) ... */}
              </div>
                
              <div className="consent-points">
                {/* ... (Semua 6 checkbox persetujuan tidak berubah) ... */}
              </div>

              <div className="signature-area">
                <h3>Tanda Tangan Pasien/Penanggung Jawab</h3>
                
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
                  {/* ... (Konten tidak berubah) ... */}
                </div>
              </div>

              <div className="final-submission">
                {/* ... (Konten tidak berubah) ... */}
              </div>
            </div>

            <div className="section-navigation"><button onClick={prevSection} className="btn-prev">← Kembali ke Pengelolaan Nyeri</button></div>
          </section>
        )}
      </div>

      <footer className="ebooklet-footer">
        {/* ... (Footer tidak berubah) ... */}
      </footer>
    </div>
  );
};

export default PatientPage;
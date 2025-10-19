// patient-app/src/components/PatientPage.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css';

const PatientPage = () => {
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
            <div className="prep-category">
              <h3>📄 Dokumen yang Perlu Dibawa:</h3>
              <ul>
                <li>Surat pengantar operasi dari dokter</li>
                <li>Laporan medis awal dan riwayat penyakit</li>
                <li>Fotokopi KTP (pasien dan penanggung jawab)</li>
                <li>Fotokopi kartu asuransi/BPJS</li>
                <li>Hasil laboratorium dan radiologi terbaru</li>
                <li>Surat persetujuan operasi yang sudah ditandatangani</li>
              </ul>
            </div>
            <div className="section-navigation"><button onClick={nextSection} className="btn-next">Lanjut ke Persiapan Mental →</button></div>
          </section>
        )}

        {/* Section 2: Persiapan Mental & Psikologis */}
        {currentSection === 1 && (
          <section id="persiapan-mental" className="content-section">
            <h2>🧠 PERSIAPAN MENTAL & PSIKOLOGIS</h2>
            <div className="prep-category">
              <h3>Rasa Takut dan Cemas Sebelum Operasi</h3>
              <p>Munculnya perasaan takut dan cemas sebelum operasi adalah hal wajar. Beberapa hal yang sering menjadi kekhawatiran pasien:</p>
              <ul>
                <li>Takut nyeri setelah operasi</li>
                <li>Takut terjadi perubahan fisik (body image)</li>
                <li>Khawatir tentang kesembuhan dan hasil operasi</li>
                <li>Khawatir tentang biaya operasi dan perawatan</li>
                <li>Takut terhadap hal-hal yang tidak diketahui (unknown)</li>
              </ul>
              <p>Perasaan ini normal dan dapat dikelola dengan baik. Komunikasi yang terbuka dengan tim medis akan sangat membantu.</p>
            </div>
            <div className="prep-category">
              <h3>Konseling dan Dukungan</h3>
              <p>Sangat penting bagi Anda yang hendak menjalani proses operasi untuk mendapatkan dukungan dari:</p>
              <ul>
                <li><strong>Keluarga dan teman:</strong> Mereka dapat memberikan dukungan moral dan membantu dalam persiapan serta pemulihan.</li>
                <li><strong>Tim medis (dokter, perawat, psikolog):</strong> Jangan ragu untuk bertanya dan menyampaikan kekhawatiran Anda. Tim medis siap membantu dan memberikan informasi yang dibutuhkan.</li>
                <li><strong>Konseling spiritual:</strong> Jika diperlukan, Anda dapat meminta dukungan dari konselor spiritual atau pemuka agama.</li>
              </ul>
            </div>
            <div className="important-note">
              <h4>💡 Tips Mengatasi Kecemasan:</h4>
              <ul>
                <li>Diskusikan kekhawatiran dengan dokter dan keluarga</li>
                <li>Lakukan teknik relaksasi seperti napas dalam dan meditasi</li>
                <li>Jaga komunikasi dengan tim medis untuk informasi yang jelas</li>
                <li>Persiapkan diri secara fisik dan mental dengan baik</li>
                <li>Jangan ragu meminta dukungan dari orang terdekat</li>
              </ul>
            </div>
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Informasi</button>
              <button onClick={nextSection} className="btn-next">Lanjut ke Persiapan Fisik →</button>
            </div>
          </section>
        )}

        {/* Section 3: Persiapan Fisik */}
        {currentSection === 2 && (
          <section id="persiapan-fisik" className="content-section">
            <h2>💪 PERSIAPAN FISIK</h2>
            <div className="prep-category">
              <h3>Persiapan Fisik Sebelum Operasi</h3>
              <ul>
                <li>Kondisi fisik dalam keadaan sehat dan optimal</li>
                <li>Istirahat yang cukup minimal 8 jam sebelum operasi</li>
                <li>Berhenti merokok minimal 24 jam sebelum operasi</li>
                <li>Hindari konsumsi alkohol 48 jam sebelum operasi</li>
                <li>Puasa sesuai petunjuk dokter (biasanya 6-8 jam sebelum operasi)</li>
                <li>Mandi dengan sabun antiseptik yang disediakan rumah sakit</li>
              </ul>
            </div>
            <div className="prep-category">
              <h3>Petunjuk Umum Sebelum Operasi</h3>
              <ul>
                <li>Datanglah sesuai dengan jadwal yang ditentukan</li>
                <li>Pakailah pakaian yang nyaman dan mudah dibuka</li>
                <li>Lepaskan semua perhiasan, jam tangan, dan aksesoris</li>
                <li>Kosongkan kandung kemih sebelum ke ruang operasi</li>
                <li>Bawa surat-surat penting dalam satu map</li>
                <li>Pastikan ada pendamping selama proses operasi</li>
              </ul>
            </div>
            <div className="reminder">
              <h4>📝 Yang Perlu Diinformasikan ke Petugas Medis:</h4>
              <ul>
                <li>Riwayat penyakit yang diderita (hipertensi, diabetes, asma, dll)</li>
                <li>Alergi obat atau makanan tertentu</li>
                <li>Obat-obatan yang sedang dikonsumsi secara rutin</li>
                <li>Riwayat operasi sebelumnya</li>
                <li>Penyakit menular yang pernah diderita</li>
              </ul>
            </div>
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Mental</button>
              <button onClick={nextSection} className="btn-next">Lanjut ke Pencegahan Infeksi →</button>
            </div>
          </section>
        )}

        {/* Section 4: Pencegahan Infeksi */}
        {currentSection === 3 && (
          <section id="pencegahan-infeksi" className="content-section">
            <h2>🦠 PENCEGAHAN INFEKSI DAERAH OPERASI</h2>
            <div className="risk-category">
              <h3>Apa Itu Infeksi Daerah Operasi?</h3>
              <p>Infeksi daerah operasi adalah infeksi yang terjadi pada luka operasi dalam 30 hari setelah operasi. Infeksi dapat terjadi di:</p>
              <ul>
                <li>Luka insisi superfisial (kulit dan jaringan subkutan)</li>
                <li>Luka insisi dalam (otot dan fasia)</li>
                <li>Organ atau rongga tubuh yang dioperasi</li>
              </ul>
              <p><strong>Tanda-tanda infeksi:</strong></p>
              <ul>
                <li>Kemerahan dan rasa nyeri di sekitar luka</li>
                <li>Pembengkakan dan terasa hangat</li>
                <li>Keluar nanah atau cairan dari luka</li>
                <li>Demam lebih dari 38°C</li>
                <li>Bau tidak sedap dari luka</li>
              </ul>
            </div>
            <div className="prep-category">
              <h3>Pencegahan Sebelum Operasi</h3>
              <ul>
                <li>Menjaga kebersihan diri dengan mandi teratur</li>
                <li>Menggunakan sabun antiseptik yang diberikan</li>
                <li>Membersihkan area yang akan dioperasi sesuai petunjuk</li>
                <li>Memastikan tidak ada infeksi aktif di tubuh</li>
                <li>Mengikuti protokol puasa dan persiapan usus jika diperlukan</li>
              </ul>
            </div>
            <div className="phase">
              <h3>Perawatan Luka Setelah Pulang</h3>
              <ul>
                <li>3-5 hari setelah operasi: jaga luka tetap kering dan bersih</li>
                <li>Ganti balut luka sesuai jadwal yang ditentukan</li>
                <li>Cuci tangan sebelum menyentuh luka</li>
                <li>Hindari menggaruk atau memegang luka</li>
                <li>Segera hubungi dokter jika ada tanda infeksi</li>
                <li>Kontrol ulang sesuai jadwal untuk evaluasi luka</li>
              </ul>
            </div>
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Fisik</button>
              <button onClick={nextSection} className="btn-next">Lanjut ke Pengelolaan Nyeri →</button>
            </div>
          </section>
        )}

        {/* Section 5: Pengelolaan Nyeri */}
        {currentSection === 4 && (
          <section id="pengelolaan-nyeri" className="content-section">
            <h2>😣 PENGELOLAAN NYERI</h2>
            <div className="prep-category">
              <h3>Mengenal Nyeri</h3>
              <p>Nyeri adalah suatu pengalaman sensori dan emosional yang tidak menyenangkan akibat kerusakan jaringan yang actual atau potensial. Nyeri pasca operasi adalah hal normal, namun dapat dikelola dengan baik.</p>
              <p><strong>Jenis nyeri pasca operasi:</strong></p>
              <ul>
                <li>Nyeri akut: terjadi segera setelah operasi dan bersifat sementara</li>
                <li>Nyeri kronik: nyeri yang berlangsung lebih dari 3 bulan</li>
                <li>Nyeri somatic: berasal dari kulit, otot, dan tulang</li>
                <li>Nyeri visceral: berasal dari organ dalam</li>
              </ul>
            </div>
            <div className="risk-category">
              <h3>Pengobatan Nyeri Tanpa Obat</h3>
              <ul>
                <li>Teknik relaksasi dan pernapasan dalam</li>
                <li>Distraksi dengan mendengarkan musik atau menonton TV</li>
                <li>Kompres hangat atau dingin pada area nyeri</li>
                <li>Posisi tubuh yang nyaman dan perubahan posisi berkala</li>
                <li>Pijatan lembut di area sekitar luka (jika diizinkan dokter)</li>
                <li>Meditasi dan teknik mindfullness</li>
              </ul>
            </div>
            <div className="phase">
              <h3>Pengobatan Nyeri dengan Obat</h3>
              <p>Bentuk pemberian obat anti nyeri:</p>
              <ul>
                <li>Tablet atau kapsul (oral)</li>
                <li>Suntikan (intramuskular atau intravena)</li>
                <li>Patch atau plester kulit</li>
                <li>PCA (Patient Controlled Analgesia)</li>
                <li>Epidural atau spinal analgesia</li>
              </ul>
              <p><strong>Obat anti nyeri sebaiknya diminum secara teratur sesuai jadwal, bukan menunggu nyeri menjadi berat.</strong></p>
            </div>
            <div className="important-note">
              <h4>📊 Alat Pengukur Skor Nyeri</h4>
              <p>Anda akan diberikan pertanyaan oleh perawat untuk menilai tingkat nyeri menggunakan skala 0-10:</p>
              <div className="pain-scale">
                <div className="pain-level">0: Tidak Nyeri</div>
                <div className="pain-level">1-3: Nyeri Ringan (mengganggu tapi bisa diabaikan)</div>
                <div className="pain-level">4-6: Nyeri Mengganggu (mengganggu aktivitas)</div>
                <div className="pain-level">7-9: Nyeri Hebat (sangat mengganggu, sulit beraktivitas)</div>
                <div className="pain-level">10: Nyeri Sangat Hebat (terburuk yang pernah dirasakan)</div>
              </div>
              <p>Beritahu perawat jika skor nyeri Anda ≥4 untuk mendapatkan penanganan yang tepat.</p>
            </div>
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Pencegahan Infeksi</button>
              <button onClick={nextSection} className="btn-next">Lanjut ke Persetujuan Tindakan →</button>
            </div>
          </section>
        )}

        {/* Section 6: Formulir Persetujuan */}
        {currentSection === 5 && (
          <section id="persetujuan" className="content-section consent-section">
            <h2>📝 FORMULIR PERSETUJUAN TINDAKAN</h2>
            <div className="consent-declaration">
              <div className="declaration-text">
                <p><strong>Surat Persetujuan Tindakan (Informed Consent)</strong><br/>
                Dokter akan memberikan penjelasan tentang risiko, keuntungan, dan alternatif pengobatan kepada pasien dan keluarga. 
                Pasien dan keluarga dalam kondisi sadar, bebas mengambil keputusan untuk memberikan persetujuan agar tindakan operasi dapat dijalankan.</p>
                
                <p>Saya yang bertanda tangan di bawah ini, <strong>{patient.NamaPasien}</strong> (Nomor MR: <strong>{patient.NomorMR}</strong>), setelah membaca dan memahami seluruh informasi dalam booklet ini, dengan ini menyatakan:</p>
                
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

              <div className="final-submission">
                <p className="confirmation-text">Persiapan yang baik selama periode operasi akan membantu menurunkan komplikasi operasi dan mempercepat pemulihan setelah operasi. Dengan mengirim persetujuan ini, saya menyatakan telah memahami semua informasi yang diberikan.</p>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !allChecked}
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

      <footer className="ebooklet-footer">
        <p><strong>SILOAM HOSPITALS AMBON</strong></p>
        <p className="footer-contact">Ambulans 24 Jam: 1-500-911 | Informasi: 1-500-181</p>
      </footer>
    </div>
  );
};

export default PatientPage;
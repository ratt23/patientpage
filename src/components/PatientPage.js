import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css';

const PatientPage = () => {
  const { NomorMR } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Daftar section tetap sama, digunakan untuk navigasi
  const sections = [
    'informasi-pasien',
    'persiapan-mental', 
    'persiapan-fisik',
    'pencegahan-infeksi',
    'pengelolaan-nyeri',
    'persetujuan'
  ];

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await axios.get(`/.netlify/functions/get-patient-details?NomorMR=${NomorMR}`);
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
  }, [NomorMR, navigate]);

  const handleSubmit = async () => {
    if (!signaturePad.isEmpty()) {
      setIsSubmitting(true);
      try {
        const signatureData = signaturePad.toDataURL();
        await axios.post('/.netlify/functions/submit-approval', {
          NomorMR,
          signature_data: signatureData
        });
        navigate('/terima-kasih');
      } catch (error) {
        console.error('Error submitting approval:', error);
        alert('Gagal mengirim persetujuan');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      alert('Harap berikan tanda tangan terlebih dahulu');
    }
  };

  const clearSignature = () => {
    signaturePad.clear();
  };

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0); // Selalu scroll ke atas halaman saat ganti
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0); // Selalu scroll ke atas halaman saat ganti
    }
  };

  if (!patient) {
    return (
      <div className="loading-container">
        <div className="loading">Memuat data e-booklet...</div>
      </div>
    );
  }

  return (
    <div className="patient-page">
      {/* Header (Selalu Tampil) */}
      <header className="ebooklet-header">
        <div className="logo-placeholder">
          <img src="https://via.placeholder.com/200x60?text=LOGO+ANDA" alt="Logo Rumah Sakit" />
        </div>
        <div className="header-text">
          {/* --- POSISI DITUKAR --- */}
          <div className="document-title">
            <h1>BOOKLET PERSIAPAN OPERASI</h1>
            <p>SURGICAL PREPARATION GUIDE</p>
          </div>
          <div className="hospital-info">
            <h2>SILOAM HOSPITALS AMBON</h2>
            <p>Jl. Sultan Hasanudin, Hative Kecil, Kec. Sirimau, Kota Ambon, Maluku</p>
            <p>Telp: (xxx) xxxx xxxx</p>
          </div>
          {/* --- AKHIR PERUBAHAN --- */}
        </div>
      </header>

      {/* Navigation Progress (Selalu Tampil) */}
      <nav className="section-nav">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
          ></div>
        </div>
        <div className="section-steps">
          <span className={currentSection >= 0 ? 'active' : ''}>Informasi</span>
          <span className={currentSection >= 1 ? 'active' : ''}>Mental</span>
          <span className={currentSection >= 2 ? 'active' : ''}>Fisik</span>
          <span className={currentSection >= 3 ? 'active' : ''}>Infeksi</span>
          <span className={currentSection >= 4 ? 'active' : ''}>Nyeri</span>
          <span className={currentSection >= 5 ? 'active' : ''}>Persetujuan</span>
        </div>
      </nav>

      {/* Wrapper ini akan menampilkan SATU section saja 
          berdasarkan state currentSection */}
      <div className="content-wrapper">
        
        {/* Section 1: Informasi Pasien & Jadwal */}
        {currentSection === 0 && (
          <section id="informasi-pasien" className="content-section">
            <h2>📋 INFORMASI PASIEN & JADWAL</h2>
            <div className="patient-info-grid">
              <div className="info-item">
                <label>Nomor MR:</label>
                <span>{patient.NomorMR}</span>
              </div>
              <div className="info-item">
                <label>Nama Pasien:</label>
                <span>{patient.NamaPasien}</span>
              </div>
              <div className="info-item">
                <label>Rencana Operasi:</label>
                <span>
                  {patient.JadwalOperasi 
                    ? new Date(patient.JadwalOperasi).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Akan dijadwalkan'
                  }
                </span>
              </div>
              <div className="info-item">
                <label>Waktu Operasi:</label>
                <span>
                  {patient.JadwalOperasi
                    ? new Date(patient.JadwalOperasi).toLocaleTimeString('id-ID')
                    : 'Menunggu konfirmasi'
                  }
                </span>
              </div>
              <div className="info-item">
                <label>Mulai Puasa:</label>
                <span>
                  {patient.JadwalPuasa
                    ? new Date(patient.JadwalPuasa).toLocaleTimeString('id-ID')
                    : '6 jam sebelum operasi'
                  }
                </span>
              </div>
              <div className="info-item">
                <label>Dokter:</label>
                <span>{patient.Dokter || 'Akan ditentukan'}</span>
              </div>
            </div>

            <div className="prep-category">
              <h3>📄 Dokumen yang Perlu Dibawa:</h3>
              <ul>
                <li>Surat pengantar operasi</li>
                <li>Laporan medis awal</li>
                <li>Fotokopi KTP</li>
                <li>Fotokopi kartu asuransi</li>
                <li>Hasil laboratorium dan radiologi</li>
              </ul>
            </div>
            
            <div className="section-navigation">
              <button onClick={nextSection} className="btn-next">
                Lanjut ke Persiapan Mental →
              </button>
            </div>
          </section>
        )}

        {/* Section 2: Persiapan Mental & Psikologis */}
        {currentSection === 1 && (
          <section id="persiapan-mental" className="content-section">
            <h2>🧠 PERSIAPAN MENTAL & PSIKOLOGIS</h2>
            
            <div className="prep-category">
              <h3>Rasa Takut dan Cemas Sebelum Operasi</h3>
              <p>Munculnya perasaan takut dan cemas sebelum operasi adalah hal wajar. Biasanya dipicu oleh:</p>
              <ul>
                <li>Takut nyeri setelah operasi</li>
                <li>Takut terjadi perubahan fisik (body image)</li>
                <li>Takut hasil operasi keganasan</li>
                <li>Takut menghadapi ruang operasi, peralatan, dan petugas kamar operasi</li>
                <li>Takut tidak dapat sadarkan diri setelah dibius</li>
                <li>Takut operasi gagal</li>
              </ul>
            </div>

            <div className="prep-category">
              <h3>Konseling dan Dukungan</h3>
              <p>Sangat penting bagi Anda yang hendak menjalani proses operasi untuk mendapatkan konseling dan tes sukarela dari petugas terlatih setelah mendapatkan hasil pemeriksaan.</p>
            </div>

            <div className="important-note">
              <h4>💡 Tips Mengatasi Kecemasan:</h4>
              <ul>
                <li>Diskusikan kekhawatiran dengan dokter dan keluarga</li>
                <li>Pelajari prosedur yang akan dilakukan</li>
                <li>Lakukan teknik relaksasi dan pernapasan dalam</li>
                <li>Jaga komunikasi terbuka dengan tim medis</li>
              </ul>
            </div>

            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">
                ← Kembali ke Informasi
              </button>
              <button onClick={nextSection} className="btn-next">
                Lanjut ke Persiapan Fisik →
              </button>
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
                <li>Kondisi fisik dalam keadaan sehat</li>
                <li>Berhenti merokok jika Anda perokok</li>
                <li>Berhenti menggunakan obat-obatan pengencer darah kurang lebih 5-7 hari sebelum operasi</li>
                <li>Cukup istirahat</li>
                <li>Kondisi tubuh memungkinkan menjalankan operasi sesuai rekomendasi dokter</li>
              </ul>
            </div>

            <div className="prep-category">
              <h3>Petunjuk Umum Sebelum Operasi</h3>
              <ul>
                <li>Datanglah sesuai dengan jadwal yang telah ditentukan</li>
                <li>Puasa tidak makan dan minum selama kurang lebih 6 jam atau sesuai anjuran dokter</li>
                <li>Tidak mengonsumsi obat pengencer darah (antikoagulan)</li>
                <li>Jika mengonsumsi obat pengencer darah, segera informasikan ke dokter bedah</li>
                <li>Mandi menggunakan sabun antiseptik (chlorhexidine) 1 hari sebelum operasi</li>
              </ul>
            </div>

            <div className="reminder">
              <h4>📝 Yang Perlu Diinformasikan ke Petugas Medis:</h4>
              <ul>
                <li>Riwayat penyakit</li>
                <li>Kesediaan melakukan pemeriksaan sesuai rekomendasi dokter</li>
                <li>Obat-obatan yang dikonsumsi</li>
              </ul>
            </div>

            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">
                ← Kembali ke Persiapan Mental
              </button>
              <button onClick={nextSection} className="btn-next">
                Lanjut ke Pencegahan Infeksi →
              </button>
            </div>
          </section>
        )}

        {/* Section 4: Pencegahan Infeksi */}
        {currentSection === 3 && (
          <section id="pencegahan-infeksi" className="content-section">
            <h2>🦠 PENCEGAHAN INFEKSI DAERAH OPERASI</h2>
            
            <div className="risk-category">
              <h3>Apa Itu Infeksi Daerah Operasi?</h3>
              <p>Infeksi daerah operasi adalah infeksi yang terjadi karena kuman masuk dan berkembang ke dalam bagian tubuh yang sedang dioperasi atau di daerah sekitar operasi.</p>
              <p><strong>Tanda-tanda infeksi:</strong></p>
              <ul>
                <li>Kemerahan dan rasa nyeri pada luka operasi</li>
                <li>Demam ≥ 38ºC</li>
                <li>Bengkak pada sekitar luka</li>
                <li>Keluar cairan atau rembesan dari luka</li>
              </ul>
            </div>

            <div className="prep-category">
              <h3>Pencegahan Sebelum Operasi</h3>
              <ul>
                <li>Menjaga kebersihan diri, dengan mandi terlebih dahulu sebelum operasi dilakukan dan jangan menggunakan make up</li>
                <li>Jika harus melakukan pencukuran rambut area operasi, gunakan clipper agar tidak iritasi</li>
                <li>Mengganti baju yang telah disediakan oleh rumah sakit</li>
              </ul>
            </div>

            <div className="phase">
              <h3>Perawatan Luka Setelah Pulang</h3>
              <ul>
                <li>3-5 hari setelah operasi, jaga balutan agar tetap kering, utuh, dan bersih</li>
                <li>Cuci tangan sebelum dan sesudah menyentuh luka</li>
                <li>Jika balutan basah, segera cari orang yang kompeten untuk mengganti balutan</li>
                <li>Makan-makanan tinggi protein, seperti telur dan susu</li>
                <li>Segera hubungi Siloam Hospitals terdekat jika mengalami tanda-tanda infeksi</li>
              </ul>
            </div>

            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">
                ← Kembali ke Persiapan Fisik
              </button>
              <button onClick={nextSection} className="btn-next">
                Lanjut ke Pengelolaan Nyeri →
              </button>
            </div>
          </section>
        )}

        {/* Section 5: Pengelolaan Nyeri */}
        {currentSection === 4 && (
          <section id="pengelolaan-nyeri" className="content-section">
            <h2>😣 PENGELOLAAN NYERI</h2>
            
            <div className="prep-category">
              <h3>Mengenal Nyeri</h3>
              <p>Nyeri adalah suatu pengalaman sensori dan emosional yang tidak menyenangkan, yang diakibatkan oleh kerusakan jaringan yang tampak maupun tidak tampak.</p>
              <p>Hanya Anda yang dapat menjelaskan bagaimana jenis dan karakter nyeri yang dialami karena setiap orang memiliki reaksi yang berbeda-beda terhadap nyeri.</p>
            </div>

            <div className="risk-category">
              <h3>Pengobatan Nyeri Tanpa Obat</h3>
              <ul>
                <li>Teknik memiliki atau massage</li>
                <li>Posisi tidur yang nyaman</li>
                <li>Kompres dingin atau panas</li>
                <li>Relaksasi dan meditasi</li>
                <li>Teknik distraksi</li>
                <li>Relaksasi dengan musik</li>
                <li>Aromaterapi</li>
              </ul>
            </div>

            <div className="phase">
              <h3>Pengobatan Nyeri dengan Obat</h3>
              <p>Bentuk pemberian obat anti nyeri:</p>
              <ul>
                <li>Tablet</li>
                <li>Injeksi</li>
                <li>Suppositoria (melalui anus)</li>
                <li>Injeksi terus-menerus melalui infus</li>
                <li>Melalui kateter epidural</li>
              </ul>
              <p><strong>Obat anti nyeri sebaiknya diminum secara teratur 3-4 hari sesudah pembedahan sampai nyeri berkurang dan hilang.</strong></p>
            </div>

            <div className="important-note">
              <h4>📊 Alat Pengukur Skor Nyeri</h4>
              <p>Anda akan diberikan pertanyaan oleh perawat mengenai skor nyeri dengan menggunakan skala 0-10 untuk membantu dokter mengetahui tingkat nyeri Anda.</p>
              <div className="pain-scale">
                <div className="pain-level">0: Tidak Nyeri</div>
                <div className="pain-level">1-3: Nyeri Ringan</div>
                <div className="pain-level">4-6: Nyeri Mengganggu</div>
                <div className="pain-level">7-9: Nyeri Hebat</div>
                <div className="pain-level">10: Nyeri Sangat Hebat</div>
              </div>
            </div>

            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">
                ← Kembali ke Pencegahan Infeksi
              </button>
              <button onClick={nextSection} className="btn-next">
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
                <p>
                  <strong>Surat Persetujuan Tindakan (Informed Consent)</strong><br/>
                  Dokter akan memberikan penjelasan tentang risiko, keuntungan, dan alternatif pengobatan kepada pasien dan keluarga. 
                  Pasien dan keluarga dalam kondisi sadar, bebas mengambil keputusan untuk memberikan persetujuan agar tindakan operasi dapat dijalankan.
                </p>
                
                <p>
                  Saya yang bertanda tangan di bawah ini, <strong>{patient.NamaPasien}</strong> 
                  (Nomor MR: <strong>{patient.NomorMR}</strong>), setelah membaca dan memahami 
                  seluruh informasi dalam booklet ini, dengan ini menyatakan:
                </p>
                
                <div className="consent-points">
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Telah memahami penjelasan mengenai indikasi dan manfaat tindakan operasi</span>
                  </div>
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Menyetujui pelaksanaan tindakan operasi sesuai jadwal</span>
                  </div>
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Memahami risiko dan komplikasi yang mungkin terjadi</span>
                  </div>
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Bersedia mengikuti seluruh prosedur persiapan operasi</span>
                  </div>
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Memahami tata laksana pengelolaan nyeri pasca operasi</span>
                  </div>
                  <div className="consent-item">
                    <span className="check-icon">✅</span>
                    <span>Bersedia melakukan pencegahan infeksi sesuai panduan</span>
                  </div>
                </div>
              </div>

              <div className="signature-area">
                <h3>Tanda Tangan Pasien/Penanggung Jawab</h3>
                <div className="signature-pad-container">
                  <SignatureCanvas
                    ref={(ref) => setSignaturePad(ref)}
                    canvasProps={{
                      width: 500,
                      height: 200,
                      className: 'signature-canvas'
                    }}
                  />
                  <div className="signature-actions">
                    <button onClick={clearSignature} className="btn-clear">
                      🗑️ Hapus Tanda Tangan
                    </button>
                  </div>
                </div>

                <div className="signature-details">
                  <div className="detail-item">
                    <label>Nama Terang:</label>
                    <span>{patient.NamaPasien}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tanggal:</label>
                    <span>{new Date().toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Waktu:</label>
                    <span>{new Date().toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="final-submission">
                <p className="confirmation-text">
                  Persiapan yang baik selama periode operasi akan membantu menurunkan komplikasi operasi 
                  dan mempercepat pemulihan setelah operasi.
                </p>
                
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="btn-submit-consent"
                >
                  {isSubmitting ? '🔄 Mengirim Persetujuan...' : '✅ SETUJU & KIRIM PERSETUJUAN'}
                </button>
              </div>
            </div>

            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">
                ← Kembali ke Pengelolaan Nyeri
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Footer (Selalu Tampil) */}
      <footer className="ebooklet-footer">
        <p>
          <strong>SILOAM HOSPITALS AMBON</strong>
        </p>
        <p className="footer-contact">
          Ambulans 24 Jam: 1-500-911 | Informasi: 1-500-181
        </p>
      </footer>
    </div>
  );
};

export default PatientPage;
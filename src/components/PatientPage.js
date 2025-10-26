import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './PatientPage.css';

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
        <button type="submit" className="btn-submit-petugas">Submit</button>
      </form>
    </div>
  );
};

const PetugasParaf = ({ sectionKey, isChecked, onChange, isReadOnly, label }) => (
  <div className="petugas-paraf-container">
    <label className="consent-item-checkbox paraf">
      <input type="checkbox" name={sectionKey} checked={isChecked} onChange={onChange} disabled={isReadOnly} />
      <span className="custom-checkbox"></span>
      <span className="consent-text paraf-text">{isReadOnly ? `Petugas telah memverifikasi halaman: ${label}` : `Saya (petugas) telah menjelaskan halaman ini kepada pasien.`}</span>
    </label>
  </div>
);

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
  const [catatanDokter, setCatatanDokter] = useState('');

  const [petugasCheckboxes, setPetugasCheckboxes] = useState({ paraf0: false, paraf1: false, paraf2: false, paraf3: false, paraf4: false });
  const [consentChecks, setConsentChecks] = useState({ check1: false, check2: false, check3: false, check4: false, check5: false, check6: false });

  const sections = ['informasi-pasien', 'persiapan-mental', 'persiapan-fisik', 'pencegahan-infeksi', 'pengelolaan-nyeri', 'persetujuan'];

  useLayoutEffect(() => {
    const updateCanvasWidth = () => {
      if (signatureContainerRef.current) { setCanvasWidth(signatureContainerRef.current.offsetWidth); }
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
          setCatatanDokter(response.data.CatatanDokter || '');
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
    if (!allConsentChecked) { alert('Harap setujui semua poin pernyataan sebelum mengirim.'); return; }
    const allPetugasChecked = Object.values(petugasCheckboxes).every(Boolean);
    if (!allPetugasChecked) { alert('Harap petugas memverifikasi (mencentang) semua halaman sebelum submit.'); return; }
    if (signaturePad.isEmpty()) { alert('Harap berikan tanda tangan terlebih dahulu'); return; }

    setIsSubmitting(true);
    try {
      const signatureData = signaturePad.toDataURL();
      await axios.post('/.netlify/functions/submit-approval', {
        NomorMR: patient.NomorMR,
        token: token,
        signature_data: signatureData,
        persetujuanData: consentChecks,
        namaPetugas: namaPetugas,
        petugasParafData: petugasCheckboxes,
        catatanDokter: catatanDokter
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

  if (showPetugasModal) return <PetugasModal onSubmit={handlePetugasSubmit} />;
  if (!patient) return ( <div className="loading-container"><div className="loading">Memuat data e-booklet...</div></div> );

  return (
    <div className="patient-page">
      <header className="ebooklet-header">
        <img src="/asset/logoputih.png" alt="Logo Rumah Sakit" className="hospital-logo" />
        <div className="header-text-block">
          <div className="document-title">
            <h1>BOOKLET PERSIAPAN OPERASI</h1>
            <p>SURGICAL PREPARATION GUIDE</p>
          </div>
          <div className="hospital-info">
            {namaPetugas && <p className="petugas-info">Petugas: {namaPetugas}</p>}
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

        {currentSection === 0 && (
          <section id="informasi-pasien" className="content-section">
            <h2>📋 INFORMASI PASIEN & JADWAL</h2>
            <div className="patient-info-grid">
              <div className="info-item"><label>Nomor MR:</label><span>{patient.NomorMR}</span></div>
              <div className="info-item"><label>Nama Pasien:</label><span>{patient.NamaPasien}</span></div>
              <div className="info-item"><label>Rencana Operasi:</label><span>{patient.JadwalOperasi ? new Date(patient.JadwalOperasi).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Akan dijadwalkan'}</span></div>
              <div className="info-item"><label>Dokter:</label><span>{patient.Dokter || 'Akan ditentukan'}</span></div>
            </div>

            <div className="prep-category">
                <h3>Persiapan Operasi [cite: 1, 2]</h3>
                <p>Aspek terpenting dari persiapan operasi adalah mengevaluasi indikasi dan manfaat tindakan operasi[cite: 3]. Hal ini dikarenakan, pemahaman pasien dan keluarga tentang persiapan operasi, seperti indikasi operasi, tindakan khusus, dan risiko operasi sangat diperlukan[cite: 4].</p>
                <p>Ketika seorang dokter menyarankan Anda untuk menjalani operasi sebagai terapi, Anda dan keluarga diimbau untuk segera mendiskusikan persiapan operasi tersebut, serta hal-hal apa saja yang bisa mendukung kelancaran tindakan[cite: 5].</p>
            </div>
            <div className="reminder">
                <h4>Hal Penting untuk Diinformasikan ke Petugas Medis [cite: 6]</h4>
                 <p>Berikut adalah sejumlah hal penting yang perlu Anda dan keluarga informasikan kepada petugas medis, antara lain:</p>
                 <ul>
                    <li>Riwayat penyakit[cite: 7].</li>
                    <li>Kesediaan melakukan pemeriksaan sesuai rekomendasi dokter[cite: 8].</li>
                    <li>Obat-obatan yang dikonsumsi[cite: 9].</li>
                    <li>Alergi obat atau makanan tertentu.</li>
                    <li>Riwayat operasi sebelumnya.</li>
                    <li>Penyakit menular yang pernah diderita.</li>
                </ul>
            </div>
             <div className="prep-category">
              <h3>📄 Dokumen yang Perlu Dibawa Pasien[cite: 237]:</h3>
              <ul>
                <li>Surat pengantar operasi / rawat inap[cite: 183, 238].</li>
                <li>Laporan medis awal[cite: 184, 239].</li>
                <li>Fotokopi KTP (pasien dan penanggung jawab)[cite: 185, 241].</li>
                <li>Fotokopi kartu asuransi/BPJS[cite: 186, 242].</li>
                <li>Data penunjang (hasil laboratorium dan radiologi) terbaru[cite: 187].</li>
                <li>Surat persetujuan operasi yang sudah ditandatangani (jika ada sebelumnya)[cite: 240].</li>
              </ul>
            </div>

            <PetugasParaf sectionKey="paraf0" isChecked={petugasCheckboxes.paraf0} onChange={handlePetugasCheckChange} isReadOnly={isReadOnly} label="Informasi Pasien" />
            <div className="section-navigation">
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf0 && !isReadOnly}>Lanjut ke Persiapan Mental →</button>
            </div>
          </section>
        )}

        {currentSection === 1 && (
          <section id="persiapan-mental" className="content-section">
            <h2>🧠 PERSIAPAN MENTAL & PSIKOLOGIS</h2>
            <div className="risk-category">
                <h3>Rasa Takut dan Cemas Sebelum Operasi [cite: 10]</h3>
                <p>Munculnya perasaan takut dan cemas sebelum operasi adalah hal wajar[cite: 11]. Biasanya perasaan ini dipicu oleh sejumlah ketakutan, sebagai berikut:</p>
                <ul>
                    <li>Takut nyeri setelah operasi[cite: 12].</li>
                    <li>Takut terjadi perubahan fisik (body image)[cite: 13].</li>
                    <li>Takut hasil operasi keganasan[cite: 14].</li>
                    <li>Takut menghadapi ruang operasi, peralatan, dan petugas kamar operasi[cite: 15].</li>
                    <li>Takut tidak dapat sadarkan diri setelah dibius[cite: 17].</li>
                    <li>Takut operasi gagal[cite: 18].</li>
                </ul>
            </div>
            <div className="prep-category">
                <h3>Konseling dan Dukungan</h3>
                <p>Oleh karena itu, sangat penting bagi Anda yang hendak menjalani proses operasi untuk mendapatkan konseling dan tes sukarela dari petugas terlatih setelah mendapatkan hasil pemeriksaan[cite: 19].</p>
                <p>Dukungan bisa didapatkan dari:</p>
                <ul>
                    <li><strong>Keluarga dan teman:</strong> Dukungan moral, bantuan persiapan dan pemulihan.</li>
                    <li><strong>Tim medis (dokter, perawat, psikolog):</strong> Jangan ragu bertanya dan menyampaikan kekhawatiran.</li>
                    <li><strong>Konseling spiritual:</strong> Jika diperlukan.</li>
                </ul>
             </div>
             <div className="important-note">
              <h4>💡 Tips Mengatasi Kecemasan:</h4>
              <ul>
                <li>Diskusikan kekhawatiran dengan dokter dan keluarga.</li>
                <li>Lakukan teknik relaksasi (napas dalam, meditasi).</li>
                <li>Jaga komunikasi dengan tim medis.</li>
                <li>Persiapkan diri fisik dan mental.</li>
                <li>Minta dukungan orang terdekat.</li>
              </ul>
            </div>
            <PetugasParaf sectionKey="paraf1" isChecked={petugasCheckboxes.paraf1} onChange={handlePetugasCheckChange} isReadOnly={isReadOnly} label="Persiapan Mental" />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Informasi</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf1 && !isReadOnly}>Lanjut ke Persiapan Fisik →</button>
            </div>
          </section>
        )}

        {currentSection === 2 && (
          <section id="persiapan-fisik" className="content-section">
            <h2>💪 PERSIAPAN FISIK [cite: 24]</h2>
             <p>Tidak hanya mental dan psikologis, persiapan operasi juga mencakup fisik[cite: 25].</p>
            <div className="prep-category">
              <h3>Persiapan Fisik Sebelum Operasi</h3>
              <p>Beberapa persiapan fisik sebelum menjalani operasi yang harus Anda perhatikan, sebagai berikut[cite: 26]:</p>
              <ul>
                    <li>Kondisi fisik dalam keadaan sehat[cite: 27].</li>
                    <li>Berhenti merokok jika Anda perokok[cite: 28].</li>
                    <li>Berhenti menggunakan obat-obatan pengencer darah kurang lebih 5-7 hari sebelum operasi[cite: 29].</li>
                    <li>Cukup istirahat[cite: 30].</li>
                    <li>Kondisi tubuh memungkinkan menjalankan operasi sesuai rekomendasi dokter[cite: 31].</li>
                    <li>Istirahat minimal 8 jam sebelum operasi.</li>
                    <li>Hindari konsumsi alkohol 48 jam sebelum operasi.</li>
              </ul>
            </div>
            <div className="prep-category">
              <h3>Petunjuk Umum Sebelum Operasi [cite: 33]</h3>
              <ul>
                 <li>Datanglah sesuai dengan jadwal yang telah ditentukan[cite: 34].</li>
                 <li>Puasa tidak makan dan minum selama kurang lebih 6 jam atau sesuai anjuran dokter[cite: 35].</li>
                 <li>Tidak mengonsumsi obat pengencer darah (antikoagulan)[cite: 36]. Jika mengonsumsi, segera informasikan ke dokter bedah[cite: 37].</li>
                 <li>Mandi menggunakan sabun antiseptik (chlorhexidine) 1 hari sebelum operasi atau sesuai petunjuk rumah sakit[cite: 38].</li>
                 <li>Pakailah pakaian yang nyaman dan mudah dibuka.</li>
                 <li>Lepaskan semua perhiasan, jam tangan, dan aksesoris.</li>
                 <li>Kosongkan kandung kemih sebelum ke ruang operasi.</li>
                 <li>Pastikan ada pendamping selama proses operasi.</li>
              </ul>
            </div>
             <div className="reminder">
              <h4>📝 Yang Perlu Diinformasikan ke Petugas Medis (Ulang):</h4>
              <ul>
                <li>Riwayat penyakit (hipertensi, diabetes, asma, dll).</li>
                <li>Alergi obat atau makanan tertentu.</li>
                <li>Obat-obatan yang sedang dikonsumsi secara rutin.</li>
                <li>Riwayat operasi sebelumnya.</li>
                <li>Penyakit menular yang pernah diderita.</li>
              </ul>
            </div>
            <PetugasParaf sectionKey="paraf2" isChecked={petugasCheckboxes.paraf2} onChange={handlePetugasCheckChange} isReadOnly={isReadOnly} label="Persiapan Fisik" />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Mental</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf2 && !isReadOnly}>Lanjut ke Pencegahan Infeksi →</button>
            </div>
          </section>
        )}

        {currentSection === 3 && (
          <section id="pencegahan-infeksi" className="content-section">
            <h2>🦠 PENCEGAHAN INFEKSI DAERAH OPERASI [cite: 39]</h2>

            <div className="risk-category">
                <h3>Mengenal Infeksi Daerah Operasi [cite: 40]</h3>
                <p>Infeksi daerah operasi adalah infeksi yang terjadi karena kuman masuk dan berkembang ke dalam bagian tubuh yang sedang dioperasi atau di daerah sekitar operasi[cite: 41]. Kuman yang masuk dapat berupa bakteri, jamur, dan virus[cite: 42]. Jika tidak segera diobati, infeksi bisa berubah menjadi nanah, peradangan, pembengkakan, nyeri, dan demam[cite: 42].</p>
                <p>Infeksi daerah operasi bisa terjadi kapan saja, baik 2-3 hari setelah bedah dilakukan, hingga luka tersebut sembuh, kecuali penggunaan alat-alat implant, seperti operasi pergantian sendi panggul dan lutut, yang mampu memakan waktu sampai satu tahun lamanya[cite: 43].</p>
                <p>Kebanyakan infeksi daerah operasi merupakan infeksi yang tidak serius jika hanya mengenai kulit[cite: 44]. Namun, bisa menjadi serius jika infeksi daerah operasi masuk ke dalam lapisan jaringan[cite: 45].</p>
                 <p><strong>Tanda-tanda infeksi[cite: 87]:</strong></p>
                 <ul>
                    <li>Kemerahan dan rasa nyeri pada luka operasi[cite: 88].</li>
                    <li>Demam ≥38°C[cite: 89].</li>
                    <li>Bengkak pada sekitar luka[cite: 90].</li>
                    <li>Keluar cairan atau rembesan dari luka[cite: 91].</li>
                    <li>Bau tidak sedap dari luka.</li>
                    <li>Luka terasa hangat.</li>
                </ul>
            </div>

             <div className="risk-category">
                <h3>Faktor Risiko Infeksi Daerah Operasi [cite: 46]</h3>
                <p>Terdapat sejumlah faktor yang mampu meningkatkan risiko infeksi daerah operasi pada seseorang, antara lain sebagai berikut[cite: 47]:</p>
                <ul>
                    <li>Usia dan jenis kelamin[cite: 48].</li>
                    <li>Kegemukan (obesitas)[cite: 49].</li>
                    <li>Mempunyai penyakit penyerta, seperti diabetes, sehingga dapat memengaruhi respons imun secara umum[cite: 50].</li>
                    <li>Perokok berat[cite: 51].</li>
                    <li>Tindakan operasi lebih kompleks dan lama[cite: 52].</li>
                    <li>Tindakan bedah yang mengenai bagian tubuh yang sudah terdapat bakteri, seperti usus[cite: 53].</li>
                </ul>
             </div>

              <div className="prep-category">
                <h3>Cara Mencegah Infeksi Daerah Operasi [cite: 55]</h3>
                 <p>Infeksi daerah operasi dapat dicegah dengan perawatan sebelum, selama, dan sesudah tindakan operasi (di ruang perawatan)[cite: 56].</p>

                 <h4>Sebelum Operasi[cite: 57]:</h4>
                 <p>Beberapa langkah perawatan yang bisa dilakukan untuk mencegah infeksi sebelum operasi, sebagai berikut[cite: 58]:</p>
                 <ul>
                    <li>Menjaga kebersihan diri, dengan mandi terlebih dahulu sebelum operasi dilakukan dan jangan menggunakan make up[cite: 59].</li>
                    <li>Jika harus melakukan pencukuran rambut area operasi, gunakan clipper agar tidak iritasi[cite: 60].</li>
                    <li>Mengganti baju yang telah disediakan oleh rumah sakit[cite: 61].</li>
                    <li>Pemberian profilaksis (antibiotik pencegahan) hanya pada kasus tertentu (diberikan 30-60 menit) sebelum sayatan dimulai sesuai instruksi dokter[cite: 62].</li>
                </ul>

                 <h4>Selama Operasi[cite: 63]:</h4>
                 <p>Tim bedah akan melakukan prosedur[cite: 64]:</p>
                 <ul>
                    <li>Mencuci tangan[cite: 65].</li>
                    <li>Menggunakan baju operasi steril[cite: 66].</li>
                    <li>Menggunakan sarung tangan steril[cite: 67].</li>
                    <li>Menggunakan antiseptik untuk membersihkan kulit di daerah sayatan[cite: 68].</li>
                    <li>Selama tindakan bedah, kebutuhan akan oksigen, keseimbangan cairan, hingga suhu tubuh akan terus dipantau[cite: 69].</li>
                    <li>Luka operasi akan ditutup secara steril[cite: 70].</li>
                </ul>

                 <h4>Sesudah Operasi (di Ruang Perawatan)[cite: 72]:</h4>
                  <p>Beberapa perawatan yang dilakukan di bangsal atau di rumah sakit seusai operasi[cite: 73]:</p>
                 <ul>
                    <li>Perawatan luka selalu dilakukan secara aseptik (teknik steril) selama berada di kamar perawatan[cite: 74].</li>
                    <li>Perawat selalu melakukan hand hygiene sebelum melakukan tindakan perawatan luka[cite: 75].</li>
                    <li>Balutan luka khusus bila sudah lepas jahitan agar tidak mudah kotor atau basah[cite: 76].</li>
                    <li>Perawat akan selalu memantau kondisi luka dan suhu tubuh[cite: 77].</li>
                </ul>
            </div>

            <div className="phase">
                <h3>Perawatan Luka Setelah Pulang dari Rumah Sakit [cite: 78]</h3>
                 <p>Perawatan pada luka operasi setelah pulang dari rumah sakit:</p>
                 <ul>
                    <li>3-5 hari setelah operasi, jaga balutan agar tetap kering, utuh, dan bersih[cite: 79].</li>
                    <li>Tanyakan pada dokter mengenai waktu yang tepat untuk melepas balutan pada luka atau datang kembali untuk kontrol[cite: 80].</li>
                    <li>Cuci tangan sebelum dan sesudah menyentuh luka[cite: 81].</li>
                    <li>Jika balutan basah, segera cari orang yang kompeten untuk mengganti balutan atau datang ke unit pelayanan kesehatan terdekat[cite: 82].</li>
                    <li>Makan makanan tinggi protein, seperti telur dan susu[cite: 83].</li>
                    <li>Segera hubungi atau kunjungi Siloam Hospitals terdekat jika mengalami tanda-tanda infeksi[cite: 84].</li>
                </ul>
             </div>

             <div className="reminder">
                 <h4>Cara Memantau Luka Operasi di Rumah [cite: 85]</h4>
                 <p>Infeksi masih dapat terjadi setelah pasien keluar dari rumah sakit atau pulang ke rumah[cite: 86]. Kenali tanda-tanda infeksi[cite: 87]:</p>
                 <ul>
                    <li>Kemerahan dan rasa nyeri pada luka operasi[cite: 88].</li>
                    <li>Demam ≥38°C[cite: 89].</li>
                    <li>Bengkak pada sekitar luka[cite: 90].</li>
                    <li>Keluar cairan atau rembesan dari luka[cite: 91].</li>
                </ul>
             </div>

            <PetugasParaf sectionKey="paraf3" isChecked={petugasCheckboxes.paraf3} onChange={handlePetugasCheckChange} isReadOnly={isReadOnly} label="Pencegahan Infeksi" />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Persiapan Fisik</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf3 && !isReadOnly}>Lanjut ke Pengelolaan Nyeri →</button>
            </div>
          </section>
        )}

        {currentSection === 4 && (
          <section id="pengelolaan-nyeri" className="content-section">
            <h2>😣 PENGELOLAAN NYERI (Panduan untuk Pasien) [cite: 93, 108]</h2>
            <div className="prep-category">
                <h3>Mengenal Nyeri [cite: 94]</h3>
                <p>Nyeri adalah suatu pengalaman sensori dan emosional yang tidak menyenangkan, yang diakibatkan oleh kerusakan jaringan yang tampak maupun tidak tampak[cite: 95]. Nyeri dapat diakibatkan oleh panas, dingin, tekanan, pembedahan/luka, bahkan cahaya yang sangat terang[cite: 96]. Nyeri dapat memengaruhi tubuh secara keseluruhan dan dapat menimbulkan dampak yang serius[cite: 97].</p>
                <p>Hanya Anda yang dapat menjelaskan bagaimana jenis dan karakter nyeri yang dialami[cite: 98]. Hal ini dikarenakan, setiap orang memiliki reaksi yang berbeda-beda terhadap nyeri[cite: 99].</p>
            </div>
             <div className="prep-category">
                <h3>Tujuan Pengelolaan Nyeri [cite: 100]</h3>
                <p>Pengelolaan nyeri yang baik akan membantu Anda dalam beberapa hal, sebagai berikut[cite: 101]:</p>
                <ul>
                    <li>Memberikan rasa nyaman pada waktu pemulihan[cite: 102].</li>
                    <li>Mempercepat proses penyembuhan[cite: 103].</li>
                    <li>Mempermudah Anda dalam bergerak[cite: 104].</li>
                </ul>
                 <p>Ada beberapa kekhawatiran mengenai obat nyeri yang akan menimbulkan ketagihan[cite: 105]. Pada kenyataannya, pemberian obat nyeri yang memadai, berdasarkan resep, dan sesuai kebutuhan, tidak akan menimbulkan ketagihan[cite: 106].</p>
            </div>
            <div className="risk-category">
                <h3>Pengobatan Nyeri Tanpa Penggunaan Obat [cite: 109]</h3>
                <p>Terdapat sejumlah teknik pengobatan yang mengurangi nyeri tanpa harus melibatkan obat, antara lain[cite: 110]:</p>
                <ul>
                    <li>Teknik memijat atau massage[cite: 111].</li>
                    <li>Posisi tidur yang nyaman, sehingga dapat mengurangi tekanan pada luka[cite: 112].</li>
                    <li>Kompres dingin atau panas[cite: 113].</li>
                    <li>Relaksasi dan meditasi[cite: 114].</li>
                    <li>Teknik distraksi (mengalihkan perhatian)[cite: 115].</li>
                    <li>Relaksasi dengan musik[cite: 116].</li>
                    <li>Aromaterapi[cite: 117].</li>
                </ul>
                <p>Semua teknik yang disebutkan, tentunya harus disesuaikan dengan kondisi tubuh, jenis operasi yang dilakukan, keadaan lingkungan, dan saran dari dokter[cite: 118].</p>
            </div>
            <div className="phase">
                <h3>Pengobatan Nyeri dengan Penggunaan Obat [cite: 119]</h3>
                 <p>Banyak yang beranggapan bahwa nyeri adalah sesuatu yang wajar dan harus ditahan[cite: 120]. Dengan jenis pengobatan yang ada saat ini, Anda seharusnya tidak harus menderita karena nyeri[cite: 121]. Jadi, penting untuk menginformasikan rasa nyeri yang dirasakan agar bisa diberi penanganan yang tepat[cite: 122]. Jika sebelumnya pernah mengalami nyeri yang sama dan sembuh, Anda disarankan untuk menginformasikan obat maupun cara yang dilakukan untuk menghilangkan nyeri tersebut[cite: 123].</p>
                 <p>Biasanya jika pengobatan nyeri menggunakan obat, akan dilakukan dengan beberapa bentuk pemberian obat, sebagai berikut[cite: 124]:</p>
                 <ul>
                    <li>Tablet[cite: 126].</li>
                    <li>Injeksi (suntikan)[cite: 127].</li>
                    <li>Suppositoria atau yang umum diberikan lewat anus[cite: 128].</li>
                    <li>Injeksi terus-menerus melalui infus[cite: 129].</li>
                    <li>Melalui kateter epidural[cite: 130].</li>
                    <li>Patch atau plester kulit.</li>
                    <li>PCA (Patient Controlled Analgesia).</li>
                </ul>
                 <p>Obat anti nyeri sebaiknya diminum secara teratur, yakni 3-4 hari sesudah pembedahan sampai nyerinya berkurang dan hilang[cite: 131]. Beberapa jenis obat anti nyeri bekerja sebagai background untuk mengurangi tingkat nyeri[cite: 132]. Hal ini berarti Anda harus tetap meminum obat anti nyeri, walaupun skala nyeri yang dirasakan rendah[cite: 133]. Sering kali, Anda akan disarankan menggunakan kombinasi obat anti nyeri untuk memberikan efek lebih baik dibanding hanya satu obat saja dengan dosis tinggi[cite: 134].</p>
            </div>
            <div className="important-note">
                <h3>Peran Anda dalam Pengelolaan Nyeri [cite: 135]</h3>
                <p>Tidak hanya dokter dan petugas medis, Anda juga bisa berperan dalam mengelola nyeri yang dirasakan[cite: 136]. Caranya adalah menginformasikan nyeri yang Anda rasakan secara rinci dan tepat[cite: 137].</p>
                <p>Beberapa informasi yang sebaiknya dikomunikasikan, sebagai berikut[cite: 138]:</p>
                <ul>
                    <li>Lokasi nyeri[cite: 139].</li>
                    <li>Berat ringannya nyeri yang dirasakan, terutama pada saat napas dalam, batuk, beraktivitas, dan saat istirahat[cite: 140]. Anda akan ditanya beberapa skor nyeri yang dirasakan untuk kemudian dapat dievaluasi[cite: 141].</li>
                    <li>Efektivitas pengobatan nyeri yang saat ini didapat dan jumlah waktu yang diperlukan hingga dapat mengurangi nyeri[cite: 142].</li>
                    <li>Hal-hal lainnya seperti kemungkinan efek samping, antara lain gatal-gatal, mual, muntah, dan efek lainnya[cite: 143]. Efek samping ini umumnya dapat diatasi[cite: 144].</li>
                    <li>Sembelit atau susah buang air besar dapat terjadi apabila Anda menggunakan obat-obat anti nyeri yang cukup kuat, jadi ada kemungkinan Anda akan memerlukan obat pencahar[cite: 145].</li>
                </ul>
                <p>Dengan menginformasikan hal-hal di atas, dokter dan petugas medis bisa membantu Anda dalam memilih jenis obat anti nyeri yang cocok untuk nyeri Anda, sehingga pengobatan pun bisa maksimal[cite: 146].</p>
            </div>
            <div className="important-note">
              <h4>📊 Alat Pengukur Skor Nyeri [cite: 148]</h4>
              <p>Anda akan diberikan pertanyaan oleh perawat mengenai skor nyeri dengan menggunakan alat seperti di bawah ini[cite: 149]. Hal tersebut akan membantu dokter mengetahui tingkat nyeri Anda[cite: 150].</p>
              <div className="pain-scale-description">
                <p><strong>0 [cite: 156]:</strong> TIDAK NYERI [cite: 151] / TIDAK SAKIT [cite: 167, 168]</p>
                <p><strong>1-3 [cite: 157-159]:</strong> NYERI RINGAN [cite: 152] / SAKIT YANG RINGAN [cite: 173]</p>
                <p><strong>4-6 [cite: 160-162]:</strong> NYERI YANG MENGANGGU [cite: 153] / SAKIT YANG MENGGANGGU [cite: 169]</p>
                <p><strong>7-9 [cite: 163-165]:</strong> NYERI HEBAT [cite: 154] / SAKIT HEBAT [cite: 171, 175]</p>
                <p><strong>10 [cite: 166]:</strong> NYERI SANGAT HEBAT [cite: 155] / SAKIT SANGAT HEBAT [cite: 172, 176]</p>
              </div>
              <p>Beritahu perawat jika skor nyeri Anda ≥4 untuk mendapatkan penanganan yang tepat.</p>
            </div>
             <div className="prep-category">
                <h3>Informasi Obat Anti Nyeri Saat Pulang [cite: 177]</h3>
                <p>Mintalah informasi mengenai obat anti nyeri yang memerlukan konsumsi lanjutan di rumah[cite: 178]. Jika nyeri masih terasa setelah obat habis, segera konsultasikan ke dokter[cite: 179]. Lalu, apabila sebelumnya Anda juga sudah mengonsumsi obat anti nyeri, sebaiknya informasikan juga nama obat serta dosisnya kepada dokter maupun petugas medis, terutama jika hendak melakukan operasi[cite: 180]. Hal ini akan memengaruhi pemilihan obat anti nyeri yang tepat setelah operasi[cite: 181].</p>
            </div>
            <PetugasParaf sectionKey="paraf4" isChecked={petugasCheckboxes.paraf4} onChange={handlePetugasCheckChange} isReadOnly={isReadOnly} label="Pengelolaan Nyeri" />
            <div className="section-navigation">
              <button onClick={prevSection} className="btn-prev">← Kembali ke Pencegahan Infeksi</button>
              <button onClick={nextSection} className="btn-next" disabled={!petugasCheckboxes.paraf4 && !isReadOnly}>Lanjut ke Persetujuan Tindakan →</button>
            </div>
          </section>
        )}

        {currentSection === 5 && (
          <section id="persetujuan" className="content-section consent-section">
            <h2>📝 FORMULIR PERSETUJUAN TINDAKAN</h2>
            <div className="consent-declaration">
              <div className="declaration-text">
                <p><strong>Surat Persetujuan Tindakan (Informed Consent) [cite: 20]</strong><br/>
                Dokter akan memberikan penjelasan tentang risiko, keuntungan, dan alternatif pengobatan kepada pasien dan keluarga[cite: 21].
                Pasien dan keluarga dalam kondisi sadar, bebas mengambil keputusan untuk memberikan persetujuan agar tindakan operasi dapat dijalankan[cite: 22].</p>
                <p>Persiapan yang baik selama periode operasi akan membantu menurunkan komplikasi operasi dan mempercepat pemulihan setelah operasi[cite: 23].</p>

                <p>Saya yang bertanda tangan di bawah ini, <strong>{patient.NamaPasien}</strong> (Nomor MR: <strong>{patient.NomorMR}</strong>), setelah membaca dan memahami seluruh informasi dalam booklet ini, dengan ini menyatakan:</p>

                <div className="consent-points">
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check1" checked={consentChecks.check1} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Telah memahami penjelasan mengenai indikasi dan manfaat tindakan operasi</span>
                  </label>
                   <label className="consent-item-checkbox">
                    <input type="checkbox" name="check2" checked={consentChecks.check2} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Menyetujui pelaksanaan tindakan operasi sesuai jadwal</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check3" checked={consentChecks.check3} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami risiko dan komplikasi yang mungkin terjadi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check4" checked={consentChecks.check4} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia mengikuti seluruh prosedur persiapan operasi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check5" checked={consentChecks.check5} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Memahami tata laksana pengelolaan nyeri pasca operasi</span>
                  </label>
                  <label className="consent-item-checkbox">
                    <input type="checkbox" name="check6" checked={consentChecks.check6} onChange={handleCheckboxChange} disabled={isReadOnly} />
                    <span className="custom-checkbox"></span>
                    <span className="consent-text">Bersedia melakukan pencegahan infeksi sesuai panduan</span>
                  </label>
                </div>
              </div>

              <div className="catatan-dokter-area">
                <h3>Catatan Tambahan untuk Dokter (Opsional)</h3>
                <textarea
                    id="catatanDokter"
                    value={catatanDokter}
                    onChange={(e) => setCatatanDokter(e.target.value)}
                    placeholder="Tuliskan catatan khusus untuk dokter Anda di sini (misal: riwayat alergi lain, kekhawatiran spesifik)..."
                    rows="4"
                    disabled={isReadOnly}
                    className="catatan-textarea"
                />
              </div>

              <div className="signature-area">
                <h3>Tanda Tangan Pasien/Penanggung Jawab</h3>
                {isReadOnly && savedSignature ? (
                  <div className="saved-signature-container">
                    <img src={savedSignature} alt="Tanda Tangan Tersimpan" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px' }} />
                    <p style={{ fontStyle: 'italic', color: '#555', fontSize: '14px', marginTop: '10px' }}>
                      Telah ditandatangani pada: {new Date(patient.TimestampPersetujuan).toLocaleString('id-ID')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="signature-pad-container" ref={signatureContainerRef}>
                      <SignatureCanvas ref={(ref) => setSignaturePad(ref)} canvasProps={{ width: canvasWidth, height: 200, className: 'signature-canvas' }} />
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
                <p className="confirmation-text">{isReadOnly ? "Dokumen ini telah disetujui dan diarsipkan. Anda dapat melihat kembali informasi ini kapan saja." : "Dengan mengirim persetujuan ini, saya menyatakan telah memahami semua informasi yang diberikan."}</p>
                {!isReadOnly && (
                  <button onClick={handleSubmit} disabled={isSubmitting || !allConsentChecked || !Object.values(petugasCheckboxes).every(Boolean)} className="btn-submit-consent">
                    {isSubmitting ? '🔄 Mengirim...' : '✅ SETUJU & KIRIM PERSETUJUAN'}
                  </button>
                )}
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
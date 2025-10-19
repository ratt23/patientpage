import React from 'react';
// Link tidak lagi digunakan, jadi bisa dihapus
import './ThankYou.css';

const ThankYou = () => {
  return (
    <div className="thank-you-container">
      <div className="thank-you-content">
        <div className="success-icon">✅</div>
        <h1>Terima Kasih!</h1>
        <p className="thank-you-message">
          Persetujuan operasi Anda telah berhasil disimpan. 
          Tim medis kami akan menghubungi Anda untuk proses selanjutnya.
        </p>
        
        <div className="next-steps">
          <h3>Langkah Selanjutnya:</h3>
          <ul>
            <li>Tunggu konfirmasi dari rumah sakit</li>
            <li>Persiapkan dokumen yang diperlukan</li>
            <li>Ikuti instruksi pra-operasi</li>
            <li>Datang sesuai jadwal yang ditentukan</li>
          </ul>
        </div>

        <div className="contact-info">
          <p>Jika ada pertanyaan, hubungi:</p>
          <p className="contact-detail">
            <strong>Customer Service:</strong> (021) 1234-5678
          </p>
        </div>

        {/* Tombol Link ke /login sudah dihapus dari sini */}

      </div>
    </div>
  );
};

export default ThankYou;
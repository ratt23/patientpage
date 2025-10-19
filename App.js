// src/App.js (Versi KHUSUS Pasien)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PatientPage from './components/PatientPage';
import ThankYou from './components/ThankYou';
import './App.css';

// Komponen sederhana untuk rute yang tidak valid
const NotFound = () => (
  <div style={{ 
    padding: '50px', 
    textAlign: 'center', 
    fontFamily: 'sans-serif', 
    color: '#333' 
  }}>
    <h1 style={{ color: '#dc3545' }}>Link Tidak Valid</h1>
    <p style={{ fontSize: '18px' }}>
      Maaf, halaman yang Anda cari tidak ditemukan.
    </p>
    <p style={{ color: '#666' }}>
      Silakan periksa kembali link yang diberikan oleh pihak rumah sakit.
    </p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Rute Publik untuk Pasien */}
          <Route path="/pasien/:NomorMR" element={<PatientPage />} />
          <Route path="/terima-kasih" element={<ThankYou />} />
          
          {/* Rute lain akan diarahkan ke halaman 'NotFound' */}
          <Route path="/" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
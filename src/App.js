// patient-app/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PatientPage from './components/PatientPage';
import ThankYou from './components/ThankYou';
import './App.css';

// Komponen NotFound (Tidak berubah)
const NotFound = () => (
  <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: '#333' }}>
    <h1 style={{ color: '#dc3545' }}>Link Tidak Valid</h1>
    <p style={{ fontSize: '18px' }}>Maaf, halaman yang Anda cari tidak ditemukan.</p>
    <p style={{ color: '#666' }}>Silakan periksa kembali link yang diberikan oleh pihak rumah sakit.</p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* --- PERUBAHAN: dari :NomorMR menjadi :token --- */}
          <Route path="/pasien/:token" element={<PatientPage />} />
          
          <Route path="/terima-kasih" element={<ThankYou />} />
          <Route path="/" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
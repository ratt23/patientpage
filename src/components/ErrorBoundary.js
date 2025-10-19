import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{ color: '#dc3545' }}>Terjadi Kesalahan</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Maaf, terjadi kesalahan yang tidak terduga.
          </p>
          <details style={{ 
            textAlign: 'left', 
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            maxWidth: '600px',
            width: '100%'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Detail Teknis (Untuk Developer)
            </summary>
            <p style={{ marginTop: '10px' }}>
              <strong>Error:</strong> {this.state.error && this.state.error.toString()}
            </p>
            <p>
              <strong>Stack:</strong> {this.state.errorInfo && this.state.errorInfo.componentStack}
            </p>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
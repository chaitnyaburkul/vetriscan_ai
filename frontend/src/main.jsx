import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'Arial', background: '#fff', color: '#333' }}>
          <h2 style={{ color: 'red' }}>App Error — Please report this</h2>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ marginTop: 16, padding: '10px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>
            Clear & Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// frontend/src/components/Login.js
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("❌ Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("email", data.email);
        alert("✅ Login successful!");
        setEmail('');
        setPassword('');
        
        // Pass user data to parent component
        onLoginSuccess({
          email: data.email,
          user_type: data.user_type
        });
      } else {
        alert("❌ " + data.detail);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>🔐</span>
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        <div style={styles.inputGroup}>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>📧</span>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Email address"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Password"
              style={styles.input}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.togglePassword}
              disabled={loading}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button 
          onClick={handleLogin} 
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            transform: loading ? 'scale(0.98)' : 'scale(1)'
          }}
          disabled={loading}
        >
          {loading ? (
            <span style={styles.loadingContent}>
              <span style={styles.spinner}></span>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>

        <div style={styles.footer}>
          <div style={styles.divider}>
            <span style={styles.dividerText}>Secure Login</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    width: '400px',
    maxWidth: '90vw',
    padding: '40px',
    border: 'none',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    margin: '0 auto 20px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2196F3, #21CBF3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(33, 150, 243, 0.3)',
  },
  icon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #2c3e50, #3498db)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0',
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '400',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '15px',
    fontSize: '18px',
    zIndex: 2,
    filter: 'grayscale(0.3)',
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 50px',
    fontSize: '16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    fontWeight: '500',
    outline: 'none',
  },
  togglePassword: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '5px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  button: {
    padding: '16px',
    fontSize: '18px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #2196F3, #21CBF3)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(33, 150, 243, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  footer: {
    marginTop: '10px',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '20px 0',
  },
  dividerText: {
    fontSize: '12px',
    color: '#94a3b8',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '0 15px',
    position: 'relative',
    zIndex: 1,
    fontWeight: '500',
    letterSpacing: '0.5px',
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: #2196F3 !important;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1) !important;
    transform: translateY(-1px);
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px) !important;
    box-shadow: 0 12px 35px rgba(33, 150, 243, 0.4) !important;
  }
  
  button:active:not(:disabled) {
    transform: translateY(0px) !important;
  }
  
  .toggle-password:hover {
    background-color: rgba(0,0,0,0.05) !important;
  }
`;
document.head.appendChild(styleSheet);

export default Login;
// frontend/src/components/Signup.js
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Signup({ onSignupSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      alert("❌ Please fill in all fields");
      return;
    }

    // Additional validation for driver
    if (userType === 'driver' && (!vehicleNumber || !licenseNumber)) {
      alert("❌ Please fill in vehicle number and license number");
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        email: email,
        password: password,
        user_type: userType
      };

      // Only add driver-specific fields if user is a driver and backend supports it
      if (userType === 'driver') {
        requestBody.vehicle_number = vehicleNumber;
        requestBody.license_number = licenseNumber;
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("email", data.email);
        alert("✅ Signup successful!");
      
        // If user is a driver, call second endpoint to store vehicle & license
        if (userType === 'driver') {
          const driverDetailsResponse = await fetch(`${API_BASE_URL}/driver/register-details`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              vehicle_number: vehicleNumber,
              license_number: licenseNumber
            }),
          });
      
          if (!driverDetailsResponse.ok) {
            const err = await driverDetailsResponse.json();
            alert("⚠️ Driver details error: " + err.detail);
            return;
          }
        }
      
        // Clear form
        setEmail('');
        setPassword('');
        setUserType('customer');
        setVehicleNumber('');
        setLicenseNumber('');
      
        // Notify parent
        onSignupSuccess({
          email: data.email,
          user_type: data.role
        });
      
      } else {
        alert("❌ " + data.detail);
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newUserType) => {
    setUserType(newUserType);
    // Clear driver-specific fields when switching away from driver
    if (newUserType !== 'driver') {
      setVehicleNumber('');
      setLicenseNumber('');
    }
  };

  const getUserTypeIcon = (type) => {
    switch(type) {
      case 'customer': return '👤';
      case 'driver': return '🚗';
      case 'admin': return '👑';
      default: return '👤';
    }
  };

  const getUserTypeColor = (type) => {
    switch(type) {
      case 'customer': return 'linear-gradient(135deg, #4CAF50, #45a049)';
      case 'driver': return 'linear-gradient(135deg, #FF9800, #F57C00)';
      case 'admin': return 'linear-gradient(135deg, #9C27B0, #7B1FA2)';
      default: return 'linear-gradient(135deg, #4CAF50, #45a049)';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <div style={styles.header}>
          <div style={{...styles.iconContainer, background: getUserTypeColor(userType)}}>
            <span style={styles.icon}>{getUserTypeIcon(userType)}</span>
          </div>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Join our platform today</p>
        </div>

        {/* Enhanced Tab Navigation */}
        <div style={styles.tabContainer}>
          {['customer', 'driver', 'admin'].map((type) => (
            <button
              key={type}
              style={{
                ...styles.tab,
                ...(userType === type ? styles.activeTab : {}),
                background: userType === type ? getUserTypeColor(type) : '#f8fafc'
              }}
              onClick={() => handleTabChange(type)}
              disabled={loading}
            >
              <span style={styles.tabIcon}>{getUserTypeIcon(type)}</span>
              <span style={styles.tabText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div style={styles.inputGroup}>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>📧</span>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Driver-specific fields with enhanced styling */}
          {userType === 'driver' && (
            <div style={styles.driverSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>🚛</span>
                <span style={styles.sectionTitle}>Driver Information</span>
              </div>
              
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔢</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Vehicle Number (e.g., KA01AB1234)"
                  style={styles.input}
                  disabled={loading}
                />
              </div>
              
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📄</span>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="License Number"
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleSignup} 
          style={{
            ...styles.button,
            background: getUserTypeColor(userType),
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            transform: loading ? 'scale(0.98)' : 'scale(1)'
          }}
          disabled={loading}
        >
          {loading ? (
            <span style={styles.loadingContent}>
              <span style={styles.spinner}></span>
              Creating account...
            </span>
          ) : (
            <span style={styles.buttonContent}>
              <span style={styles.buttonIcon}>{getUserTypeIcon(userType)}</span>
              Create {userType.charAt(0).toUpperCase() + userType.slice(1)} Account
            </span>
          )}
        </button>

        <div style={styles.footer}>
          <div style={styles.divider}>
            <span style={styles.dividerText}>Secure Registration</span>
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
    minHeight: '80vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    width: '450px',
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
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.3s ease',
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
  tabContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginBottom: '10px',
    padding: '8px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px',
    fontSize: '14px',
    backgroundColor: '#f8fafc',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    color: '#475569',
  },
  activeTab: {
    color: 'white',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  },
  tabIcon: {
    fontSize: '18px',
  },
  tabText: {
    fontSize: '12px',
    fontWeight: '600',
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
  driverSection: {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#fff7ed',
    border: '2px solid #fed7aa',
    marginTop: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
  },
  sectionIcon: {
    fontSize: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ea580c',
  },
  button: {
    padding: '16px',
    fontSize: '18px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  buttonIcon: {
    fontSize: '20px',
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

// Add CSS animations and enhanced interactions
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    transform: translateY(-1px);
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px) !important;
    box-shadow: 0 12px 35px rgba(0,0,0,0.2) !important;
  }
  
  button:active:not(:disabled) {
    transform: translateY(0px) !important;
  }
  
  .toggle-password:hover {
    background-color: rgba(0,0,0,0.05) !important;
  }
  
  .tab:hover:not(.activeTab) {
    background-color: #e2e8f0 !important;
    transform: translateY(-1px);
  }
`;
document.head.appendChild(styleSheet);

export default Signup;
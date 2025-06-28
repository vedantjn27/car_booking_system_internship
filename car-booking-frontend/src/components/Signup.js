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

  return (
    <div style={styles.form}>
      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(userType === 'customer' ? styles.activeTab : {})
          }}
          onClick={() => handleTabChange('customer')}
          disabled={loading}
        >
          👤 Customer
        </button>
        <button
          style={{
            ...styles.tab,
            ...(userType === 'driver' ? styles.activeTab : {})
          }}
          onClick={() => handleTabChange('driver')}
          disabled={loading}
        >
          🚗 Driver
        </button>
        <button
          style={{
            ...styles.tab,
            ...(userType === 'admin' ? styles.activeTab : {})
          }}
          onClick={() => handleTabChange('admin')}
          disabled={loading}
        >
          👑 Admin
        </button>
      </div>

      {/* Form Fields */}
      <input
        type="email"
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={styles.input}
        disabled={loading}
      />
      <input
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={styles.input}
        disabled={loading}
      />

      {/* Driver-specific fields */}
      {userType === 'driver' && (
        <>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="Vehicle Number"
            style={styles.input}
            disabled={loading}
          />
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="License Number"
            style={styles.input}
            disabled={loading}
          />
        </>
      )}

      <button 
        onClick={handleSignup} 
        style={{
          ...styles.button,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
        disabled={loading}
      >
        {loading ? 'Signing up...' : 'Signup'}
      </button>
    </div>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '320px',
    margin: '0 auto',
    padding: '25px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  tabContainer: {
    display: 'flex',
    marginBottom: '10px',
    borderRadius: '5px',
    overflow: 'hidden',
    border: '1px solid #ccc',
  },
  tab: {
    flex: 1,
    padding: '10px 8px',
    fontSize: '14px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    borderRight: '1px solid #ccc',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    transition: 'border-color 0.3s ease',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    fontWeight: '500',
  }
};

export default Signup;
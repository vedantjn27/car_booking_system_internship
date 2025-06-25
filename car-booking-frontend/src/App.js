// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import BookRide from './components/BookRide'; // Fare calculation integrated here
import RideHistory from './components/RideHistory'; // Import the RideHistory component
import { auth } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import 'leaflet/dist/leaflet.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('book'); // 'book' or 'history'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setActiveTab('book'); // Reset to book tab on logout
      alert("👋 Logged out successfully.");
    } catch (error) {
      alert("❌ Error logging out: " + error.message);
    }
  };

  return (
    <div className="App" style={styles.container}>
      <h1 style={styles.heading}>🚗 Car Booking App</h1>
      
      {!isLoggedIn ? (
        <>
          <h2 style={styles.subheading}>{showLogin ? 'Login' : 'Signup'}</h2>
          {showLogin ? (
            <Login onLoginSuccess={() => setIsLoggedIn(true)} />
          ) : (
            <Signup onSignupSuccess={() => setIsLoggedIn(true)} />
          )}
          <p style={styles.toggleText}>
            {showLogin ? "Don't have an account?" : "Already have an account?"}
            <span onClick={() => setShowLogin(!showLogin)} style={styles.toggleLink}>
              {showLogin ? " Signup" : " Login"}
            </span>
          </p>
        </>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div style={styles.tabContainer}>
            <button
              onClick={() => setActiveTab('book')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'book' ? styles.activeTab : styles.inactiveTab)
              }}
            >
              🚗 Book Ride
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'history' ? styles.activeTab : styles.inactiveTab)
              }}
            >
              📋 Ride History
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'book' ? (
            <>
              <h2 style={styles.subheading}>Book a Ride</h2>
              <BookRide />
            </>
          ) : (
            <>
              <h2 style={styles.subheading}>Your Ride History</h2>
              <RideHistory />
            </>
          )}
          
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    padding: '20px',
    minHeight: '100vh',
    textAlign: 'center',
  },
  heading: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '10px',
  },
  subheading: {
    fontSize: '1.5rem',
    color: '#555',
    marginTop: '30px',
    marginBottom: '10px',
  },
  toggleText: {
    marginTop: '10px',
    color: '#555',
    fontSize: '14px',
  },
  toggleLink: {
    color: '#007BFF',
    cursor: 'pointer',
    marginLeft: '5px',
    textDecoration: 'underline',
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  tabButton: {
    padding: '12px 24px',
    fontSize: '16px',
    border: '2px solid #007BFF',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  activeTab: {
    backgroundColor: '#007BFF',
    color: '#fff',
  },
  inactiveTab: {
    backgroundColor: '#fff',
    color: '#007BFF',
  },
  logoutButton: {
    marginTop: '30px',
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#e53935',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
};

export default App;
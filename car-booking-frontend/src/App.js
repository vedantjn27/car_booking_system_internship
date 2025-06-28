// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import BookRide from './components/BookRide';
import MyRides from './components/MyRides';
import AdminRides from './components/AdminRides';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import DriverRides from './components/DriverRides';
import 'leaflet/dist/leaflet.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('book');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
      if (userData.user_type === 'admin') setActiveTab('admin');
      else if (userData.user_type === 'driver') setActiveTab('driver');
      else setActiveTab('book');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.user_type === 'admin') setActiveTab('admin');
    else if (userData.user_type === 'driver') setActiveTab('driver');
    else setActiveTab('book');
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setActiveTab('book');
    localStorage.removeItem('user');
    alert("Logged out successfully.");
  };

  const renderTabs = () => {
    if (!user) return null;
    const tabs = [];

    if (user.user_type === 'customer') {
      tabs.push(
        <button key="book" onClick={() => setActiveTab('book')} style={{ ...styles.tabButton, ...(activeTab === 'book' ? styles.activeTab : styles.inactiveTab) }}>Book Ride</button>,
        <button key="myrides" onClick={() => setActiveTab('myrides')} style={{ ...styles.tabButton, ...(activeTab === 'myrides' ? styles.activeTab : styles.inactiveTab) }}>My Rides</button>
      );
    }

    if (user.user_type === 'driver') {
      tabs.push(
        <button key="driver" onClick={() => setActiveTab('driver')} style={{ ...styles.tabButton, ...(activeTab === 'driver' ? styles.activeTab : styles.inactiveTab) }}>Driver Dashboard</button>,
      )
    }

    if (user.user_type === 'admin') {
      tabs.push(
        <button key="admin" onClick={() => setActiveTab('admin')} style={{ ...styles.tabButton, ...(activeTab === 'admin' ? styles.activeTab : styles.inactiveTab) }}>Admin Dashboard</button>,
        <button key="adminrides" onClick={() => setActiveTab('adminrides')} style={{ ...styles.tabButton, ...(activeTab === 'adminrides' ? styles.activeTab : styles.inactiveTab) }}>All Rides</button>
      );
    }

    return tabs;
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'book':
        return (
          <>
            <h2 style={styles.subheading}>Book a Ride</h2>
            <BookRide user={user} />
          </>
        );
      
        case 'myrides':
          return (
            <>
              <h2 style={styles.subheading}>My Rides</h2>
              {user.user_type === 'customer' ? (
                <MyRides user={user} />
              ) : user.user_type === 'driver' ? (
                <DriverRides />
              ) : null}
            </>
          );  

      case 'adminrides':
        return (
          <>
            <h2 style={styles.subheading}>All Rides</h2>
            <AdminRides />
          </>
        );
      case 'admin':
        return (
          <>
            <h2 style={styles.subheading}>Admin Dashboard</h2>
            <AdminDashboard user={user} />
          </>
        );
      case 'driver':
        return (
          <>
            <h2 style={styles.subheading}>Driver Dashboard</h2>
            <DriverDashboard user={user} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App" style={styles.container}>
      <h1 style={styles.heading}>Car Booking App</h1>

      {!isLoggedIn ? (
        <>
          <h2 style={styles.subheading}>{showLogin ? 'Login' : 'Signup'}</h2>
          {showLogin ? <Login onLoginSuccess={handleLoginSuccess} /> : <Signup onSignupSuccess={handleLoginSuccess} />}
          <p style={styles.toggleText}>
            {showLogin ? "Don't have an account?" : "Already have an account?"}
            <span onClick={() => setShowLogin(!showLogin)} style={styles.toggleLink}>
              {showLogin ? " Signup" : " Login"}
            </span>
          </p>
        </>
      ) : (
        <>
          <div style={styles.userInfo}>
            <p>Welcome, <strong>{user.email}</strong> ({user.user_type})</p>
          </div>
          <div style={styles.tabContainer}>
            {renderTabs()}
          </div>
          {renderContent()}
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
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
  userInfo: {
    backgroundColor: '#e8f5e8',
    padding: '10px',
    borderRadius: '8px',
    margin: '20px auto',
    maxWidth: '400px',
    color: '#2e7d32',
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
    flexWrap: 'wrap',
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

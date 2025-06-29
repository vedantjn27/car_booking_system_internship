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
        <button key="book" onClick={() => setActiveTab('book')} style={{ ...styles.tabButton, ...(activeTab === 'book' ? styles.activeTab : styles.inactiveTab) }}>
          <span style={styles.tabIcon}>🚗</span>
          Book Ride
        </button>,
        <button key="myrides" onClick={() => setActiveTab('myrides')} style={{ ...styles.tabButton, ...(activeTab === 'myrides' ? styles.activeTab : styles.inactiveTab) }}>
          <span style={styles.tabIcon}>📋</span>
          My Rides
        </button>
      );
    }

    if (user.user_type === 'driver') {
      tabs.push(
        <button key="driver" onClick={() => setActiveTab('driver')} style={{ ...styles.tabButton, ...(activeTab === 'driver' ? styles.activeTab : styles.inactiveTab) }}>
          <span style={styles.tabIcon}>🚙</span>
          Driver Dashboard
        </button>,
      )
    }

    if (user.user_type === 'admin') {
      tabs.push(
        <button key="admin" onClick={() => setActiveTab('admin')} style={{ ...styles.tabButton, ...(activeTab === 'admin' ? styles.activeTab : styles.inactiveTab) }}>
          <span style={styles.tabIcon}>⚙️</span>
          Admin Dashboard
        </button>,
        <button key="adminrides" onClick={() => setActiveTab('adminrides')} style={{ ...styles.tabButton, ...(activeTab === 'adminrides' ? styles.activeTab : styles.inactiveTab) }}>
          <span style={styles.tabIcon}>📊</span>
          All Rides
        </button>
      );
    }

    return tabs;
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'book':
        return (
          <div style={styles.contentCard}>
            <h2 style={styles.subheading}>
              <span style={styles.headingIcon}>🚗</span>
              Book a Ride
            </h2>
            <BookRide user={user} />
          </div>
        );
      
        case 'myrides':
          return (
            <div style={styles.contentCard}>
              <h2 style={styles.subheading}>
                <span style={styles.headingIcon}>📋</span>
                My Rides
              </h2>
              {user.user_type === 'customer' ? (
                <MyRides user={user} />
              ) : user.user_type === 'driver' ? (
                <DriverRides />
              ) : null}
            </div>
          );  

      case 'adminrides':
        return (
          <div style={styles.contentCard}>
            <h2 style={styles.subheading}>
              <span style={styles.headingIcon}>📊</span>
              All Rides
            </h2>
            <AdminRides />
          </div>
        );
      case 'admin':
        return (
          <div style={styles.contentCard}>
            <h2 style={styles.subheading}>
              <span style={styles.headingIcon}>⚙️</span>
              Admin Dashboard
            </h2>
            <AdminDashboard user={user} />
          </div>
        );
      case 'driver':
        return (
          <div style={styles.contentCard}>
            <h2 style={styles.subheading}>
              <span style={styles.headingIcon}>🚙</span>
              Driver Dashboard
            </h2>
            <DriverDashboard user={user} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App" style={styles.container}>
      <div style={styles.backgroundPattern}></div>
      
      <div style={styles.header}>
        <h1 style={styles.heading}>
          <span style={styles.logoIcon}>🚗</span>
          RideFlow
          <span style={styles.tagline}>Premium Car Booking</span>
        </h1>
      </div>

      {!isLoggedIn ? (
        <div style={styles.authContainer}>
          <div style={styles.authCard}>
            <h2 style={styles.authHeading}>
              <span style={styles.authIcon}>{showLogin ? '🔐' : '👤'}</span>
              {showLogin ? 'Welcome Back' : 'Join RideFlow'}
            </h2>
            <div style={styles.authContent}>
              {showLogin ? <Login onLoginSuccess={handleLoginSuccess} /> : <Signup onSignupSuccess={handleLoginSuccess} />}
            </div>
            <div style={styles.authToggle}>
              <p style={styles.toggleText}>
                {showLogin ? "New to RideFlow?" : "Already have an account?"}
              </p>
              <button onClick={() => setShowLogin(!showLogin)} style={styles.toggleButton}>
                {showLogin ? "Create Account" : "Sign In"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.dashboardContainer}>
          <div style={styles.userWelcome}>
            <div style={styles.userAvatar}>
              {user.user_type === 'admin' ? '👑' : user.user_type === 'driver' ? '🚗' : '👤'}
            </div>
            <div style={styles.userDetails}>
              <h3 style={styles.welcomeText}>Welcome back!</h3>
              <p style={styles.userEmail}>{user.email}</p>
              <span style={styles.userBadge}>{user.user_type}</span>
            </div>
          </div>

          <nav style={styles.navContainer}>
            <div style={styles.tabContainer}>
              {renderTabs()}
            </div>
          </nav>

          <main style={styles.mainContent}>
            {renderContent()}
          </main>

          <footer style={styles.footer}>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <span style={styles.logoutIcon}>🚪</span>
              Sign Out
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 50%)
    `,
    zIndex: 0,
  },
  header: {
    position: 'relative',
    zIndex: 1,
    padding: '30px 20px',
    textAlign: 'center',
  },
  heading: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: '800',
    background: 'linear-gradient(45deg, #ffffff, #f0f8ff)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
    margin: 0,
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  logoIcon: {
    fontSize: '3rem',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  tagline: {
    fontSize: '1rem',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '5px',
    display: 'block',
    width: '100%',
  },
  authContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
  },
  authCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 100px rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    maxWidth: '450px',
    width: '100%',
    animation: 'slideUp 0.6s ease-out',
  },
  authHeading: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '30px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  authIcon: {
    fontSize: '1.8rem',
  },
  authContent: {
    marginBottom: '30px',
  },
  authToggle: {
    textAlign: 'center',
    borderTop: '1px solid rgba(0,0,0,0.1)',
    paddingTop: '20px',
  },
  toggleText: {
    color: '#6c757d',
    marginBottom: '15px',
    fontSize: '14px',
  },
  toggleButton: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  dashboardContainer: {
    position: 'relative',
    zIndex: 1,
    padding: '0 20px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  userWelcome: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '25px',
    margin: '20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    animation: 'slideUp 0.6s ease-out',
  },
  userAvatar: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    color: 'white',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 5px 0',
  },
  userEmail: {
    color: '#6c757d',
    margin: '0 0 10px 0',
    fontSize: '1rem',
  },
  userBadge: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  navContainer: {
    margin: '20px 0',
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.1)',
    padding: '15px',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
  },
  tabButton: {
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
    overflow: 'hidden',
  },
  activeTab: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
  },
  inactiveTab: {
    background: 'rgba(255,255,255,0.9)',
    color: '#667eea',
    backdropFilter: 'blur(10px)',
  },
  tabIcon: {
    fontSize: '1.2rem',
  },
  mainContent: {
    margin: '30px 0',
  },
  contentCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    animation: 'slideUp 0.6s ease-out',
  },
  subheading: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center',
  },
  headingIcon: {
    fontSize: '1.5rem',
  },
  footer: {
    textAlign: 'center',
    margin: '30px 0',
  },
  logoutButton: {
    background: 'linear-gradient(45deg, #e74c3c, #c0392b)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 auto',
    boxShadow: '0 8px 25px rgba(231, 76, 60, 0.3)',
  },
  logoutIcon: {
    fontSize: '1.2rem',
  },
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .App button:hover {
    transform: translateY(-2px) !important;
  }
  
  .App button:active {
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(styleSheet);

export default App;
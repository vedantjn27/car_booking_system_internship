import React, { useState, useEffect } from 'react';

// Import your separate components
import LiveLocationTracker from './LiveLocationTracker';
import LiveMap from './LiveMap';

// For demo purposes, I'll create simplified versions of these components
// Replace these with your actual imports

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function DriverDashboard({ user = { email: 'driver@example.com' } }) {
  const [availableRides, setAvailableRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [driverStatus, setDriverStatus] = useState('offline');
  const [earnings, setEarnings] = useState({ total_earnings: 0, total_rides: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [driverRating, setDriverRating] = useState({ average_rating: 0.0, total_rides: 0 });
  const [activeTab, setActiveTab] = useState('dashboard'); // New state for active tab
  
  // State for active ride and map data
  const [activeRide, setActiveRide] = useState(null);
  const [mapData, setMapData] = useState({
    pickupCoords: null,
    dropCoords: null,
    driverCoords: null,
    pickupAddress: '',
    dropAddress: '',
    driverInfo: null
  });

  const driverEmail = user.email;

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(() => {
      if (driverStatus === 'online') {
        fetchAvailableRides();
      }
      fetchMyRides();
    }, 30000);
    return () => clearInterval(interval);
  }, [driverStatus]);

  const fetchDriverData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchAvailableRides(),
        fetchMyRides(),
        fetchEarnings(),
        fetchDriverRating()
      ]);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setError('Failed to load driver data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRides = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/available-rides`);
      if (!response.ok) {
        throw new Error('Failed to fetch available rides');
      }
      const rides = await response.json();
      
      // Transform backend data to match frontend format
      const transformedRides = rides.map(ride => ({
        id: ride._id,
        pickup_location: ride.pickup,
        destination: ride.drop,
        pickup_coords: ride.pickup_coords || [12.9716, 77.5946], // Default coords if not provided
        drop_coords: ride.drop_coords || [12.9279, 77.6271],
        distance: ride.distance || calculateDistance(ride.pickup_coords, ride.drop_coords),
        fare: ride.fare,
        customer_email: ride.rider_email,
        created_at: ride.created_at
      }));
      
      setAvailableRides(transformedRides);
    } catch (error) {
      console.error('Error fetching available rides:', error);
      // Fallback to mock data for demo
      setAvailableRides([
        {
          id: 'demo1',
          pickup_location: "MG Road, Bengaluru",
          destination: "Koramangala, Bengaluru",
          pickup_coords: [12.9716, 77.5946],
          drop_coords: [12.9279, 77.6271],
          distance: 8.5,
          fare: 250,
          customer_email: "customer1@example.com"
        }
      ]);
    }
  };

  const fetchMyRides = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/my-rides/${encodeURIComponent(driverEmail)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch my rides');
      }
      const rides = await response.json();
      
      // Transform backend data
      const transformedRides = rides.map(ride => ({
        id: ride._id,
        pickup_location: ride.pickup,
        destination: ride.drop,
        pickup_coords: ride.pickup_coords || [12.9716, 77.5946],
        drop_coords: ride.drop_coords || [12.9279, 77.6271],
        distance: ride.distance,
        fare: ride.fare,
        customer_email: ride.rider_email,
        status: ride.status,
        created_at: ride.created_at,
        completed_at: ride.completed_at
      }));
      
      setMyRides(transformedRides);
      
      // Check for ongoing ride
      const ongoingRide = transformedRides.find(ride => ride.status === 'ongoing');
      if (ongoingRide) {
        setActiveRide(ongoingRide);
        setDriverStatus('busy');
        updateMapData(ongoingRide);
      } else if (activeRide && driverStatus === 'busy') {
        // Ride was completed, clear active ride
        setActiveRide(null);
        setDriverStatus('online');
        clearMapData();
      }
    } catch (error) {
      console.error('Error fetching my rides:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/earnings/${encodeURIComponent(driverEmail)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }
      const earningsData = await response.json();
      setEarnings(earningsData);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      // Fallback to mock data
      setEarnings({ total_earnings: 1250, total_rides: 8 });
    }
  };

  const fetchDriverRating = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/${driverEmail}/rating`);
      if (!response.ok) {
        throw new Error('Failed to fetch driver rating');
      }
      const ratingData = await response.json();
      setDriverRating(ratingData);
    } catch (error) {
      console.error('Error fetching driver rating:', error);
      // Fallback to default rating
      setDriverRating({ average_rating: 0.0, total_rides: 0 });
    }
  };

  const toggleDriverStatus = async () => {
    const newStatus = driverStatus === 'online' ? 'offline' : 'online';
    
    try {
      // Update driver status in backend
      const response = await fetch(`${API_BASE_URL}/driver/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_email: driverEmail,
          is_available: newStatus === 'online'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update driver status');
      }

      setDriverStatus(newStatus);
      
      if (newStatus === 'online') {
        alert('✅ You are now online and location tracking is enabled');
        fetchAvailableRides(); // Fetch rides when going online
      } else {
        alert('✅ You are now offline and location tracking is disabled');
        // Clear active ride when going offline
        setActiveRide(null);
        clearMapData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Error updating status: ' + error.message);
    }
  };

  const acceptRide = async (ride) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/accept-ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ride_id: ride.id,
          driver_email: driverEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to accept ride');
      }

      // Set active ride data and update map
      setActiveRide(ride);
      updateMapData(ride);
      
      alert('✅ Ride accepted successfully!');
      setDriverStatus('busy');
      
      // Refresh data
      await Promise.all([
        fetchAvailableRides(),
        fetchMyRides()
      ]);
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('❌ Error accepting ride: ' + error.message);
    }
  };

  const completeActiveRide = async () => {
    if (!activeRide) return;

    try {
      const response = await fetch(`${API_BASE_URL}/driver/complete-ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ride_id: activeRide.id,
          driver_email: driverEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete ride');
      }

      alert('✅ Ride completed successfully!');
      setDriverStatus('online');
      setActiveRide(null);
      clearMapData();
      
      // Refresh data
      await Promise.all([
        fetchMyRides(),
        fetchEarnings(),
        fetchAvailableRides()
      ]);
    } catch (error) {
      console.error('Error completing ride:', error);
      alert('❌ Error completing ride: ' + error.message);
    }
  };

  const cancelActiveRide = async () => {
    if (!activeRide) return;
  
    if (!window.confirm('Are you sure you want to cancel this ride? This action cannot be undone.')) {
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/driver/cancel-ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ride_id: activeRide.id,
          driver_email: driverEmail
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel ride');
      }
  
      alert('⚠️ Ride cancelled successfully!');
      setDriverStatus('online');
      setActiveRide(null);
      clearMapData();
      
      // Refresh data
      await Promise.all([
        fetchMyRides(),
        fetchAvailableRides()
      ]);
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert('❌ Error cancelling ride: ' + error.message);
    }
  };

  const updateMapData = (ride) => {
    setMapData({
      pickupCoords: ride.pickup_coords,
      dropCoords: ride.drop_coords,
      driverCoords: [12.9716, 77.5946], // Mock driver location
      pickupAddress: ride.pickup_location,
      dropAddress: ride.destination,
      driverInfo: {
        id: 'DRV001',
        name: 'John Driver',
        phone: '+91 9876543210',
        vehicle: {
          model: 'Swift Dzire',
          number: 'KA01AB1234'
        },
        rating: 4.8,
        distance: 2.5,
        eta: 8
      }
    });
  };

  const clearMapData = () => {
    setMapData({
      pickupCoords: null,
      dropCoords: null,
      driverCoords: null,
      pickupAddress: '',
      dropAddress: '',
      driverInfo: null
    });
  };

  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return 0;
    // Simple distance calculation (you can implement haversine formula for accuracy)
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy) * 111; // Rough conversion to km
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'linear-gradient(135deg, #00c851, #00ff7f)';
      case 'busy': return 'linear-gradient(135deg, #ff8800, #ffb347)';
      case 'offline': return 'linear-gradient(135deg, #ff4444, #ff6b6b)';
      default: return 'linear-gradient(135deg, #666, #888)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '🟢';
      case 'busy': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  

  const renderDashboardContent = () => (
    <div style={styles.dashboardContent}>
      {/* Live Location Tracker - Only show when online or busy */}
      {(driverStatus === 'online' || driverStatus === 'busy') && (
        <div style={styles.section}>
          <LiveLocationTracker />
        </div>
      )}

      {/* Active Ride Map - Show when driver is busy */}
      {driverStatus === 'busy' && activeRide && (
        <div style={styles.section}>
          <div style={styles.activeRideCard}>
            <div style={styles.activeRideHeader}>
              <div style={styles.activeRideTitle}>
                <div style={styles.rideIcon}>🚕</div>
                <div>
                  <h3>Active Ride</h3>
                  <p style={styles.rideId}>#{activeRide.id.substring(0, 8)}</p>
                </div>
              </div>
              <div style={styles.activeRideActions}>
                <button
                  onClick={cancelActiveRide}
                  style={styles.cancelRideButton}
                >
                  <span>❌</span>
                  Cancel
                </button>
                <button
                  onClick={completeActiveRide}
                  style={styles.completeRideButton}
                >
                  <span>✅</span>
                  Complete
                </button>
              </div>
            </div>
            <div style={styles.rideInfoGrid}>
              <div style={styles.rideInfoCard}>
                <h5>📍 Route</h5>
                <p><strong>From:</strong> {activeRide.pickup_location}</p>
                <p><strong>To:</strong> {activeRide.destination}</p>
              </div>
              <div style={styles.rideInfoCard}>
                <h5>💰 Trip Details</h5>
                <p><strong>Fare:</strong> ₹{activeRide.fare}</p>
                <p><strong>Distance:</strong> {activeRide.distance} km</p>
              </div>
              <div style={styles.rideInfoCard}>
                <h5>👤 Customer</h5>
                <p>{activeRide.customer_email}</p>
              </div>
            </div>
          </div>
          <LiveMap
            pickupCoords={mapData.pickupCoords}
            dropCoords={mapData.dropCoords}
            driverCoords={mapData.driverCoords}
            pickupAddress={mapData.pickupAddress}
            dropAddress={mapData.dropAddress}
            driverInfo={mapData.driverInfo}
          />
        </div>
      )}

      {/* Available Rides - Only show when online */}
      {driverStatus === 'online' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>
              <h3>🚕 Available Rides</h3>
              <span style={styles.rideCount}>{availableRides.length} rides</span>
            </div>
            <button onClick={fetchAvailableRides} style={styles.refreshButton}>
              <span style={styles.refreshIcon}>🔄</span>
              Refresh
            </button>
          </div>
          {availableRides.length === 0 ? (
            <div style={styles.noRidesCard}>
              <div style={styles.noRidesIcon}>🕐</div>
              <h4>No rides available</h4>
              <p>Stay online to receive new ride requests automatically</p>
            </div>
          ) : (
            <div style={styles.ridesGrid}>
              {availableRides.map((ride, index) => (
                <div key={ride.id || index} style={styles.rideCard}>
                  <div style={styles.rideCardHeader}>
                    <div style={styles.rideCardTitle}>
                      <span style={styles.rideNumber}>#{ride.id.substring(0, 8)}</span>
                      <span style={styles.rideTime}>
                        {ride.ride_time ? new Date(ride.ride_time).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <div style={styles.fareDisplay}>₹{ride.fare}</div>
                  </div>
                  <div style={styles.rideRoute}>
                    <div style={styles.routePoint}>
                      <div style={styles.pickupDot}></div>
                      <span>{ride.pickup_location || 'N/A'}</span>
                    </div>
                    <div style={styles.routeArrow}>↓</div>
                    <div style={styles.routePoint}>
                      <div style={styles.dropDot}></div>
                      <span>{ride.destination || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={styles.rideMetrics}>
                    <div style={styles.metric}>
                      <span style={styles.metricIcon}>📏</span>
                      <span>{ride.distance} km</span>
                    </div>
                    <div style={styles.metric}>
                      <span style={styles.metricIcon}>👤</span>
                      <span>{ride.customer_email?.split('@')[0] || 'Customer'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => acceptRide(ride)}
                    style={styles.acceptButton}
                  >
                    <span style={styles.acceptIcon}>🚗</span>
                    Accept Ride
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offline Message */}
      {driverStatus === 'offline' && (
        <div style={styles.offlineCard}>
          <div style={styles.offlineIcon}>📱</div>
          <h3>You're Currently Offline</h3>
          <p>Turn on your status to start receiving ride requests and enable location tracking</p>
          <button
            onClick={toggleDriverStatus}
            style={styles.goOnlineButton}
          >
            <span>🟢</span>
            Go Online Now
          </button>
        </div>
      )}
    </div>
  );

  const renderRideHistoryContent = () => (
    <div style={styles.historyContent}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>
          <h3>📋 Ride History</h3>
          <span style={styles.rideCount}>{myRides.length} total rides</span>
        </div>
        <button onClick={fetchMyRides} style={styles.refreshButton}>
          <span style={styles.refreshIcon}>🔄</span>
          Refresh
        </button>
      </div>
      {myRides.length === 0 ? (
        <div style={styles.noRidesCard}>
          <div style={styles.noRidesIcon}>📝</div>
          <h4>No ride history</h4>
          <p>Your completed rides will appear here</p>
        </div>
      ) : (
        <div style={styles.ridesGrid}>
          {myRides.map((ride, index) => (
            <div key={ride.id || index} style={{
              ...styles.rideCard,
              ...(ride.status === 'completed' ? styles.completedRideCard : {})
            }}>
              <div style={styles.rideCardHeader}>
                <div style={styles.rideCardTitle}>
                  <span style={styles.rideNumber}>#{ride.id.substring(0, 8)}</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: ride.status === 'completed' ? '#28a745' : '#ff9800'
                  }}>
                    {ride.status.toUpperCase()}
                  </span>
                </div>
                <div style={styles.fareDisplay}>₹{ride.fare}</div>
              </div>
              <div style={styles.rideRoute}>
                <div style={styles.routePoint}>
                  <div style={styles.pickupDot}></div>
                  <span>{ride.pickup_location}</span>
                </div>
                <div style={styles.routeArrow}>↓</div>
                <div style={styles.routePoint}>
                  <div style={styles.dropDot}></div>
                  <span>{ride.destination}</span>
                </div>
              </div>
              <div style={styles.rideMetrics}>
                <div style={styles.metric}>
                  <span style={styles.metricIcon}>📏</span>
                  <span>{ride.distance} km</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricIcon}>👤</span>
                  <span>{ride.customer_email?.split('@')[0]}</span>
                </div>
              </div>
              <div style={styles.rideDates}>
                {ride.created_at && (
                  <p><strong>Started:</strong> {new Date(ride.created_at).toLocaleDateString()}</p>
                )}
                {ride.completed_at && (
                  <p><strong>Completed:</strong> {new Date(ride.completed_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Error Display */}
      {error && (
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorContent}>
            <p>{error}</p>
            <button onClick={fetchDriverData} style={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Driver Status Card */}
      <div style={styles.statusCard}>
        <div style={styles.statusHeader}>
          <div style={styles.statusInfo}>
            <h2>Driver Dashboard</h2>
            <p style={styles.driverEmail}>{driverEmail}</p>
          </div>
          <div style={{
            ...styles.statusBadge,
            background: getStatusColor(driverStatus)
          }}>
            <span style={styles.statusIcon}>{getStatusIcon(driverStatus)}</span>
            <span>{driverStatus.toUpperCase()}</span>
          </div>
        </div>
        
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statInfo}>
              <h3>₹{earnings.total_earnings}</h3>
              <p>Total Earnings</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>
            <div style={styles.statInfo}>
              <h3>{driverRating.average_rating}/5</h3>
              <p>Rating ({driverRating.total_rides} rated)</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🚗</div>
            <div style={styles.statInfo}>
              <h3>{earnings.total_rides}</h3>
              <p>Total Rides</p>
            </div>
          </div>
        </div>

        <div style={styles.statusActions}>
          <button
            onClick={toggleDriverStatus}
            style={{
              ...styles.statusButton,
              background: driverStatus === 'online' 
                ? 'linear-gradient(135deg, #ff4444, #ff6b6b)' 
                : 'linear-gradient(135deg, #00c851, #00ff7f)'
            }}
            disabled={driverStatus === 'busy'}
          >
            <span style={styles.buttonIcon}>
              {driverStatus === 'online' ? '🔴' : '🟢'}
            </span>
            {driverStatus === 'online' ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <div style={styles.tabHeader}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'dashboard' ? styles.activeTab : {})
            }}
          >
            <span style={styles.tabIcon}>🏠</span>
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'history' ? styles.activeTab : {})
            }}
          >
            <span style={styles.tabIcon}>📋</span>
            Ride History
            <span style={styles.tabBadge}>{myRides.length}</span>
          </button>
        </div>
        
        {/* Tab Content */}
        <div style={styles.tabContent}>
          {activeTab === 'dashboard' && renderDashboardContent()}
          {activeTab === 'history' && renderRideHistoryContent()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loadingSpinner: {
    textAlign: 'center',
    color: '#fff',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid #ffebee',
    borderLeft: '6px solid #f44336',
  },
  errorIcon: {
    fontSize: '24px',
  },
  errorContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#d32f2f',
      transform: 'translateY(-2px)',
    },
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  statusInfo: {
    flex: 1,
  },
  driverEmail: {
    color: '#666',
    fontSize: '16px',
    margin: '8px 0 0 0',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '50px',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
  },
  statusIcon: {
    fontSize: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    },
  },
  statIcon: {
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  statInfo: {
    flex: 1,
  },
  statusActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  statusButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    border: 'none',
    borderRadius: '16px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 25px rgba(0,0,0,0.25)',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
  buttonIcon: {
    fontSize: '18px',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    '&:hover': {
      backgroundColor: '#e2e8f0',
      color: '#475569',
    },
  },
  activeTab: {
    color: '#3b82f6',
    backgroundColor: '#fff',
    fontWeight: '600',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '3px',
      backgroundColor: '#3b82f6',
    },
  },
  tabIcon: {
    fontSize: '18px',
  },
  tabBadge: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center',
  },
  tabContent: {
    padding: '32px',
  },
  dashboardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  historyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rideCount: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#2563eb',
      transform: 'translateY(-2px)',
    },
  },
  refreshIcon: {
    fontSize: '16px',
  },
  liveTrackerContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #0ea5e9',
  },
  liveTrackerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  trackingStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#0ea5e9',
    fontWeight: '500',
  },
  pulsingDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  locationInfo: {
    color: '#0369a1',
  },
  mapContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  mapHeader: {
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  mapPlaceholder: {
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  mapContent: {
    textAlign: 'center',
  },
  routeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    minWidth: '250px',
  },
  pickupMarker: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: '600',
  },
  dropMarker: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: '600',
  },
  routeLine: {
    width: '2px',
    height: '30px',
    backgroundColor: '#94a3b8',
  },
  activeRideCard: {
    backgroundColor: '#fef3c7',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #f59e0b',
    marginBottom: '24px',
  },
  activeRideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  activeRideTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rideIcon: {
    fontSize: '32px',
  },
  rideId: {
    color: '#92400e',
    fontSize: '14px',
    margin: '4px 0 0 0',
  },
  activeRideActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelRideButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#dc2626',
      transform: 'translateY(-2px)',
    },
  },
  completeRideButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-2px)',
    },
  },
  rideInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  rideInfoCard: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #f59e0b',
  },
  noRidesCard: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '2px dashed #cbd5e1',
  },
  noRidesIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  offlineCard: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fef2f2',
    borderRadius: '16px',
    border: '2px solid #fecaca',
  },
  offlineIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  goOnlineButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-2px)',
    },
  },
  ridesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
      borderColor: '#3b82f6',
    },
  },
  completedRideCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  rideCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  rideCardTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rideNumber: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  rideTime: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  fareDisplay: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
  },
  rideRoute: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  pickupDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
  },
  dropDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
  },
  routeArrow: {
    color: '#94a3b8',
    fontSize: '16px',
    textAlign: 'center',
    margin: '4px 0',
  },
  rideMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  metric: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748b',
  },
  metricIcon: {
    fontSize: '16px',
  },
  acceptButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#2563eb',
      transform: 'translateY(-2px)',
    },
  },
  acceptIcon: {
    fontSize: '18px',
  },
  rideDates: {
    fontSize: '12px',
    color: '#64748b',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '12px',
    marginTop: '12px',
  },
};
export default DriverDashboard;
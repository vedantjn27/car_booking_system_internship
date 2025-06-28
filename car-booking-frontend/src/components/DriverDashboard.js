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
      case 'online': return '#4CAF50';
      case 'busy': return '#FF9800';
      case 'offline': return '#f44336';
      default: return '#666';
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
    <>
      {/* Live Location Tracker - Only show when online or busy */}
      {(driverStatus === 'online' || driverStatus === 'busy') && (
        <div style={styles.section}>
          <LiveLocationTracker />
        </div>
      )}

      {/* Active Ride Map - Show when driver is busy */}
      {driverStatus === 'busy' && activeRide && (
        <div style={styles.section}>
          <div style={styles.activeRideHeader}>
            <h3>🚕 Active Ride - #{activeRide.id.substring(0, 8)}</h3>
            <div style={styles.activeRideActions}>
              <button
                onClick={cancelActiveRide}
                style={styles.cancelRideButton}
              >
                ❌ Cancel Ride
              </button>
              <button
                onClick={completeActiveRide}
                style={styles.completeRideButton}
              >
                ✅ Complete Ride
              </button>
            </div>
          </div>
          <div style={styles.rideInfo}>
            <div style={styles.rideRoute}>
              <p><strong>From:</strong> {activeRide.pickup_location}</p>
              <p><strong>To:</strong> {activeRide.destination}</p>
              <p><strong>Fare:</strong> ₹{activeRide.fare}</p>
              <p><strong>Customer:</strong> {activeRide.customer_email}</p>
              <p><strong>Distance:</strong> {activeRide.distance} km</p>
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
            <h3>🚕 Available Rides ({availableRides.length})</h3>
            <button onClick={fetchAvailableRides} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
          {availableRides.length === 0 ? (
            <div style={styles.noRides}>
              <p>No rides available at the moment</p>
              <p>Stay online to receive new ride requests</p>
            </div>
          ) : (
            <div style={styles.ridesGrid}>
              {availableRides.map((ride, index) => (
                <div key={ride.id || index} style={styles.rideCard}>
                  <div style={styles.rideHeader}>
                    <strong>Ride #{ride.id.substring(0, 8)}</strong>
                    <span style={styles.fare}>₹{ride.fare}</span>
                  </div>
                  <div style={styles.rideDetails}>
                    <p><strong>From:</strong> {ride.pickup_location || 'N/A'}</p>
                    <p><strong>To:</strong> {ride.destination || 'N/A'}</p>
                    <p><strong>Distance:</strong> {ride.distance} km</p>
                    <p><strong>Customer:</strong> {ride.customer_email || 'N/A'}</p>
                    {ride.ride_time && (
                      <p><strong>Posted:</strong> {new Date(ride.ride_time).toLocaleTimeString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => acceptRide(ride)}
                    style={styles.acceptButton}
                  >
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
        <div style={styles.offlineMessage}>
          <h3>📴 You are currently offline</h3>
          <p>Click "Go Online" to start receiving ride requests and enable location tracking.</p>
        </div>
      )}
    </>
  );

  const renderRideHistoryContent = () => (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3>📋 My Rides History</h3>
        <button onClick={fetchMyRides} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>
      {myRides.length === 0 ? (
        <div style={styles.noRides}>
          <p>No ride history available</p>
        </div>
      ) : (
        <div style={styles.ridesGrid}>
          {myRides.map((ride, index) => (
            <div key={ride.id || index} style={{
              ...styles.rideCard,
              opacity: ride.status === 'completed' ? 0.8 : 1
            }}>
              <div style={styles.rideHeader}>
                <strong>#{ride.id.substring(0, 8)}</strong>
                <div>
                  <span style={{
                    ...styles.statusTag,
                    backgroundColor: ride.status === 'completed' ? '#28a745' : '#ff9800'
                  }}>
                    {ride.status.toUpperCase()}
                  </span>
                  <span style={styles.fare}>₹{ride.fare}</span>
                </div>
              </div>
              <div style={styles.rideDetails}>
                <p><strong>From:</strong> {ride.pickup_location}</p>
                <p><strong>To:</strong> {ride.destination}</p>
                <p><strong>Customer:</strong> {ride.customer_email}</p>
                <p><strong>Distance:</strong> {ride.distance} km</p>
                {ride.created_at && (
                  <p><strong>Created:</strong> {new Date(ride.created_at).toLocaleDateString()}</p>
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
    return <div style={styles.loading}>Loading driver dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Error Display */}
      {error && (
        <div style={styles.errorCard}>
          <p>⚠️ {error}</p>
          <button onClick={fetchDriverData} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Driver Status Card */}
      <div style={styles.statusCard}>
        <div style={styles.statusHeader}>
          <h3>Driver Status</h3>
          <span style={{...styles.statusBadge, backgroundColor: getStatusColor(driverStatus)}}>
            {getStatusIcon(driverStatus)} {driverStatus.toUpperCase()}
          </span>
        </div>
        <div style={styles.statusActions}>
          <button
            onClick={toggleDriverStatus}
            style={{
              ...styles.statusButton,
              backgroundColor: driverStatus === 'online' ? '#f44336' : '#4CAF50'
            }}
            disabled={driverStatus === 'busy'}
          >
            {driverStatus === 'online' ? '🔴 Go Offline' : '🟢 Go Online'}
          </button>
          <div style={styles.earningsSection}>
            <div style={styles.earnings}>
              <strong>Total Earnings: ₹{earnings.total_earnings}</strong>
            </div>
            <div style={styles.rating}>  
              Rating: ⭐ {driverRating.average_rating}/5 ({driverRating.total_rides} rated rides)
            </div>
            <div style={styles.ridesCount}>
              Total Rides: {earnings.total_rides}
            </div>
          </div>
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
            🏠 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'history' ? styles.activeTab : {})
            }}
          >
            📋 My Rides History ({myRides.length})
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#d32f2f',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  statusBadge: {
    padding: '10px 20px',
    borderRadius: '25px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  statusActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  statusButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  earningsSection: {
    textAlign: 'right',
  },
  earnings: {
    fontSize: '18px',
    color: '#4CAF50',
    fontWeight: '600',
  },
  ridesCount: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tabHeader: {
    display: 'flex',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
  },
  tabButton: {
    flex: 1,
    padding: '15px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s ease',
    borderBottom: '3px solid transparent',
  },
  activeTab: {
    color: '#4CAF50',
    backgroundColor: '#fff',
    borderBottom: '3px solid #4CAF50',
    fontWeight: '600',
  },
  tabContent: {
    padding: '20px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  activeRideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  completeRideButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  rideInfo: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  rideRoute: {
    fontSize: '14px',
    lineHeight: '1.6',
  },
  noRides: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
  },
  offlineMessage: {
    textAlign: 'center',
    padding: '60px 40px',
    color: '#666',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '2px dashed #dee2e6',
  },
  ridesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '15px',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    transition: 'transform 0.2s ease',
  },
  rideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  fare: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: '10px',
  },
  statusTag: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  rideDetails: {
    marginBottom: '15px',
    fontSize: '14px',
  },
  acceptButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
  },
  rating: {
    fontSize: '14px',
    color: '#FF9800',
    marginTop: '5px',
  },
  activeRideActions: {
    display: 'flex',
    gap: '10px',
  },
  cancelRideButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default DriverDashboard;
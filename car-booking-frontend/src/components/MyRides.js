import React, { useState, useEffect } from 'react';

const MyRides = ({ user }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ratingLoading, setRatingLoading] = useState({});
  const [cancelLoading, setCancelLoading] = useState({});

  const fetchMyRides = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`http://localhost:8000/rides/user/${user.email}`);
      if (!res.ok) throw new Error(`Error ${res.status}: Failed to fetch rides`);
      const data = await res.json();
      setRides(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRateRide = async (rideId, rating) => {
    setRatingLoading(prev => ({ ...prev, [rideId]: true }));
    
    try {
      const res = await fetch(`http://localhost:8000/rate-ride/${rideId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating }),
      });
      
      if (!res.ok) throw new Error('Failed to submit rating');
      
      const result = await res.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the local state to reflect the new rating
      setRides(prevRides => 
        prevRides.map(ride => 
          ride._id === rideId ? { ...ride, rating } : ride
        )
      );
      
    } catch (err) {
      alert(`Error rating ride: ${err.message}`);
    } finally {
      setRatingLoading(prev => ({ ...prev, [rideId]: false }));
    }
  };

  const handleCancelRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    setCancelLoading(prev => ({ ...prev, [rideId]: true }));
    
    try {
      const res = await fetch(`http://localhost:8000/cancel-ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ride_id: rideId }),
      });
      
      if (!res.ok) throw new Error('Failed to cancel ride');
      
      const result = await res.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the local state to reflect the cancelled status
      setRides(prevRides => 
        prevRides.map(ride => 
          ride._id === rideId ? { ...ride, status: 'cancelled' } : ride
        )
      );
      
      alert('Ride cancelled successfully');
      
    } catch (err) {
      alert(`Error cancelling ride: ${err.message}`);
    } finally {
      setCancelLoading(prev => ({ ...prev, [rideId]: false }));
    }
  };

  useEffect(() => {
    if (user && user.email) {
      fetchMyRides();
    }
  }, [user]);

  const totalSpent = rides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
  const completedRides = rides.filter(ride => ride.status === 'completed').length;
  const averageRating = () => {
    const ratedRides = rides.filter(r => r.rating && r.rating > 0);
    return ratedRides.length ? (ratedRides.reduce((a, r) => a + r.rating, 0) / ratedRides.length).toFixed(1) : '0.0';
  };

  const handleRefresh = () => {
    fetchMyRides();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'ongoing': return '#ffc107';
      case 'pending': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const StarRating = ({ rideId, currentRating, onRate, isLoading }) => {
    const [hoveredRating, setHoveredRating] = useState(0);

    return (
      <div style={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            style={{
              ...styles.starButton,
              color: (hoveredRating || currentRating) >= star ? '#ffd700' : '#ddd',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={() => !isLoading && setHoveredRating(star)}
            onMouseLeave={() => !isLoading && setHoveredRating(0)}
            onClick={() => !isLoading && onRate(rideId, star)}
            disabled={isLoading}
          >
            ⭐
          </button>
        ))}
        {isLoading && <span style={styles.ratingText}>Submitting...</span>}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerText}>
          <h2 style={styles.title}>🚗 My Rides</h2>
          <p style={styles.subtitle}>Your ride history and statistics</p>
        </div>
        <button onClick={handleRefresh} style={styles.refreshBtn} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Personal Stats */}
      <div style={styles.stats}>
        <div style={{ ...styles.statCard, backgroundColor: '#007bff' }}>
          <h3>{rides.length}</h3>
          <p>Total Rides</p>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#28a745' }}>
          <h3>{completedRides}</h3>
          <p>Completed</p>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#dc3545' }}>
          <h3>₹{totalSpent.toFixed(2)}</h3>
          <p>Total Spent</p>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#fd7e14' }}>
          <h3>⭐ {averageRating()}</h3>
          <p>Avg Rating</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loading}>
          <p>⏳ Loading your rides...</p>
        </div>
      ) : rides.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>🚫 No rides found</h3>
          <p>You haven't booked any rides yet. Start by booking your first ride!</p>
        </div>
      ) : (
        <div style={styles.ridesList}>
          <h3 style={styles.sectionTitle}>Recent Rides ({rides.length})</h3>
          {rides.map((ride, idx) => (
            <div key={ride._id || idx} style={styles.rideCard}>
              <div style={styles.rideHeader}>
                <div style={styles.rideRoute}>
                  <div style={styles.routePoint}>
                    <span style={styles.routeIcon}>📍</span>
                    <span><strong>From:</strong> {ride.pickup}</span>
                  </div>
                  <div style={styles.routeArrow}>→</div>
                  <div style={styles.routePoint}>
                    <span style={styles.routeIcon}>🏁</span>
                    <span><strong>To:</strong> {ride.drop}</span>
                  </div>
                </div>
                <div style={styles.statusAndActions}>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(ride.status)
                  }}>
                    {ride.status.toUpperCase()}
                  </div>
                  {ride.status === 'booked' && (
                    <button
                      onClick={() => handleCancelRide(ride._id)}
                      disabled={cancelLoading[ride._id]}
                      style={{
                        ...styles.cancelBtn,
                        opacity: cancelLoading[ride._id] ? 0.6 : 1,
                        cursor: cancelLoading[ride._id] ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {cancelLoading[ride._id] ? '⏳' : '❌'} Cancel
                    </button>
                  )}
                </div>
              </div>
              
              <div style={styles.rideDetails}>
                <div style={styles.detailRow}>
                  <span><strong>🚗 Driver:</strong> {ride.driver_id || 'Not assigned'}</span>
                  <span><strong>💰 Fare:</strong> ₹{ride.fare || '0.00'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span><strong>🕒 Time:</strong> {new Date(ride.ride_time).toLocaleString()}</span>
                  <div style={styles.ratingSection}>
                    <span><strong>⭐ Rating:</strong></span>
                    {ride.status === 'completed' ? (
                      ride.rating ? (
                        <span style={styles.ratingDisplay}>{ride.rating}/5 ⭐</span>
                      ) : (
                        <StarRating
                          rideId={ride._id}
                          currentRating={0}
                          onRate={handleRateRide}
                          isLoading={ratingLoading[ride._id]}
                        />
                      )
                    ) : (
                      <span style={styles.ratingText}>Available after completion</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0',
  },
  subtitle: {
    color: '#666',
    margin: 0,
    fontSize: '14px',
  },
  refreshBtn: {
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    textAlign: 'center',
    border: '1px solid #f5c6cb',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px dashed #ddd',
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '16px',
    fontWeight: '600',
  },
  ridesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rideCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  rideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  rideRoute: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    flexWrap: 'wrap',
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#333',
  },
  routeIcon: {
    fontSize: '14px',
  },
  routeArrow: {
    fontSize: '18px',
    color: '#007bff',
    fontWeight: 'bold',
  },
  statusAndActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  cancelBtn: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
  },
  rideDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#555',
    flexWrap: 'wrap',
    gap: '8px',
  },
  ratingSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  starRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  starButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    padding: '2px',
    transition: 'color 0.2s ease',
  },
  ratingDisplay: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  ratingText: {
    fontSize: '12px',
    color: '#888',
    marginLeft: '4px',
  },
};

export default MyRides;
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
      case 'completed': return 'linear-gradient(135deg, #00C851, #00A54F)';
      case 'cancelled': return 'linear-gradient(135deg, #FF4444, #CC0000)';
      case 'ongoing': return 'linear-gradient(135deg, #FFB347, #FF8C00)';
      case 'pending': return 'linear-gradient(135deg, #33B5E5, #0099CC)';
      default: return 'linear-gradient(135deg, #9E9E9E, #616161)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      case 'ongoing': return '🚗';
      case 'pending': return '⏳';
      default: return '❓';
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
              color: (hoveredRating || currentRating) >= star ? '#FFD700' : '#E0E0E0',
              transform: (hoveredRating || currentRating) >= star ? 'scale(1.1)' : 'scale(1)',
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
        {isLoading && (
          <span style={styles.loadingDots}>
            <span>.</span><span>.</span><span>.</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundPattern}></div>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>🚗</div>
          <div style={styles.headerText}>
            <h2 style={styles.title}>My Rides</h2>
            <p style={styles.subtitle}>Track your journey history and statistics</p>
          </div>
        </div>
        <button 
          onClick={handleRefresh} 
          style={{
            ...styles.refreshBtn,
            opacity: loading ? 0.7 : 1,
            transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
          }} 
          disabled={loading}
        >
          <span style={styles.refreshIcon}>🔄</span>
          Refresh
        </button>
      </div>

      {/* Personal Stats */}
      <div style={styles.stats}>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
          <div style={styles.statIcon}>📊</div>
          <h3 style={styles.statNumber}>{rides.length}</h3>
          <p style={styles.statLabel}>Total Rides</p>
        </div>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
          <div style={styles.statIcon}>✅</div>
          <h3 style={styles.statNumber}>{completedRides}</h3>
          <p style={styles.statLabel}>Completed</p>
        </div>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
          <div style={styles.statIcon}>💰</div>
          <h3 style={styles.statNumber}>₹{totalSpent.toFixed(2)}</h3>
          <p style={styles.statLabel}>Total Spent</p>
        </div>
        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
          <div style={styles.statIcon}>⭐</div>
          <h3 style={styles.statNumber}>{averageRating()}</h3>
          <p style={styles.statLabel}>Avg Rating</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <div style={styles.errorIcon}>⚠️</div>
          <div>
            <strong>Something went wrong!</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading your rides...</p>
        </div>
      ) : rides.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🚫</div>
          <h3 style={styles.emptyTitle}>No rides found</h3>
          <p style={styles.emptyText}>You haven't booked any rides yet. Start your journey today!</p>
          <div style={styles.emptyIllustration}>🗺️ → 🚗 → 🏁</div>
        </div>
      ) : (
        <div style={styles.ridesList}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Rides</h3>
            <span style={styles.ridesCount}>{rides.length} total</span>
          </div>
          
          {rides.map((ride, idx) => (
            <div key={ride._id || idx} style={styles.rideCard}>
              <div style={styles.rideHeader}>
                <div style={styles.rideRoute}>
                  <div style={styles.routeContainer}>
                    <div style={styles.routePoint}>
                      <div style={styles.routeIconContainer}>
                        <span style={styles.routeIcon}>📍</span>
                      </div>
                      <div style={styles.routeText}>
                        <span style={styles.routeLabel}>From</span>
                        <span style={styles.routeValue}>{ride.pickup}</span>
                      </div>
                    </div>
                    
                    <div style={styles.routeLine}>
                      <div style={styles.routeArrow}></div>
                    </div>
                    
                    <div style={styles.routePoint}>
                      <div style={styles.routeIconContainer}>
                        <span style={styles.routeIcon}>🏁</span>
                      </div>
                      <div style={styles.routeText}>
                        <span style={styles.routeLabel}>To</span>
                        <span style={styles.routeValue}>{ride.drop}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={styles.statusAndActions}>
                  <div style={{
                    ...styles.statusBadge,
                    background: getStatusColor(ride.status)
                  }}>
                    <span style={styles.statusIcon}>{getStatusIcon(ride.status)}</span>
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
                      {cancelLoading[ride._id] ? (
                        <div style={styles.miniSpinner}></div>
                      ) : (
                        <>❌ Cancel</>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              <div style={styles.rideDetails}>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>👨‍✈️</span>
                    <div style={styles.detailContent}>
                      <span style={styles.detailLabel}>Driver</span>
                      <span style={styles.detailValue}>{ride.driver_id || 'Not assigned'}</span>
                    </div>
                  </div>
                  
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>💳</span>
                    <div style={styles.detailContent}>
                      <span style={styles.detailLabel}>Fare</span>
                      <span style={styles.detailValue}>₹{ride.fare || '0.00'}</span>
                    </div>
                  </div>
                  
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>🕒</span>
                    <div style={styles.detailContent}>
                      <span style={styles.detailLabel}>Time</span>
                      <span style={styles.detailValue}>{new Date(ride.ride_time).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>⭐</span>
                    <div style={styles.detailContent}>
                      <span style={styles.detailLabel}>Rating</span>
                      <div style={styles.ratingContainer}>
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
                          <span style={styles.ratingPending}>Available after completion</span>
                        )}
                      </div>
                    </div>
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
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '100vh',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)
    `,
    animation: 'float 6s ease-in-out infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIcon: {
    fontSize: '40px',
    animation: 'bounce 2s infinite',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 4px 0',
  },
  subtitle: {
    color: '#666',
    margin: 0,
    fontSize: '16px',
    fontWeight: '400',
  },
  refreshBtn: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  refreshIcon: {
    transition: 'transform 0.5s ease',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
    position: 'relative',
    zIndex: 1,
  },
  statCard: {
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px',
    display: 'block',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '8px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: '500',
    margin: 0,
    opacity: 0.9,
  },
  error: {
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
    color: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  errorIcon: {
    fontSize: '24px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    position: 'relative',
    zIndex: 1,
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
  },
  loadingDots: {
    display: 'inline-flex',
    gap: '2px',
    marginLeft: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    border: '2px dashed #ddd',
    position: 'relative',
    zIndex: 1,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    color: '#333',
    margin: '0 0 8px 0',
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    fontSize: '16px',
    marginBottom: '20px',
  },
  emptyIllustration: {
    fontSize: '20px',
    letterSpacing: '8px',
    opacity: 0.7,
  },
  ridesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
    zIndex: 1,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  sectionTitle: {
    fontSize: '24px',
    color: 'white',
    margin: 0,
    fontWeight: '600',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  ridesCount: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  rideCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  rideHeader: {
    marginBottom: '20px',
  },
  rideRoute: {
    marginBottom: '16px',
  },
  routeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: '200px',
  },
  routeIconContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
  },
  routeText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  routeLabel: {
    fontSize: '12px',
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  routeValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600',
  },
  routeLine: {
    height: '2px',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    position: 'relative',
    flex: '0 0 40px',
  },
  routeArrow: {
    position: 'absolute',
    right: '-6px',
    top: '-4px',
    width: 0,
    height: 0,
    borderLeft: '6px solid #764ba2',
    borderTop: '5px solid transparent',
    borderBottom: '5px solid transparent',
  },
  statusAndActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  statusIcon: {
    fontSize: '14px',
  },
  cancelBtn: {
    padding: '6px 12px',
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
  },
  miniSpinner: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  rideDetails: {
    borderTop: '1px solid #eee',
    paddingTop: '20px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '8px',
  },
  detailIcon: {
    fontSize: '16px',
    width: '24px',
    textAlign: 'center',
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  detailLabel: {
    fontSize: '12px',
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600',
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  starRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  starButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    padding: '4px',
    transition: 'all 0.2s ease',
    borderRadius: '4px',
  },
  ratingDisplay: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: '14px',
  },
  ratingPending: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  
  .rideCard:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  }
  
  .statCard:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }
  
  .refreshBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }
  
  .cancelBtn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.5);
  }
  
  .starButton:hover {
    background: rgba(255, 215, 0, 0.1);
  }
  
  .loadingDots span {
    animation: loadingDots 1.4s infinite ease-in-out both;
  }
  
  .loadingDots span:nth-child(1) { animation-delay: -0.32s; }
  .loadingDots span:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes loadingDots {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}

export default MyRides;
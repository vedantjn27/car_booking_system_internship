import React, { useState, useEffect } from 'react';

const AdminRides = ({ user }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [filterUserId, setFilterUserId] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [stats, setStats] = useState({});

  const fetchRides = async (type = 'all', userId = '') => {
    setLoading(true);
    setError('');
    
    let url = 'http://localhost:8000/rides';
    if (type === 'user' && userId) {
      url = `http://localhost:8000/rides/user/${userId}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}: Failed to fetch rides`);
      const data = await res.json();
      setRides(data);
      calculateStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ridesData) => {
    const totalRides = ridesData.length;
    const totalEarnings = ridesData.reduce((sum, ride) => sum + (ride.fare || 0), 0);
    const completedRides = ridesData.filter(ride => ride.status === 'completed').length;
    const cancelledRides = ridesData.filter(ride => ride.status === 'cancelled').length;
    const ongoingRides = ridesData.filter(ride => ride.status === 'ongoing').length;
    const pendingRides = ridesData.filter(ride => ride.status === 'pending').length;
    
    const ratedRides = ridesData.filter(r => r.rating && r.rating > 0);
    const averageRating = ratedRides.length ? 
      (ratedRides.reduce((a, r) => a + r.rating, 0) / ratedRides.length) : 0;

    // Get unique users and drivers
    const uniqueUsers = new Set(ridesData.map(r => r.rider_id)).size;
    const uniqueDrivers = new Set(ridesData.map(r => r.driver_id)).size;

    setStats({
      totalRides,
      totalEarnings,
      completedRides,
      cancelledRides,
      ongoingRides,
      pendingRides,
      averageRating,
      uniqueUsers,
      uniqueDrivers,
      completionRate: totalRides > 0 ? ((completedRides / totalRides) * 100) : 0
    });
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'all') {
      fetchRides('all');
    }
  };

  const handleUserSearch = () => {
    if (filterUserId.trim()) {
      fetchRides('user', filterUserId.trim());
    }
  };

  const sortRides = (ridesArray) => {
    const sorted = [...ridesArray];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.ride_time) - new Date(a.ride_time));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.ride_time) - new Date(b.ride_time));
      case 'fare_high':
        return sorted.sort((a, b) => (b.fare || 0) - (a.fare || 0));
      case 'fare_low':
        return sorted.sort((a, b) => (a.fare || 0) - (b.fare || 0));
      case 'rating_high':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return sorted;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'cancelled': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'ongoing': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'pending': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
      default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
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

  const sortedRides = sortRides(rides);

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundPattern}></div>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerText}>
            <h1 style={styles.title}>
              <span style={styles.titleIcon}>👑</span>
              Admin Dashboard
              <div style={styles.titleUnderline}></div>
            </h1>
            <p style={styles.subtitle}>Comprehensive ride management and analytics platform</p>
          </div>
          <button 
            onClick={() => fetchRides(viewMode, filterUserId)} 
            style={{...styles.refreshBtn, ...(loading ? styles.refreshBtnLoading : {})}} 
            disabled={loading}
          >
            <span style={{...styles.refreshIcon, ...(loading ? styles.spinning : {})}}>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div style={styles.controls}>
        <div style={styles.controlsHeader}>
          <h3 style={styles.controlsTitle}>🎛️ Control Panel</h3>
        </div>
        
        <div style={styles.viewModeButtons}>
          <button 
            onClick={() => handleViewModeChange('all')}
            style={{
              ...styles.controlButton,
              ...(viewMode === 'all' ? styles.activeButton : {})
            }}
          >
            <span style={styles.buttonIcon}>🌐</span>
            All Rides
          </button>
          <button 
            onClick={() => handleViewModeChange('user')}
            style={{
              ...styles.controlButton,
              ...(viewMode === 'user' ? styles.activeButton : {})
            }}
          >
            <span style={styles.buttonIcon}>👤</span>
            Filter by User
          </button>
        </div>

        {viewMode === 'user' && (
          <div style={styles.userFilter}>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}>🔍</span>
              <input
                style={styles.input}
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="Enter user email or ID..."
                onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
              />
            </div>
            <button onClick={handleUserSearch} style={styles.searchBtn}>
              <span style={styles.buttonIcon}>🔍</span>
              Search User
            </button>
          </div>
        )}

        <div style={styles.sortControls}>
          <label style={styles.sortLabel}>
            <span style={styles.sortIcon}>📊</span>
            Sort by:
          </label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="recent">📅 Most Recent</option>
            <option value="oldest">🕰️ Oldest First</option>
            <option value="fare_high">💰 Highest Fare</option>
            <option value="fare_low">💸 Lowest Fare</option>
            <option value="rating_high">⭐ Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      <div style={styles.statsSection}>
        <div style={styles.statsHeader}>
          <h3 style={styles.statsTitle}>
            <span style={styles.statsIcon}>📊</span>
            Platform Analytics
          </h3>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot}></span>
            Live Data
          </div>
        </div>
        
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div style={styles.statIcon}>🚗</div>
            <h3 style={styles.statValue}>{stats.totalRides || 0}</h3>
            <p style={styles.statLabel}>Total Rides</p>
            <div style={styles.statSparkle}></div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div style={styles.statIcon}>💰</div>
            <h3 style={styles.statValue}>₹{(stats.totalEarnings || 0).toFixed(2)}</h3>
            <p style={styles.statLabel}>Total Earnings</p>
            <div style={styles.statSparkle}></div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div style={styles.statIcon}>⭐</div>
            <h3 style={styles.statValue}>{(stats.averageRating || 0).toFixed(1)}</h3>
            <p style={styles.statLabel}>Avg Rating</p>
            <div style={styles.statSparkle}></div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <div style={styles.statIcon}>✅</div>
            <h3 style={styles.statValue}>{(stats.completionRate || 0).toFixed(1)}%</h3>
            <p style={styles.statLabel}>Completion Rate</p>
            <div style={styles.statSparkle}></div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <div style={styles.statIcon}>👥</div>
            <h3 style={styles.statValue}>{stats.uniqueUsers || 0}</h3>
            <p style={styles.statLabel}>Active Users</p>
            <div style={styles.statSparkle}></div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <div style={styles.statIcon}>🚕</div>
            <h3 style={styles.statValue}>{stats.uniqueDrivers || 0}</h3>
            <p style={styles.statLabel}>Active Drivers</p>
            <div style={styles.statSparkle}></div>
          </div>
        </div>

        {/* Enhanced Status Breakdown */}
        <div style={styles.statusBreakdown}>
          <h4 style={styles.breakdownTitle}>
            <span style={styles.breakdownIcon}>📈</span>
            Ride Status Breakdown
          </h4>
          <div style={styles.statusCards}>
            <div style={styles.statusCard}>
              <div style={styles.statusCardHeader}>
                <span style={styles.statusEmoji}>✅</span>
                <span style={styles.statusCount}>{stats.completedRides || 0}</span>
              </div>
              <span style={styles.statusLabel}>Completed</span>
              <div style={styles.statusProgress}>
                <div style={{
                  ...styles.statusProgressBar,
                  width: `${stats.totalRides ? (stats.completedRides / stats.totalRides) * 100 : 0}%`,
                  backgroundColor: '#10b981'
                }}></div>
              </div>
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusCardHeader}>
                <span style={styles.statusEmoji}>🚗</span>
                <span style={styles.statusCount}>{stats.ongoingRides || 0}</span>
              </div>
              <span style={styles.statusLabel}>Ongoing</span>
              <div style={styles.statusProgress}>
                <div style={{
                  ...styles.statusProgressBar,
                  width: `${stats.totalRides ? (stats.ongoingRides / stats.totalRides) * 100 : 0}%`,
                  backgroundColor: '#f59e0b'
                }}></div>
              </div>
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusCardHeader}>
                <span style={styles.statusEmoji}>⏳</span>
                <span style={styles.statusCount}>{stats.pendingRides || 0}</span>
              </div>
              <span style={styles.statusLabel}>Pending</span>
              <div style={styles.statusProgress}>
                <div style={{
                  ...styles.statusProgressBar,
                  width: `${stats.totalRides ? (stats.pendingRides / stats.totalRides) * 100 : 0}%`,
                  backgroundColor: '#3b82f6'
                }}></div>
              </div>
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusCardHeader}>
                <span style={styles.statusEmoji}>❌</span>
                <span style={styles.statusCount}>{stats.cancelledRides || 0}</span>
              </div>
              <span style={styles.statusLabel}>Cancelled</span>
              <div style={styles.statusProgress}>
                <div style={{
                  ...styles.statusProgressBar,
                  width: `${stats.totalRides ? (stats.cancelledRides / stats.totalRides) * 100 : 0}%`,
                  backgroundColor: '#ef4444'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} style={styles.errorClose}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading rides data...</p>
        </div>
      ) : sortedRides.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🚫</div>
          <h3 style={styles.emptyTitle}>No rides found</h3>
          <p style={styles.emptyText}>
            {viewMode === 'user' ? 'No rides found for the specified user.' : 'No rides available in the system.'}
          </p>
        </div>
      ) : (
        <div style={styles.ridesList}>
          <div style={styles.ridesHeader}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>🚗</span>
              All Rides ({sortedRides.length})
              {viewMode === 'user' && filterUserId && (
                <span style={styles.filterBadge}>Filtered by: {filterUserId}</span>
              )}
            </h3>
          </div>
          
          <div style={styles.ridesContainer}>
            {sortedRides.map((ride, idx) => (
              <div key={ride._id || idx} style={styles.rideCard}>
                <div style={styles.rideCardGlow}></div>
                
                <div style={styles.rideHeader}>
                  <div style={styles.rideRoute}>
                    <div style={styles.routePoint}>
                      <span style={styles.routeIcon}>📍</span>
                      <div style={styles.routeText}>
                        <span style={styles.routeLabel}>From</span>
                        <span style={styles.routeLocation}>{ride.pickup}</span>
                      </div>
                    </div>
                    <div style={styles.routeArrow}>
                      <span style={styles.arrowLine}></span>
                      <span style={styles.arrowHead}>▶</span>
                    </div>
                    <div style={styles.routePoint}>
                      <span style={styles.routeIcon}>🏁</span>
                      <div style={styles.routeText}>
                        <span style={styles.routeLabel}>To</span>
                        <span style={styles.routeLocation}>{ride.drop}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    background: getStatusColor(ride.status)
                  }}>
                    <span style={styles.statusIcon}>{getStatusIcon(ride.status)}</span>
                    {ride.status ? ride.status.toUpperCase() : 'UNKNOWN'}
                  </div>
                </div>
                
                <div style={styles.rideDetails}>
                  <div style={styles.detailRow}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>👤</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Rider</span>
                        <span style={styles.detailValue}>{ride.rider_id}</span>
                      </div>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>🚗</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Driver</span>
                        <span style={styles.detailValue}>{ride.driver_id || 'Not assigned'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.detailRow}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>💰</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Fare</span>
                        <span style={styles.detailValue}>₹{ride.fare || '0.00'}</span>
                      </div>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>⭐</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Rating</span>
                        <span style={styles.detailValue}>{ride.rating ? `${ride.rating}/5` : 'Not rated'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.detailRow}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>🕒</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Time</span>
                        <span style={styles.detailValue}>{new Date(ride.ride_time).toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailIcon}>🆔</span>
                      <div style={styles.detailContent}>
                        <span style={styles.detailLabel}>Ride ID</span>
                        <span style={styles.detailValue}>{ride._id || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
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
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
    `,
    zIndex: 0,
  },
  header: {
    position: 'relative',
    zIndex: 1,
    marginBottom: '32px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 8px 0',
    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  titleIcon: {
    fontSize: '56px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  titleUnderline: {
    position: 'absolute',
    bottom: '-8px',
    left: '0',
    width: '60%',
    height: '4px',
    background: 'linear-gradient(90deg, #fff, transparent)',
    borderRadius: '2px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    margin: 0,
    fontSize: '18px',
    fontWeight: '400',
    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
  refreshBtn: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
    color: '#1e293b',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backdropFilter: 'blur(10px)',
  },
  refreshBtnLoading: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  refreshIcon: {
    fontSize: '18px',
    transition: 'transform 0.6s ease',
  },
  spinning: {
    animation: 'spin 1s linear infinite',
  },
  controls: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '32px',
    padding: '32px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  controlsHeader: {
    marginBottom: '16px',
  },
  controlsTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewModeButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  controlButton: {
    padding: '12px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    background: 'white',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  activeButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    borderColor: 'transparent',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
    transform: 'translateY(-2px)',
  },
  userFilter: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  inputGroup: {
    position: 'relative',
    flex: 1,
    minWidth: '300px',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#64748b',
    zIndex: 2,
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 48px',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease',
    background: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
  },
  searchBtn: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortIcon: {
    fontSize: '18px',
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
    cursor: 'pointer',
    background: 'white',
    fontWeight: '500',
    color: '#1e293b',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  statsSection: {
    position: 'relative',
    zIndex: 1,
    marginBottom: '32px',
  },
  statsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statsTitle: {
    fontSize: '28px',
    color: 'white',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  statsIcon: {
    fontSize: '32px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 2s infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    position: 'relative',
    padding: '32px',
    borderRadius: '24px',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-8px)',
    },
  },
  statIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '8px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  statLabel: {
    fontSize: '16px',
    fontWeight: '500',
    opacity: 0.9,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statSparkle: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '20px',
    height: '20px',
    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'sparkle 3s infinite',
  },
  statusBreakdown: {
    background: 'rgba(255,255,255,0.95)',
    padding: '32px',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  breakdownTitle: {
    fontSize: '20px',
    color: '#1e293b',
    marginBottom: '24px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  breakdownIcon: {
    fontSize: '24px',
  },
  statusCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statusCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #f8fafc, #ffffff)',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  statusCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  statusEmoji: {
    fontSize: '24px',
  },
  statusCount: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1e293b',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  statusProgress: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  statusProgressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.8s ease',
  },
  error: {
    position: 'relative',
    zIndex: 1,
    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    color: '#991b1b',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #fecaca',
    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
  },
  errorIcon: {
    fontSize: '24px',
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#991b1b',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  loading: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: '60px',
    color: 'white',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '6px solid rgba(255,255,255,0.3)',
    borderTop: '6px solid white',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '18px',
    fontWeight: '500',
    margin: 0,
  },
  emptyState: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: '60px',
    color: 'white',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    border: '2px dashed rgba(255,255,255,0.3)',
  },
  emptyIcon: {
    fontSize: '80px',
    marginBottom: '20px',
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  emptyText: {
    fontSize: '16px',
    opacity: 0.8,
    margin: 0,
  },
  ridesList: {
    position: 'relative',
    zIndex: 1,
  },
  ridesHeader: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '28px',
    color: 'white',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    flexWrap: 'wrap',
  },
  sectionIcon: {
    fontSize: '32px',
  },
  filterBadge: {
    fontSize: '14px',
    background: 'rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '500',
    marginLeft: '16px',
  },
  ridesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rideCard: {
    position: 'relative',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '24px',
    padding: '32px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  rideCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c)',
    backgroundSize: '300% 100%',
    animation: 'gradient 3s ease infinite',
  },
  rideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  rideRoute: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1,
    flexWrap: 'wrap',
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '200px',
  },
  routeIcon: {
    fontSize: '20px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  },
  routeText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  routeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  routeLocation: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  routeArrow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#667eea',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  arrowLine: {
    width: '40px',
    height: '2px',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '1px',
  },
  arrowHead: {
    fontSize: '16px',
  },
  statusBadge: {
    padding: '12px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  statusIcon: {
    fontSize: '16px',
  },
  rideDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: '200px',
  },
  detailIcon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
};

// Add keyframe animations
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .${styles.rideCard}:hover {
    transform: translateY(-4px);
    box-shadow: 0 32px 80px rgba(0,0,0,0.15);
  }
  
  .${styles.statCard}:hover {
    transform: translateY(-8px);
    box-shadow: 0 32px 80px rgba(0,0,0,0.25);
  }
  
  .${styles.statusCard}:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.12);
  }
  
  .${styles.controlButton}:hover:not(.${styles.activeButton}) {
    border-color: #667eea;
    color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
  }
  
  .${styles.refreshBtn}:hover:not(.${styles.refreshBtnLoading}) {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(0,0,0,0.2);
  }
  
  .${styles.searchBtn}:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(16, 185, 129, 0.4);
  }
  
  .${styles.input}:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  .${styles.select}:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  .${styles.errorClose}:hover {
    background-color: rgba(185, 28, 28, 0.1);
  }
`;

if (!document.head.querySelector('style[data-admin-rides]')) {
  styleElement.setAttribute('data-admin-rides', 'true');
  document.head.appendChild(styleElement);
}

export default AdminRides;
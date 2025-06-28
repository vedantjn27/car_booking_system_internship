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
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'ongoing': return '#ffc107';
      case 'pending': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const sortedRides = sortRides(rides);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerText}>
          <h2 style={styles.title}>👑 Admin - All Rides</h2>
          <p style={styles.subtitle}>Comprehensive ride management and analytics</p>
        </div>
        <button onClick={() => fetchRides(viewMode, filterUserId)} style={styles.refreshBtn} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.viewModeButtons}>
          <button 
            onClick={() => handleViewModeChange('all')}
            style={{
              ...styles.controlButton,
              ...(viewMode === 'all' ? styles.activeButton : {})
            }}
          >
            All Rides
          </button>
          <button 
            onClick={() => handleViewModeChange('user')}
            style={{
              ...styles.controlButton,
              ...(viewMode === 'user' ? styles.activeButton : {})
            }}
          >
            Filter by User
          </button>
        </div>

        {viewMode === 'user' && (
          <div style={styles.userFilter}>
            <input
              style={styles.input}
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Enter user email or ID"
              onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
            />
            <button onClick={handleUserSearch} style={styles.searchBtn}>
              🔍 Search
            </button>
          </div>
        )}

        <div style={styles.sortControls}>
          <label style={styles.sortLabel}>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="fare_high">Highest Fare</option>
            <option value="fare_low">Lowest Fare</option>
            <option value="rating_high">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Comprehensive Stats */}
      <div style={styles.statsSection}>
        <h3 style={styles.statsTitle}>📊 Platform Analytics</h3>
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, backgroundColor: '#007bff' }}>
            <h3>{stats.totalRides || 0}</h3>
            <p>Total Rides</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#28a745' }}>
            <h3>₹{(stats.totalEarnings || 0).toFixed(2)}</h3>
            <p>Total Earnings</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#fd7e14' }}>
            <h3>⭐ {(stats.averageRating || 0).toFixed(1)}</h3>
            <p>Avg Rating</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#6f42c1' }}>
            <h3>{(stats.completionRate || 0).toFixed(1)}%</h3>
            <p>Completion Rate</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#17a2b8' }}>
            <h3>{stats.uniqueUsers || 0}</h3>
            <p>Active Users</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#20c997' }}>
            <h3>{stats.uniqueDrivers || 0}</h3>
            <p>Active Drivers</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div style={styles.statusBreakdown}>
          <h4 style={styles.breakdownTitle}>Ride Status Breakdown</h4>
          <div style={styles.statusCards}>
            <div style={styles.statusCard}>
              <span style={styles.statusCount}>{stats.completedRides || 0}</span>
              <span style={styles.statusLabel}>Completed</span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusCount}>{stats.ongoingRides || 0}</span>
              <span style={styles.statusLabel}>Ongoing</span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusCount}>{stats.pendingRides || 0}</span>
              <span style={styles.statusLabel}>Pending</span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusCount}>{stats.cancelledRides || 0}</span>
              <span style={styles.statusLabel}>Cancelled</span>
            </div>
          </div>
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
          <p>⏳ Loading rides data...</p>
        </div>
      ) : sortedRides.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>🚫 No rides found</h3>
          <p>{viewMode === 'user' ? 'No rides found for the specified user.' : 'No rides available in the system.'}</p>
        </div>
      ) : (
        <div style={styles.ridesList}>
          <h3 style={styles.sectionTitle}>
            All Rides ({sortedRides.length})
            {viewMode === 'user' && filterUserId && ` - Filtered by: ${filterUserId}`}
          </h3>
          {sortedRides.map((ride, idx) => (
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
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(ride.status)
                }}>
                  {ride.status ? ride.status.toUpperCase() : 'UNKNOWN'}
                </div>
              </div>
              
              <div style={styles.rideDetails}>
                <div style={styles.detailRow}>
                  <span><strong>👤 Rider:</strong> {ride.rider_id}</span>
                  <span><strong>🚗 Driver:</strong> {ride.driver_id || 'Not assigned'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span><strong>💰 Fare:</strong> ₹{ride.fare || '0.00'}</span>
                  <span><strong>⭐ Rating:</strong> {ride.rating ? `${ride.rating}/5` : 'Not rated'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span><strong>🕒 Time:</strong> {new Date(ride.ride_time).toLocaleString()}</span>
                  <span><strong>🆔 Ride ID:</strong> {ride._id || 'N/A'}</span>
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
    maxWidth: '1200px',
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
    transition: 'all 0.2s ease',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },
  viewModeButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  controlButton: {
    padding: '8px 16px',
    border: '2px solid #007bff',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  activeButton: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  userFilter: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '250px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  searchBtn: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  select: {
    padding: '6px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  statsSection: {
    marginBottom: '24px',
  },
  statsTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '16px',
    fontWeight: '600',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statusBreakdown: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },
  breakdownTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '12px',
    fontWeight: '600',
  },
  statusCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  statusCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  statusCount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  statusLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
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
    transition: 'box-shadow 0.2s ease',
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
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  rideDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '14px',
    color: '#555',
  },
};

export default AdminRides;
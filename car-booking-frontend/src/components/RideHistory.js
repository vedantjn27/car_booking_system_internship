import React, { useState, useEffect } from 'react';

const RideHistory = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [userId, setUserId] = useState('default_user');

  const fetchRides = async (type = 'all') => {
    setLoading(true);
    setError('');
    const url =
      type === 'user'
        ? `http://localhost:8000/rides/user/${userId}`
        : 'http://localhost:8000/rides';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRides(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const averageRating = () => {
    const rated = rides.filter(r => r.rating);
    return rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) : '0.0';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🚗 Ride History</h1>

      {/* Controls */}
      <div style={styles.controls}>
        <button onClick={() => { setViewMode('all'); fetchRides('all'); }}
          style={{ ...styles.button, ...(viewMode === 'all' ? styles.active : {}) }}>
          All Rides
        </button>
        <button onClick={() => { setViewMode('user'); fetchRides('user'); }}
          style={{ ...styles.button, ...(viewMode === 'user' ? styles.active : {}) }}>
          User Rides
        </button>
        {viewMode === 'user' && (
          <>
            <input
              style={styles.input}
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="User ID"
            />
            <button onClick={() => fetchRides('user')} style={styles.greenBtn}>🔍</button>
          </>
        )}
        <button onClick={() => fetchRides(viewMode)} style={styles.greenBtn}>🔄</button>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={{ ...styles.statCard, backgroundColor: '#007bff' }}>
          <h2>{rides.length}</h2>
          <p>Total Rides</p>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#28a745' }}>
          <h2>₹{rides.reduce((sum, r) => sum + (r.fare || 0), 0).toFixed(2)}</h2>
          <p>Total Earnings</p>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#fd7e14' }}>
          <h2>{averageRating()}</h2>
          <p>Avg Rating</p>
        </div>
      </div>

      {/* Errors */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Loading */}
      {loading ? (
        <p style={styles.loading}>⏳ Loading rides...</p>
      ) : rides.length === 0 ? (
        <p style={styles.loading}>❌ No rides found.</p>
      ) : (
        <div style={styles.ridesList}>
          {rides.map((ride, idx) => (
            <div key={ride._id || idx} style={styles.rideCard}>
              <div style={styles.rideRoute}>
                <span><strong>From:</strong> {ride.pickup}</span>
                <span><strong>To:</strong> {ride.drop}</span>
              </div>
              <div style={styles.rideDetails}>
                <p><strong>Rider:</strong> {ride.rider_id}</p>
                <p><strong>Driver:</strong> {ride.driver_id}</p>
                <p><strong>Fare:</strong> ₹{ride.fare}</p>
                <p><strong>Time:</strong> {new Date(ride.ride_time).toLocaleString()}</p>
                <p><strong>Status:</strong> {ride.status}</p>
                <p><strong>Rating:</strong> {ride.rating || 'Not Rated'}</p>
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
    fontFamily: 'Segoe UI, sans-serif',
    padding: '20px',
    maxWidth: '900px',
    margin: 'auto',
    background: '#f5f7fa'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333'
  },
  controls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  button: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: '6px',
    background: '#ddd',
    cursor: 'pointer',
    transition: '0.2s ease'
  },
  active: {
    backgroundColor: '#007bff',
    color: 'white',
    fontWeight: 'bold'
  },
  input: {
    padding: '8px',
    border: '1px solid #aaa',
    borderRadius: '6px'
  },
  greenBtn: {
    padding: '8px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  stats: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  statCard: {
    flex: '1 1 30%',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'white'
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: '10px'
  },
  loading: {
    textAlign: 'center',
    fontWeight: 500,
    marginTop: '30px',
    color: '#555'
  },
  ridesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  rideCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #ccc',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },
  rideRoute: {
    fontWeight: 'bold',
    color: '#333',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  rideDetails: {
    fontSize: '14px',
    color: '#444'
  }
};

export default RideHistory;

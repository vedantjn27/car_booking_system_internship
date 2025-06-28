import React from 'react';

function DriverRides({ myRides }) {
  if (!myRides || myRides.length === 0) {
    return null;
  }

  return (
    <div style={styles.section}>
      <h3>📋 My Rides History</h3>
      <div style={styles.ridesGrid}>
        {myRides.slice(0, 5).map((ride, index) => (
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
              {ride.completed_at && (
                <p><strong>Completed:</strong> {new Date(ride.completed_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginBottom: '30px',
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
};

export default DriverRides;
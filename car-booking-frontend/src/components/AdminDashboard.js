import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalCustomers: 0,
    totalRides: 0,
    activeRides: 0
  });
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await fetch(`${API_BASE_URL}/admin/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (activeTab === 'customers') {
        await fetchCustomers();
      } else if (activeTab === 'drivers') {
        await fetchDrivers();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/drivers`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === 'customers' && customers.length === 0) {
        await fetchCustomers();
      } else if (tab === 'drivers' && drivers.length === 0) {
        await fetchDrivers();
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div style={styles.overviewContainer}>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><h3>👥 Total Users</h3><p style={styles.statNumber}>{stats.totalUsers}</p></div>
        <div style={styles.statCard}><h3>👤 Customers</h3><p style={styles.statNumber}>{stats.totalCustomers}</p></div>
        <div style={styles.statCard}><h3>🚗 Drivers</h3><p style={styles.statNumber}>{stats.totalDrivers}</p></div>
        <div style={styles.statCard}><h3>🚕 Total Rides</h3><p style={styles.statNumber}>{stats.totalRides}</p></div>
        <div style={styles.statCard}><h3>⚡ Active Rides</h3><p style={styles.statNumber}>{stats.activeRides}</p></div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div style={styles.tableContainer}>
      <h3>👤 Customers</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Joined Date</th>
            <th style={styles.th}>Total Spent</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer, index) => (
            <tr key={index}>
              <td style={styles.td}>{customer.email}</td>
              <td style={styles.td}>
                {customer.joined_at ? new Date(customer.joined_at).toLocaleDateString() : 'N/A'}
              </td>
              <td style={styles.td}>₹{customer.total_spent}</td>
              <td style={styles.td}>
                <button style={styles.actionButton}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDrivers = () => (
    <div style={styles.tableContainer}>
      <h3>🚗 Drivers</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Vehicle Number</th>
            <th style={styles.th}>Total Earned</th>
            <th style={styles.th}>Completed Rides</th>
            <th style={styles.th}>Availability</th>
            <th style={styles.th}>Rating</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver, index) => (
            <tr key={index}>
              <td style={styles.td}>{driver.email}</td>
              <td style={styles.td}>{driver.vehicle_number}</td>
              <td style={styles.td}>₹{driver.total_earned}</td>
              <td style={styles.td}>{driver.completed_rides}</td>
              <td style={styles.td}>
                <span style={getDriverStatusStyle(driver.is_available ? 'active' : 'inactive')}>
                  {driver.is_available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td style={styles.td}>{driver.average_rating}</td>
              <td style={styles.td}>
                <button style={styles.actionButton}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const getDriverStatusStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: status === 'active' ? '#4CAF50' : '#f44336',
    color: 'white'
  });

  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabContainer}>
        <button onClick={() => handleTabChange('overview')} style={{ ...styles.tabButton, ...(activeTab === 'overview' ? styles.activeTab : styles.inactiveTab) }}>📊 Overview</button>
        <button onClick={() => handleTabChange('customers')} style={{ ...styles.tabButton, ...(activeTab === 'customers' ? styles.activeTab : styles.inactiveTab) }}>👤 Customers</button>
        <button onClick={() => handleTabChange('drivers')} style={{ ...styles.tabButton, ...(activeTab === 'drivers' ? styles.activeTab : styles.inactiveTab) }}>🚗 Drivers</button>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'customers' && renderCustomers()}
      {activeTab === 'drivers' && renderDrivers()}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
  },
  tabContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    justifyContent: 'center',
  },
  tabButton: {
    padding: '10px 20px',
    border: '2px solid #007BFF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    backgroundColor: '#007BFF',
    color: '#fff',
  },
  inactiveTab: {
    backgroundColor: '#fff',
    color: '#007BFF',
  },
  overviewContainer: {
    marginBottom: '30px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007BFF',
    margin: '10px 0',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  th: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    fontWeight: 'bold',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #ddd',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

export default AdminDashboard;

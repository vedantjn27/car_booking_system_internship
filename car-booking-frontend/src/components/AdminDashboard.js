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
      console.log("Calling fetchCustomers...");
      const res = await fetch(`${API_BASE_URL}/admin/customers`);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched customers:", data); // 🔍 Log to inspect status
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

  const exportCustomersData = () => {
    const csvContent = [
      ['Email', 'Joined Date', 'Total Spent'],
      ...customers.map(customer => [
        customer.email,
        customer.joined_at ? new Date(customer.joined_at).toLocaleDateString() : 'N/A',
        customer.total_spent
      ])
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    downloadCSV(csvString, 'customers-data.csv');
  };
  
  const exportDriversData = () => {
    const csvContent = [
      ['Email', 'Vehicle Number', 'Total Earned', 'Completed Rides', 'Availability', 'Rating'],
      ...drivers.map(driver => [
        driver.email,
        driver.vehicle_number,
        driver.total_earned,
        driver.completed_rides,
        driver.is_available ? 'Available' : 'Unavailable',
        driver.average_rating
      ])
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    downloadCSV(csvString, 'drivers-data.csv');
  };
  
  const downloadCSV = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderOverview = () => (
    <div style={styles.overviewContainer}>
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, ...styles.gradientBlue}}>
          <div style={styles.statIcon}>👥</div>
          <h3 style={styles.statTitle}>Total Users</h3>
          <p style={styles.statNumber}>{stats.totalUsers.toLocaleString()}</p>
          <div style={styles.statTrend}>↗ +12% from last month</div>
        </div>
        <div style={{...styles.statCard, ...styles.gradientGreen}}>
          <div style={styles.statIcon}>👤</div>
          <h3 style={styles.statTitle}>Customers</h3>
          <p style={styles.statNumber}>{stats.totalCustomers.toLocaleString()}</p>
          <div style={styles.statTrend}>↗ +8% from last month</div>
        </div>
        <div style={{...styles.statCard, ...styles.gradientPurple}}>
          <div style={styles.statIcon}>🚗</div>
          <h3 style={styles.statTitle}>Drivers</h3>
          <p style={styles.statNumber}>{stats.totalDrivers.toLocaleString()}</p>
          <div style={styles.statTrend}>↗ +15% from last month</div>
        </div>
        <div style={{...styles.statCard, ...styles.gradientOrange}}>
          <div style={styles.statIcon}>🚕</div>
          <h3 style={styles.statTitle}>Total Rides</h3>
          <p style={styles.statNumber}>{stats.totalRides.toLocaleString()}</p>
          <div style={styles.statTrend}>↗ +22% from last month</div>
        </div>
        <div style={{...styles.statCard, ...styles.gradientRed}}>
          <div style={styles.statIcon}>⚡</div>
          <h3 style={styles.statTitle}>Active Rides</h3>
          <p style={styles.statNumber}>{stats.activeRides.toLocaleString()}</p>
          <div style={styles.statTrend}>↗ Live updates</div>
        </div>
      </div>
    </div>
  );

  const toggleUserStatus = async (email) => {
    try {
      console.log("=== BEFORE API CALL ===");
      console.log("Toggling status for:", email);
      
      const response = await fetch(`${API_BASE_URL}/user/status/${email}`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("=== API RESPONSE ===");
      console.log("API response:", data);
      console.log("New status from API:", data.new_status);
  
      const isBlocked = data.new_status === "Blocked";
      alert(`${email} is now ${isBlocked ? "blocked 🚫" : "unblocked ✅"}`);
  
      console.log("=== REFRESHING DATA ===");
      console.log("Calling fetchCustomers...");
      await fetchCustomers();
      console.log("fetchCustomers completed");
      
      // Double-check the updated data
      const updatedCustomer = customers.find(c => c.email === email);
      console.log("=== AFTER DATA REFRESH ===");
      console.log("Updated customer data:", updatedCustomer);
      console.log("Updated customer status:", updatedCustomer?.status);
      
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Failed to update status. Please try again.");
    }
  };
  
  const renderCustomers = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>
          <span style={styles.tableIcon}>👤</span>
          Customer Management
        </h3>
        <div style={styles.tableActions}>
          <button style={styles.exportButton} onClick={exportCustomersData}>📊 Export Data</button>
          <button style={styles.refreshButton} onClick={fetchCustomers}>🔄 Refresh</button>
        </div>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Joined Date</th>
              <th style={styles.th}>Total Spent</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => {
              // Normalize status - treat undefined/null as "Active"
              const normalizedStatus = customer.status || "Active";
              const isBlocked = normalizedStatus === "Blocked";
              
              return (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.emailCell}>
                      <div style={styles.avatar}>
                        {customer.email.charAt(0).toUpperCase()}
                      </div>
                      <span>{customer.email}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dateText}>
                      {customer.joined_at ? new Date(customer.joined_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.amountText}>₹{customer.total_spent}</span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{
                        backgroundColor: isBlocked ? '#28a745' : '#dc3545',
                        color: '#fff',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        minWidth: '90px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                        e.target.style.backgroundColor = isBlocked ? '#1e7e34' : '#b02a37';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                        e.target.style.backgroundColor = isBlocked ? '#28a745' : '#dc3545';
                      }}
                      onClick={() => {
                        console.log('Button clicked for:', customer.email);
                        console.log('Current normalized status:', normalizedStatus);
                        console.log('Action will be:', isBlocked ? "UNBLOCK" : "BLOCK");
                        toggleUserStatus(customer.email);
                      }}
                    >
                      {isBlocked ? "✓ UNBLOCK" : "✕ BLOCK"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  const toggleDriverStatus = async (email) => {
    try {
      console.log("=== BEFORE API CALL ===");
      console.log("Toggling status for driver:", email);
      
      const response = await fetch(`${API_BASE_URL}/user/status/${email}`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("=== API RESPONSE ===");
      console.log("API response:", data);
      console.log("New status from API:", data.new_status);
  
      const isBlocked = data.new_status === "Blocked";
      alert(`${email} is now ${isBlocked ? "blocked 🚫" : "unblocked ✅"}`);
  
      console.log("=== UPDATING STATE MANUALLY ===");
      // Update the drivers state directly with the new status
      setDrivers(prevDrivers => 
        prevDrivers.map(driver => 
          driver.email === email 
            ? { ...driver, status: data.new_status }
            : driver
        )
      );
      console.log("State updated manually with new status:", data.new_status);
      
      // Also refresh from server as backup
      console.log("=== REFRESHING DATA ===");
      console.log("Calling fetchDrivers...");
      await fetchDrivers();
      console.log("fetchDrivers completed");
      
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Failed to update status. Please try again.");
    }
  };
  
  const renderDrivers = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>
          <span style={styles.tableIcon}>🚗</span>
          Driver Management
        </h3>
        <div style={styles.tableActions}>
          <button style={styles.exportButton} onClick={exportDriversData}>📊 Export Data</button>
          <button style={styles.refreshButton} onClick={fetchDrivers}>🔄 Refresh</button>
        </div>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Driver</th>
              <th style={styles.th}>Vehicle</th>
              <th style={styles.th}>Earnings</th>
              <th style={styles.th}>Rides</th>
              <th style={styles.th}>Availability</th>
              <th style={styles.th}>Rating</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver, index) => {
              // Normalize status - treat undefined/null as "Active"
              const normalizedStatus = driver.status || "Active";
              const isBlocked = normalizedStatus === "Blocked";
              
              return (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.driverCell}>
                      <div style={styles.avatar}>{driver.email.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={styles.driverName}>{driver.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.vehicleNumber}>{driver.vehicle_number}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.amountText}>₹{driver.total_earned}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.ridesCount}>{driver.completed_rides} rides</span>
                  </td>
                  <td style={styles.td}>
                    <span style={getDriverStatusStyle(driver.is_available ? 'active' : 'inactive')}>
                      {driver.is_available ? '🟢 Available' : '🔴 Unavailable'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.ratingContainer}>
                      <span style={styles.ratingText}>⭐ {driver.average_rating}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{
                        backgroundColor: isBlocked ? '#28a745' : '#dc3545',
                        color: '#fff',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        minWidth: '90px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                        e.target.style.backgroundColor = isBlocked ? '#1e7e34' : '#b02a37';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                        e.target.style.backgroundColor = isBlocked ? '#28a745' : '#dc3545';
                      }}
                      onClick={() => {
                        console.log('Button clicked for driver:', driver.email);
                        console.log('Current normalized status:', normalizedStatus);
                        console.log('Action will be:', isBlocked ? "UNBLOCK" : "BLOCK");
                        toggleDriverStatus(driver.email);
                      }}
                    >
                      {isBlocked ? "✓ UNBLOCK" : "✕ BLOCK"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getDriverStatusStyle = (status) => ({
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: status === 'active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
    color: status === 'active' ? '#4CAF50' : '#f44336',
    border: `1px solid ${status === 'active' ? '#4CAF50' : '#f44336'}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  });

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Admin Dashboard</h1>
        <div style={styles.headerActions}>
          <div style={styles.userInfo}>
            <span style={styles.welcomeText}>Welcome back, Admin</span>
            <div style={styles.userAvatar}>A</div>
          </div>
        </div>
      </div>

      <div style={styles.tabContainer}>
        <button 
          onClick={() => handleTabChange('overview')} 
          style={{ 
            ...styles.tabButton, 
            ...(activeTab === 'overview' ? styles.activeTab : styles.inactiveTab) 
          }}
        >
          <span style={styles.tabIcon}>📊</span>
          Overview
        </button>
        <button 
          onClick={() => handleTabChange('customers')} 
          style={{ 
            ...styles.tabButton, 
            ...(activeTab === 'customers' ? styles.activeTab : styles.inactiveTab) 
          }}
        >
          <span style={styles.tabIcon}>👤</span>
          Customers
        </button>
        <button 
          onClick={() => handleTabChange('drivers')} 
          style={{ 
            ...styles.tabButton, 
            ...(activeTab === 'drivers' ? styles.activeTab : styles.inactiveTab) 
          }}
        >
          <span style={styles.tabIcon}>🚗</span>
          Drivers
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'drivers' && renderDrivers()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '20px 30px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  pageTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  welcomeText: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '500',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #ff6b6b, #ffd93d)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#fff',
    fontSize: '18px',
    marginTop: '20px',
    fontWeight: '500',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  tabButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: '18px',
  },
  activeTab: {
    backgroundColor: '#fff',
    color: '#667eea',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'translateY(-1px)',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    color: '#fff',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  overviewContainer: {
    marginBottom: '30px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  statCard: {
    borderRadius: '20px',
    padding: '30px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
  },
  gradientBlue: {
    background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.05) 100%)',
  },
  gradientGreen: {
    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.05) 100%)',
  },
  gradientPurple: {
    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(156, 39, 176, 0.05) 100%)',
  },
  gradientOrange: {
    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 152, 0, 0.05) 100%)',
  },
  gradientRed: {
    background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(244, 67, 54, 0.05) 100%)',
  },
  statIcon: {
    fontSize: '3rem',
    marginBottom: '15px',
    display: 'block',
  },
  statTitle: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 15px 0',
    opacity: 0.9,
  },
  statNumber: {
    fontSize: '2.8rem',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 10px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statTrend: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  tableContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px 30px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  },
  tableTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  tableIcon: {
    fontSize: '28px',
  },
  tableActions: {
    display: 'flex',
    gap: '12px',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tableWrapper: {
    overflowX: 'auto',
    padding: '0 30px 30px 30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '18px',
    textAlign: 'left',
    fontWeight: '700',
    color: '#495057',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #dee2e6',
  },
  tableRow: {
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  td: {
    padding: '18px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '15px',
    color: '#495057',
  },
  emailCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  driverCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  driverName: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  dateText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  amountText: {
    fontWeight: '700',
    color: '#28a745',
    fontSize: '16px',
  },
  vehicleNumber: {
    backgroundColor: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '6px',
    fontWeight: '600',
    color: '#495057',
    fontSize: '13px',
  },
  ridesCount: {
    color: '#6c757d',
    fontWeight: '500',
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  ratingText: {
    fontWeight: '600',
    color: '#ffc107',
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

// Add CSS animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  
  .table-row:hover {
    background-color: rgba(102, 126, 234, 0.05);
  }
  
  .action-button:hover {
    background-color: #0056b3;
    transform: translateY(-1px);
  }
  
  .export-button:hover {
    background-color: #218838;
    transform: translateY(-1px);
  }
  
  .refresh-button:hover {
    background-color: #0056b3;
    transform: translateY(-1px);
  }
`;
document.head.appendChild(styleSheet);

export default AdminDashboard;
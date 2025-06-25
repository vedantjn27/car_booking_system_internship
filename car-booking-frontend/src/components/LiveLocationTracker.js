import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom live location icon with pulsing effect
const liveLocationIcon = L.divIcon({
  html: `
    <div style="position: relative;">
      <div class="pulse-circle"></div>
      <div style="
        background: linear-gradient(135deg, #e91e63, #f06292);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(233, 30, 99, 0.4);
        position: relative;
        z-index: 2;
      ">📍</div>
    </div>
  `,
  className: 'live-location-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function LiveLocationTracker() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);
  
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [address, setAddress] = useState('Getting address...');

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([23.0225, 72.5714], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add custom CSS for pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(233, 30, 99, 0.2);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        .live-location-marker {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);

      // Start tracking location immediately
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, []);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000 // Update every 5 seconds
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setCurrentPosition({ lat: latitude, lng: longitude });
        setAccuracy(Math.round(accuracy));
        
        // Update map and marker
        updateLocationOnMap(latitude, longitude, accuracy);
        
        // Get address for current location
        getAddressFromCoords(latitude, longitude);
      },
      (error) => {
        console.error("Location tracking error:", error);
        let errorMessage = "Unable to track your location. ";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Unknown error occurred.";
            break;
        }
        
        setLocationError(errorMessage);
        setIsTracking(false);
      },
      options
    );
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const updateLocationOnMap = (lat, lng, accuracy) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker and accuracy circle
    if (locationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(locationMarkerRef.current);
    }
    if (accuracyCircleRef.current) {
      mapInstanceRef.current.removeLayer(accuracyCircleRef.current);
    }

    // Add accuracy circle
    accuracyCircleRef.current = L.circle([lat, lng], {
      radius: accuracy,
      fillColor: '#e91e63',
      fillOpacity: 0.1,
      color: '#e91e63',
      weight: 1,
      opacity: 0.3
    }).addTo(mapInstanceRef.current);

    // Add location marker
    locationMarkerRef.current = L.marker([lat, lng], { 
      icon: liveLocationIcon 
    }).addTo(mapInstanceRef.current);

    // Bind popup to marker
    locationMarkerRef.current.bindPopup(`
      <div style="font-family: Arial, sans-serif; min-width: 200px;">
        <h4 style="margin: 0 0 10px 0; color: #e91e63;">📍 Your Live Location</h4>
        <div style="font-size: 12px; line-height: 1.4;">
          <p style="margin: 2px 0;"><strong>Address:</strong> ${address}</p>
          <p style="margin: 2px 0;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
          <p style="margin: 2px 0;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
          <p style="margin: 2px 0;"><strong>Accuracy:</strong> ±${accuracy}m</p>
          <p style="margin: 2px 0;"><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    `);

    // Center map on current location
    mapInstanceRef.current.setView([lat, lng], 16);
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress('Address not available');
    }
  };

  const centerOnLocation = () => {
    if (currentPosition && mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentPosition.lat, currentPosition.lng], 16);
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📍 Your Live Location</h3>
        <div style={styles.controls}>
          <button 
            onClick={toggleTracking}
            style={{
              ...styles.controlBtn,
              backgroundColor: isTracking ? '#dc3545' : '#28a745'
            }}
          >
            {isTracking ? '⏹️ Stop Tracking' : '▶️ Start Tracking'}
          </button>
          <button 
            onClick={centerOnLocation}
            style={styles.controlBtn}
            disabled={!currentPosition}
          >
            🎯 Center
          </button>
        </div>
      </div>

      {locationError && (
        <div style={styles.errorAlert}>
          <p style={styles.errorText}>❌ {locationError}</p>
          <button onClick={startLocationTracking} style={styles.retryBtn}>
            🔄 Retry
          </button>
        </div>
      )}

      {currentPosition && (
        <div style={styles.locationInfo}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>📍 Address:</span>
            <span style={styles.infoValue}>{address}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🎯 Coordinates:</span>
            <span style={styles.infoValue}>
              {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>📶 Accuracy:</span>
            <span style={styles.infoValue}>±{accuracy}m</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🔄 Status:</span>
            <span style={{...styles.infoValue, color: isTracking ? '#28a745' : '#dc3545'}}>
              {isTracking ? 'Live Tracking' : 'Tracking Stopped'}
            </span>
          </div>
        </div>
      )}

      <div 
        ref={mapRef} 
        style={styles.map}
      />
      
      <div style={styles.footer}>
        <p style={styles.footerText}>
          🔒 Your location data is not stored and only used for mapping purposes
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    borderRadius: "12px",
    maxWidth: "600px",
    margin: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #e91e63, #f06292)",
    color: "white",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "600",
  },
  controls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  controlBtn: {
    backgroundColor: "#fff",
    color: "#333",
    border: "none",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    transition: "all 0.3s",
    whiteSpace: "nowrap",
  },
  errorAlert: {
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    padding: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  errorText: {
    color: "#721c24",
    margin: "0",
    fontSize: "14px",
  },
  retryBtn: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },
  locationInfo: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
    fontSize: "14px",
  },
  infoLabel: {
    fontWeight: "600",
    color: "#495057",
    minWidth: "120px",
  },
  infoValue: {
    color: "#212529",
    textAlign: "right",
    flex: "1",
    wordBreak: "break-all",
  },
  map: {
    height: "400px",
    width: "100%",
  },
  footer: {
    padding: "15px 20px",
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #e9ecef",
  },
  footerText: {
    margin: "0",
    fontSize: "12px",
    color: "#6c757d",
    textAlign: "center",
  },
};

export default LiveLocationTracker;
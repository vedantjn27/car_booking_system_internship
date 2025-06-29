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

// Custom live location icon with enhanced pulsing effect
const liveLocationIcon = L.divIcon({
  html: `
    <div style="position: relative;">
      <div class="pulse-circle"></div>
      <div class="pulse-circle-2"></div>
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 4px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.1);
        position: relative;
        z-index: 3;
        backdrop-filter: blur(10px);
      ">📍</div>
    </div>
  `,
  className: 'live-location-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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

      // Add enhanced custom CSS for animations
      const style = document.createElement('style');
      style.textContent = `
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2));
          animation: pulse 3s infinite ease-in-out;
        }
        .pulse-circle-2 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.1));
          animation: pulse 3s infinite ease-in-out 1.5s;
        }
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
          }
        }
        .live-location-marker {
          background: transparent !important;
          border: none !important;
        }
        .floating-card {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .glow {
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          animation: glow 2s ease-in-out infinite alternate;
        }
        @keyframes glow {
          from {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          }
          to {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.5), 0 0 40px rgba(102, 126, 234, 0.2);
          }
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

    // Add accuracy circle with enhanced styling
    accuracyCircleRef.current = L.circle([lat, lng], {
      radius: accuracy,
      fillColor: '#667eea',
      fillOpacity: 0.15,
      color: '#667eea',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 5'
    }).addTo(mapInstanceRef.current);

    // Add location marker
    locationMarkerRef.current = L.marker([lat, lng], { 
      icon: liveLocationIcon 
    }).addTo(mapInstanceRef.current);

    // Enhanced popup with glassmorphism effect
    locationMarkerRef.current.bindPopup(`
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        min-width: 280px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        overflow: hidden;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          margin: -10px -10px 10px -10px;
        ">
          <h4 style="margin: 0; font-size: 16px; font-weight: 600;">📍 Your Live Location</h4>
        </div>
        <div style="font-size: 13px; line-height: 1.6; padding: 0 10px 10px;">
          <div style="margin: 8px 0; padding: 8px; background: rgba(102, 126, 234, 0.05); border-radius: 8px;">
            <strong style="color: #667eea;">📍 Address:</strong><br/>
            <span style="color: #333; font-size: 12px;">${address}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0;">
            <div style="padding: 6px; background: rgba(102, 126, 234, 0.05); border-radius: 6px; text-align: center;">
              <strong style="color: #667eea; font-size: 11px;">Latitude</strong><br/>
              <span style="font-size: 12px; font-family: monospace;">${lat.toFixed(6)}</span>
            </div>
            <div style="padding: 6px; background: rgba(102, 126, 234, 0.05); border-radius: 6px; text-align: center;">
              <strong style="color: #667eea; font-size: 11px;">Longitude</strong><br/>
              <span style="font-size: 12px; font-family: monospace;">${lng.toFixed(6)}</span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="padding: 6px; background: rgba(102, 126, 234, 0.05); border-radius: 6px; text-align: center;">
              <strong style="color: #667eea; font-size: 11px;">📶 Accuracy</strong><br/>
              <span style="font-size: 12px;">±${accuracy}m</span>
            </div>
            <div style="padding: 6px; background: rgba(102, 126, 234, 0.05); border-radius: 6px; text-align: center;">
              <strong style="color: #667eea; font-size: 11px;">🕒 Updated</strong><br/>
              <span style="font-size: 12px;">${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
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
    <div style={styles.container} className="floating-card">
      <div style={styles.header} className={isTracking ? 'shimmer glow' : ''}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h3 style={styles.title}>
              <span style={styles.titleIcon}>🌍</span>
              Live Location Tracker
            </h3>
            <div style={styles.statusBadge}>
              <div style={{
                ...styles.statusDot,
                backgroundColor: isTracking ? '#10B981' : '#EF4444'
              }}></div>
              <span style={styles.statusText}>
                {isTracking ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={styles.controls}>
            <button 
              onClick={toggleTracking}
              style={{
                ...styles.controlBtn,
                ...styles.primaryBtn,
                backgroundColor: isTracking ? '#EF4444' : '#10B981'
              }}
            >
              <span style={styles.btnIcon}>
                {isTracking ? '⏹️' : '▶️'}
              </span>
              {isTracking ? 'Stop' : 'Start'}
            </button>
            <button 
              onClick={centerOnLocation}
              style={{...styles.controlBtn, ...styles.secondaryBtn}}
              disabled={!currentPosition}
            >
              <span style={styles.btnIcon}>🎯</span>
              Center
            </button>
          </div>
        </div>
      </div>

      {locationError && (
        <div style={styles.errorAlert}>
          <div style={styles.errorContent}>
            <div style={styles.errorIcon}>⚠️</div>
            <div style={styles.errorTextContainer}>
              <p style={styles.errorTitle}>Location Error</p>
              <p style={styles.errorText}>{locationError}</p>
            </div>
          </div>
          <button onClick={startLocationTracking} style={styles.retryBtn}>
            <span style={styles.btnIcon}>🔄</span>
            Retry
          </button>
        </div>
      )}

      {currentPosition && (
        <div style={styles.locationInfo}>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}>📍</div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Current Address</span>
                <span style={styles.infoValue}>{address}</span>
              </div>
            </div>
            
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}>🎯</div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Coordinates</span>
                <span style={styles.infoValue}>
                  {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                </span>
              </div>
            </div>
            
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}>📶</div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Accuracy</span>
                <span style={styles.infoValue}>±{accuracy}m</span>
              </div>
            </div>
            
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}>🔄</div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Status</span>
                <span style={{
                  ...styles.infoValue, 
                  color: isTracking ? '#10B981' : '#EF4444',
                  fontWeight: '600'
                }}>
                  {isTracking ? 'Live Tracking' : 'Tracking Stopped'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.mapContainer}>
        <div 
          ref={mapRef} 
          style={styles.map}
        />
        <div style={styles.mapOverlay}>
          <div style={styles.mapBadge}>
            OpenStreetMap
          </div>
        </div>
      </div>
      
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.securityBadge}>
            <span style={styles.securityIcon}>🔒</span>
            <span style={styles.securityText}>
              Your location data is secure and not stored
            </span>
          </div>
          <div style={styles.attribution}>
            Powered by OpenStreetMap & Leaflet
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
    borderRadius: "24px",
    maxWidth: "700px",
    margin: "20px auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 25px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    position: "relative",
    zIndex: 2,
  },
  titleSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    margin: "0",
    fontSize: "24px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    letterSpacing: "-0.025em",
  },
  titleIcon: {
    fontSize: "28px",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255, 255, 255, 0.2)",
    padding: "8px 16px",
    borderRadius: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  statusText: {
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  controls: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  controlBtn: {
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    backdropFilter: "blur(10px)",
    transform: "translateZ(0)",
  },
  primaryBtn: {
    color: "white",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    color: "#667eea",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  btnIcon: {
    fontSize: "16px",
  },
  errorAlert: {
    background: "linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)",
    border: "1px solid #FECACA",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  errorContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  errorIcon: {
    fontSize: "24px",
    flexShrink: 0,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: "#991B1B",
    margin: "0 0 4px 0",
    fontSize: "14px",
    fontWeight: "600",
  },
  errorText: {
    color: "#B91C1C",
    margin: "0",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  retryBtn: {
    backgroundColor: "#EF4444",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.3s",
    flexShrink: 0,
  },
  locationInfo: {
    padding: "24px",
    background: "linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  infoCard: {
    background: "rgba(255, 255, 255, 0.8)",
    border: "1px solid rgba(102, 126, 234, 0.1)",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.04)",
  },
  infoIcon: {
    fontSize: "24px",
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    filter: "drop-shadow(0 2px 8px rgba(102, 126, 234, 0.3))",
  },
  infoContent: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    display: "block",
    fontWeight: "600",
    color: "#667eea",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  infoValue: {
    display: "block",
    color: "#1F2937",
    fontSize: "14px",
    lineHeight: "1.4",
    wordBreak: "break-all",
    fontWeight: "500",
  },
  mapContainer: {
    position: "relative",
    height: "450px",
    overflow: "hidden",
  },
  map: {
    height: "100%",
    width: "100%",
  },
  mapOverlay: {
    position: "absolute",
    top: "16px",
    right: "16px",
    zIndex: 1000,
  },
  mapBadge: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#667eea",
    border: "1px solid rgba(102, 126, 234, 0.1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  footer: {
    padding: "20px 24px",
    background: "linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)",
    borderTop: "1px solid rgba(102, 126, 234, 0.1)",
  },
  footerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  securityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(16, 185, 129, 0.1)",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(16, 185, 129, 0.2)",
  },
  securityIcon: {
    fontSize: "14px",
  },
  securityText: {
    fontSize: "12px",
    color: "#059669",
    fontWeight: "600",
  },
  attribution: {
    fontSize: "11px",
    color: "#6B7280",
    fontWeight: "500",
  },
};

export default LiveLocationTracker;
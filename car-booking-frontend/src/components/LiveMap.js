import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Enhanced custom icons with modern styling
const pickupIcon = L.divIcon({
  html: `
    <div style="position: relative;">
      <div class="pickup-pulse"></div>
      <div style="
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        color: white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 4px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1);
        position: relative;
        z-index: 2;
        backdrop-filter: blur(10px);
      ">📍</div>
    </div>
  `,
  className: 'custom-pickup-icon',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const dropIcon = L.divIcon({
  html: `
    <div style="position: relative;">
      <div class="drop-pulse"></div>
      <div style="
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        color: white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 4px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.1);
        position: relative;
        z-index: 2;
        backdrop-filter: blur(10px);
      ">🏁</div>
    </div>
  `,
  className: 'custom-drop-icon',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const driverIcon = L.divIcon({
  html: `
    <div style="position: relative;">
      <div class="driver-pulse"></div>
      <div class="driver-pulse-2"></div>
      <div style="
        background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
        color: white;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 4px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 6px 25px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1);
        position: relative;
        z-index: 3;
        backdrop-filter: blur(10px);
        animation: driverBounce 3s ease-in-out infinite;
      ">🚕</div>
    </div>
  `,
  className: 'custom-driver-icon',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

function LiveMap({ pickupCoords, dropCoords, driverCoords, pickupAddress, dropAddress, driverInfo }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([23.0225, 72.5714], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add enhanced custom CSS for animations
      const style = document.createElement('style');
      style.textContent = `
        .pickup-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.2));
          animation: pickupPulse 2.5s infinite ease-in-out;
        }
        
        .drop-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2));
          animation: dropPulse 2s infinite ease-in-out;
        }
        
        .driver-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(29, 78, 216, 0.2));
          animation: driverPulse 3s infinite ease-in-out;
        }
        
        .driver-pulse-2 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(29, 78, 216, 0.1));
          animation: driverPulse 3s infinite ease-in-out 1.5s;
        }
        
        @keyframes pickupPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
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
        
        @keyframes dropPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes driverPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0;
          }
        }
        
        @keyframes driverBounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        .custom-pickup-icon, .custom-drop-icon, .custom-driver-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .route-glow {
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
          animation: routeGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes routeGlow {
          from {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
          }
          to {
            filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.8));
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup function - don't destroy map instance here to avoid re-creation
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers and routes
    clearMapContent();

    const markers = [];
    const bounds = L.latLngBounds();

    // Add pickup marker with enhanced popup
    if (pickupCoords) {
      const pickupMarker = L.marker([pickupCoords[0], pickupCoords[1]], { 
        icon: pickupIcon 
      }).addTo(mapInstanceRef.current);
      
      pickupMarker.bindPopup(`
        <div style="
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          min-width: 250px;
        ">
          <div style="
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 16px;
            margin: -10px -10px 12px -10px;
          ">
            <h4 style="margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              📍 Pickup Location
            </h4>
          </div>
          <div style="padding: 0 10px 10px;">
            <div style="
              background: rgba(16, 185, 129, 0.05);
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 8px;
            ">
              <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.4; font-weight: 500;">
                ${pickupAddress || 'Pickup Point'}
              </p>
            </div>
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              font-size: 11px;
              color: #6B7280;
            ">
              <div style="background: #F3F4F6; padding: 6px; border-radius: 6px; text-align: center;">
                <strong>Latitude</strong><br/>
                <span style="font-family: monospace;">${pickupCoords[0].toFixed(4)}</span>
              </div>
              <div style="background: #F3F4F6; padding: 6px; border-radius: 6px; text-align: center;">
                <strong>Longitude</strong><br/>
                <span style="font-family: monospace;">${pickupCoords[1].toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      `);
      
      markers.push(pickupMarker);
      bounds.extend([pickupCoords[0], pickupCoords[1]]);
    }

    // Add drop marker with enhanced popup
    if (dropCoords) {
      const dropMarker = L.marker([dropCoords[0], dropCoords[1]], { 
        icon: dropIcon 
      }).addTo(mapInstanceRef.current);
      
      dropMarker.bindPopup(`
        <div style="
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          min-width: 250px;
        ">
          <div style="
            background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
            color: white;
            padding: 16px;
            margin: -10px -10px 12px -10px;
          ">
            <h4 style="margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              🏁 Drop Location
            </h4>
          </div>
          <div style="padding: 0 10px 10px;">
            <div style="
              background: rgba(239, 68, 68, 0.05);
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 8px;
            ">
              <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.4; font-weight: 500;">
                ${dropAddress || 'Drop Point'}
              </p>
            </div>
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              font-size: 11px;
              color: #6B7280;
            ">
              <div style="background: #F3F4F6; padding: 6px; border-radius: 6px; text-align: center;">
                <strong>Latitude</strong><br/>
                <span style="font-family: monospace;">${dropCoords[0].toFixed(4)}</span>
              </div>
              <div style="background: #F3F4F6; padding: 6px; border-radius: 6px; text-align: center;">
                <strong>Longitude</strong><br/>
                <span style="font-family: monospace;">${dropCoords[1].toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      `);
      
      markers.push(dropMarker);
      bounds.extend([dropCoords[0], dropCoords[1]]);
    }

    // Add driver marker with enhanced popup
    if (driverCoords && driverInfo) {
      const driverMarker = L.marker([driverCoords[0], driverCoords[1]], { 
        icon: driverIcon 
      }).addTo(mapInstanceRef.current);
      
      driverMarker.bindPopup(`
        <div style="
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          min-width: 300px;
        ">
          <div style="
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: white;
            padding: 16px;
            margin: -10px -10px 12px -10px;
          ">
            <h4 style="margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              🚕 Driver Information
            </h4>
          </div>
          <div style="padding: 0 10px 10px;">
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 12px;
              font-size: 12px;
            ">
              <div style="background: rgba(59, 130, 246, 0.05); padding: 8px; border-radius: 8px;">
                <strong style="color: #3B82F6;">👤 Name</strong><br/>
                <span style="color: #374151;">${driverInfo.name || 'N/A'}</span>
              </div>
              <div style="background: rgba(59, 130, 246, 0.05); padding: 8px; border-radius: 8px;">
                <strong style="color: #3B82F6;">🆔 ID</strong><br/>
                <span style="color: #374151;">${driverInfo.id}</span>
              </div>
              <div style="background: rgba(59, 130, 246, 0.05); padding: 8px; border-radius: 8px;">
                <strong style="color: #3B82F6;">📞 Phone</strong><br/>
                <span style="color: #374151;">${driverInfo.phone || 'N/A'}</span>
              </div>
              <div style="background: rgba(59, 130, 246, 0.05); padding: 8px; border-radius: 8px;">
                <strong style="color: #3B82F6;">⭐ Rating</strong><br/>
                <span style="color: #374151;">${driverInfo.rating || 'N/A'}</span>
              </div>
            </div>
            
            <div style="
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.05));
              border-radius: 10px;
              padding: 10px;
              margin-bottom: 10px;
            ">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div>
                  <strong style="color: #3B82F6;">🚗 Vehicle</strong><br/>
                  <span style="color: #374151;">${driverInfo.vehicle?.model || 'N/A'}</span>
                </div>
                ${driverInfo.vehicle?.number ? `
                <div>
                  <strong style="color: #3B82F6;">🔢 Number</strong><br/>
                  <span style="color: #374151; font-family: monospace;">${driverInfo.vehicle.number}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 10px;
              font-size: 12px;
            ">
              <div style="
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
                padding: 8px;
                border-radius: 8px;
                text-align: center;
              ">
                <strong>📍 Distance</strong><br/>
                <span style="font-size: 14px; font-weight: 600;">${driverInfo.distance || 'N/A'} km</span>
              </div>
              <div style="
                background: linear-gradient(135deg, #F59E0B, #D97706);
                color: white;
                padding: 8px;
                border-radius: 8px;
                text-align: center;
              ">
                <strong>⏱️ ETA</strong><br/>
                <span style="font-size: 14px; font-weight: 600;">${driverInfo.eta || 'N/A'} mins</span>
              </div>
            </div>
            
            <div style="
              background: #F3F4F6;
              border-radius: 6px;
              padding: 6px;
              text-align: center;
              font-size: 11px;
              color: #6B7280;
            ">
              <strong>Coordinates:</strong> ${driverCoords[0].toFixed(4)}, ${driverCoords[1].toFixed(4)}
            </div>
          </div>
        </div>
      `);
      
      markers.push(driverMarker);
      bounds.extend([driverCoords[0], driverCoords[1]]);
    }

    // Store markers reference
    markersRef.current = markers;

    // Draw route if both pickup and drop coordinates exist
    if (pickupCoords && dropCoords) {
      drawRoute(pickupCoords, dropCoords);
    }

    // Fit map to show all markers
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { 
        padding: [30, 30],
        maxZoom: 15
      });
    }

  }, [pickupCoords, dropCoords, driverCoords, pickupAddress, dropAddress, driverInfo]);

  const clearMapContent = () => {
    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Clear existing route
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
  };

  const drawRoute = async (pickup, drop) => {
    try {
      // Using OpenRouteService for routing (you can replace with your preferred routing service)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${drop[1]},${drop[0]}?overview=full&geometries=geojson`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          
          // Create enhanced route polyline with gradient effect
          const routeLine = L.polyline(coordinates, {
            color: '#3B82F6',
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'route-glow'
          }).addTo(mapInstanceRef.current);

          // Add route popup with enhanced styling
          const midpoint = coordinates[Math.floor(coordinates.length / 2)];
          const routePopup = L.popup()
            .setLatLng(midpoint)
            .setContent(`
              <div style="
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                overflow: hidden;
                min-width: 220px;
                text-align: center;
              ">
                <div style="
                  background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                  color: white;
                  padding: 12px;
                  margin: -10px -10px 10px -10px;
                ">
                  <h4 style="margin: 0; font-size: 14px; font-weight: 600;">🛣️ Route Information</h4>
                </div>
                <div style="padding: 0 10px 10px;">
                  <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    font-size: 12px;
                  ">
                    <div style="
                      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.05));
                      padding: 8px;
                      border-radius: 8px;
                    ">
                      <strong style="color: #3B82F6;">📏 Distance</strong><br/>
                      <span style="color: #374151; font-weight: 600;">${(route.distance / 1000).toFixed(1)} km</span>
                    </div>
                    <div style="
                      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.05));
                      padding: 8px;
                      border-radius: 8px;
                    ">
                      <strong style="color: #3B82F6;">⏱️ Duration</strong><br/>
                      <span style="color: #374151; font-weight: 600;">${Math.round(route.duration / 60)} mins</span>
                    </div>
                  </div>
                </div>
              </div>
            `);

          routeLine.bindPopup(routePopup);
          routeLayerRef.current = routeLine;
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback: draw enhanced straight line
      const straightLine = L.polyline([pickup, drop], {
        color: '#6B7280',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 12',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);
      
      routeLayerRef.current = straightLine;
    }
  };

  return (
    <div style={styles.mapContainer}>
      <div style={styles.mapWrapper}>
        <div 
          ref={mapRef} 
          style={styles.map}
        />
        <div style={styles.mapOverlay}>
          <div style={styles.mapBadge}>
            <span style={styles.badgeIcon}>🗺️</span>
            Live Map
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mapContainer: {
    position: 'relative',
    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '20px',
    padding: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 25px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  mapWrapper: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
  },
  map: {
    height: '450px',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  mapBadge: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#3B82F6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  badgeIcon: {
    fontSize: '14px',
    filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3))',
  },
};

export default LiveMap;
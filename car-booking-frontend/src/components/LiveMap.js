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

// Custom icons
const pickupIcon = L.divIcon({
  html: '<div style="background-color: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">📍</div>',
  className: 'custom-pickup-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const dropIcon = L.divIcon({
  html: '<div style="background-color: #dc3545; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏁</div>',
  className: 'custom-drop-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const driverIcon = L.divIcon({
  html: '<div style="background-color: #007bff; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); animation: pulse 2s infinite;">🚕</div>',
  className: 'custom-driver-icon',
  iconSize: [35, 35],
  iconAnchor: [17.5, 17.5],
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

      // Add custom CSS for pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
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

    // Add pickup marker
    if (pickupCoords) {
      const pickupMarker = L.marker([pickupCoords[0], pickupCoords[1]], { 
        icon: pickupIcon 
      }).addTo(mapInstanceRef.current);
      
      pickupMarker.bindPopup(`
        <div style="font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #28a745;">📍 Pickup Location</h4>
          <p style="margin: 0; font-size: 12px; color: #666;">${pickupAddress || 'Pickup Point'}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Lat: ${pickupCoords[0].toFixed(4)}, Lng: ${pickupCoords[1].toFixed(4)}</p>
        </div>
      `);
      
      markers.push(pickupMarker);
      bounds.extend([pickupCoords[0], pickupCoords[1]]);
    }

    // Add drop marker
    if (dropCoords) {
      const dropMarker = L.marker([dropCoords[0], dropCoords[1]], { 
        icon: dropIcon 
      }).addTo(mapInstanceRef.current);
      
      dropMarker.bindPopup(`
        <div style="font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #dc3545;">🏁 Drop Location</h4>
          <p style="margin: 0; font-size: 12px; color: #666;">${dropAddress || 'Drop Point'}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Lat: ${dropCoords[0].toFixed(4)}, Lng: ${dropCoords[1].toFixed(4)}</p>
        </div>
      `);
      
      markers.push(dropMarker);
      bounds.extend([dropCoords[0], dropCoords[1]]);
    }

    // Add driver marker
    if (driverCoords && driverInfo) {
      const driverMarker = L.marker([driverCoords[0], driverCoords[1]], { 
        icon: driverIcon 
      }).addTo(mapInstanceRef.current);
      
      driverMarker.bindPopup(`
        <div style="font-family: Arial, sans-serif; min-width: 200px;">
          <h4 style="margin: 0 0 10px 0; color: #007bff;">🚕 Driver Information</h4>
          <div style="font-size: 12px; line-height: 1.4;">
            <p style="margin: 2px 0;"><strong>Name:</strong> ${driverInfo.name || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>ID:</strong> ${driverInfo.id}</p>
            <p style="margin: 2px 0;"><strong>Phone:</strong> ${driverInfo.phone || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>Vehicle:</strong> ${driverInfo.vehicle?.model || 'N/A'}</p>
            ${driverInfo.vehicle?.number ? `<p style="margin: 2px 0;"><strong>Number:</strong> ${driverInfo.vehicle.number}</p>` : ''}
            <p style="margin: 2px 0;"><strong>Rating:</strong> ${driverInfo.rating || 'N/A'} ⭐</p>
            <p style="margin: 2px 0;"><strong>Distance:</strong> ${driverInfo.distance || 'N/A'} km</p>
            <p style="margin: 2px 0;"><strong>ETA:</strong> ${driverInfo.eta || 'N/A'} mins</p>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 11px; color: #999;">Lat: ${driverCoords[0].toFixed(4)}, Lng: ${driverCoords[1].toFixed(4)}</p>
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
        padding: [20, 20],
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
          
          // Create route polyline
          const routeLine = L.polyline(coordinates, {
            color: '#007bff',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5'
          }).addTo(mapInstanceRef.current);

          // Add route popup with details
          const midpoint = coordinates[Math.floor(coordinates.length / 2)];
          const routePopup = L.popup()
            .setLatLng(midpoint)
            .setContent(`
              <div style="font-family: Arial, sans-serif; text-align: center;">
                <h4 style="margin: 0 0 8px 0; color: #007bff;">🛣️ Route Information</h4>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Distance:</strong> ${(route.distance / 1000).toFixed(1)} km</p>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Duration:</strong> ${Math.round(route.duration / 60)} mins</p>
              </div>
            `);

          routeLine.bindPopup(routePopup);
          routeLayerRef.current = routeLine;
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback: draw straight line
      const straightLine = L.polyline([pickup, drop], {
        color: '#6c757d',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 10'
      }).addTo(mapInstanceRef.current);
      
      routeLayerRef.current = straightLine;
    }
  };

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '400px', 
        width: '100%', 
        borderRadius: '8px',
        border: '2px solid #e1e5e9',
        overflow: 'hidden'
      }} 
    />
  );
}

export default LiveMap;
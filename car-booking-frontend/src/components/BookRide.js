import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import LiveMap from './LiveMap'; // Import LiveMap
import LiveLocationTracker from './LiveLocationTracker'; // Import Live Location Tracker

function BookRide() {
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropQuery, setDropQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [fare, setFare] = useState(null);
  const [distance, setDistance] = useState(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [matchedDriver, setMatchedDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  
  // Email functionality
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // SMS functionality - added from first code
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: false,
    sms: false
  });

  useEffect(() => {
    const getLocation = () => {
      setLocationLoading(true);
      setLocationError(null);
      
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by this browser");
        setLocationLoading(false);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setLocationError(null);
          setLocationLoading(false);
          console.log("Location obtained:", pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.error("Geolocation error", err);
          let errorMessage = "Unable to get your location. ";
          
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMessage += "Location access denied by user.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage += "Location information unavailable.";
              break;
            case err.TIMEOUT:
              errorMessage += "Location request timed out.";
              break;
            default:
              errorMessage += "Unknown error occurred.";
              break;
          }
          
          setLocationError(errorMessage);
          setLocationLoading(false);
        },
        options
      );
    };

    getLocation();
  }, []);

  const fetchSuggestions = useCallback((query, setSuggestions) => {
    if (!query) return;

    const params = {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 5,
    };

    axios.get('https://nominatim.openstreetmap.org/search', { params })
      .then((response) => setSuggestions(response.data))
      .catch((error) => console.error('Error fetching location suggestions:', error));
  }, []);

  const debouncedFetch = (value, setter, suggestionSetter) => {
    // Clear previous data when locations change
    setFare(null);
    setDistance(null);
    setMatchedDriver(null);
    
    setter(value);
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => fetchSuggestions(value, suggestionSetter), 300);
    setTypingTimeout(timeout);
  };

  const handlePickupSelect = (place) => {
    setPickupQuery(place.display_name);
    const coords = [parseFloat(place.lat), parseFloat(place.lon)];
    setPickupCoords(coords);
    setPickupSuggestions([]);
    
    // Clear previous driver data when pickup changes
    setMatchedDriver(null);
  };

  const handleDropSelect = (place) => {
    setDropQuery(place.display_name);
    const coords = [parseFloat(place.lat), parseFloat(place.lon)];
    setDropCoords(coords);
    setDropSuggestions([]);
  };

  const useCurrentLocationForPickup = async () => {
    if (locationLoading) {
      alert("Still getting your location, please wait...");
      return;
    }
    
    if (locationError) {
      alert(`Location Error: ${locationError}`);
      return;
    }
    
    if (!currentLocation) {
      alert("Current location not available. Please check your browser permissions.");
      return;
    }

    const { lat, lon } = currentLocation;
    setLoading(true);
    
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat,
          lon,
          addressdetails: 1
        }
      });

      if (res.data && res.data.display_name) {
        setPickupQuery(res.data.display_name);
        setPickupCoords([lat, lon]);
        setPickupSuggestions([]);
        
        // Clear previous driver data
        setMatchedDriver(null);
      } else {
        alert("Unable to get address for your current location");
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
      alert("Failed to fetch address for current location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const retryLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout
      maximumAge: 60000 // Reduced cache time
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationError(null);
        setLocationLoading(false);
        console.log("Location retry successful:", pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error("Geolocation retry error", err);
        let errorMessage = "Still unable to get your location. ";
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += "Please enable location access in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += "GPS signal not available.";
            break;
          case err.TIMEOUT:
            errorMessage += "Location request timed out. Try again.";
            break;
          default:
            errorMessage += "Unknown error occurred.";
            break;
        }
        
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      calculateFare(pickupCoords, dropCoords);
    }
    
    // Match driver when pickup is selected
    if (pickupCoords) {
      matchDriver(pickupCoords);
    }
  }, [pickupCoords, dropCoords]);

  const calculateFare = async (pickup, drop) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/calculate-fare', {
        pickup,
        drop,
      });
      setFare(response.data.fare);
      setDistance(response.data.distance);
    } catch (error) {
      console.error(error);
      alert("Error calculating fare");
    } finally {
      setLoading(false);
    }
  };

  const matchDriver = async (pickup) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/match-driver', {
        lat: pickup[0],
        lon: pickup[1]
      });
      setMatchedDriver(response.data.driver);
    } catch (error) {
      console.error("Error matching driver", error);
      setMatchedDriver(null);
    } finally {
      setLoading(false);
    }
  };

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation (Indian format) - added from first code
  const validatePhone = (phone) => {
    // Remove all non-digits and check if it's a valid Indian mobile number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check for Indian mobile patterns
    const indianMobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    return indianMobileRegex.test(cleanPhone);
  };

  // Format phone number for display - added from first code
  const formatPhoneForDisplay = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const last10 = cleanPhone.slice(-10);
      return `+91${last10}`;
    }
    return phone;
  };

  // Handle email input change
  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    
    if (emailValue && !validateEmail(emailValue)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Handle phone input change - added from first code
  const handlePhoneChange = (e) => {
    const phoneValue = e.target.value;
    setPhone(phoneValue);
    
    if (phoneValue && !validatePhone(phoneValue)) {
      setPhoneError('Please enter a valid Indian mobile number');
    } else {
      setPhoneError('');
    }
  };

  // Handle notification preference changes - added from first code
  const handleNotificationPrefChange = (type) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Send email notification function
  const sendEmailNotification = async (rideDetails) => {
    if (!notificationPrefs.email || !email || !validateEmail(email)) {
      return;
    }

    try {
      const emailData = {
        email: email,
        subject: "Ride Booking Confirmation",
        message: `
Dear Customer,

Your ride has been successfully booked! Here are the details:

🚕 RIDE DETAILS:
• Pickup: ${rideDetails.pickup}
• Drop: ${rideDetails.drop}
• Distance: ${rideDetails.distance} km
• Fare: ₹${rideDetails.fare}

👤 DRIVER DETAILS:
• Name: ${rideDetails.driver?.name || 'Driver'}
• Phone: ${rideDetails.driver?.phone || 'N/A'}
• Vehicle: ${rideDetails.driver?.vehicle?.model || 'N/A'} (${rideDetails.driver?.vehicle?.number || 'N/A'})
• Rating: ${rideDetails.driver?.rating || 'N/A'}/5.0
• ETA: ${rideDetails.driver?.eta || 'N/A'} minutes

Thank you for choosing our service!

Best regards,
Ride Booking Team
        `
      };

      await axios.post('http://localhost:8000/notify/email', emailData);
      console.log("Email notification sent successfully");
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  };

  // Send SMS notification - added from first code
  const sendSMSNotification = async (rideDetails) => {
    if (!notificationPrefs.sms || !phone || !validatePhone(phone)) {
      return;
    }

    try {
      const formattedPhone = formatPhoneForDisplay(phone);
      const smsData = {
        phone: formattedPhone,
        message: `Your ride is confirmed! Driver ${rideDetails.driver?.name || 'Ravi'} is on the way 🚗`
      };

      const response = await axios.post('http://localhost:8000/notify/sms', smsData);
      console.log("SMS notification sent successfully:", response.data);
    } catch (error) {
      console.error("Error sending SMS notification:", error);
    }
  };

  useEffect(() => {
    setBookingMessage('');
  }, [pickupQuery, dropQuery]);

  const bookRide = async () => {
    if (!pickupQuery || !dropQuery || fare === null || !pickupCoords || !dropCoords) {
      alert("Please enter all details and calculate fare first!");
      return;
    }

    // Validate notifications if enabled
    if (notificationPrefs.email && (!email || !validateEmail(email))) {
      alert("Please enter a valid email address or disable email notifications");
      return;
    }

    if (notificationPrefs.sms && (!phone || !validatePhone(phone))) {
      alert("Please enter a valid phone number or disable SMS notifications");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/book-ride', {
        pickup: pickupQuery,
        drop: dropQuery,
        pickup_coords: pickupCoords
      });
      
      const successMessage = response.data.message || "Ride booked successfully!";
      setBookingMessage(successMessage);

      // Send notifications if enabled
      const enhancedDriver = matchedDriver ? getDriverInfo(matchedDriver) : null;
      const rideDetails = {
        pickup: pickupQuery,
        drop: dropQuery,
        distance: distance,
        fare: fare,
        driver: enhancedDriver
      };

      // Send notifications concurrently
      const notificationPromises = [];
      
      if (notificationPrefs.email) {
        notificationPromises.push(sendEmailNotification(rideDetails));
      }
      
      if (notificationPrefs.sms) {
        notificationPromises.push(sendSMSNotification(rideDetails));
      }

      if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises);
        
        // Update success message to include notification info
        const notifications = [];
        if (notificationPrefs.email) notifications.push(`📧 ${email}`);
        if (notificationPrefs.sms) notifications.push(`📱 ${formatPhoneForDisplay(phone)}`);
        
        if (notifications.length > 0) {
          setBookingMessage(`${successMessage}\n\n✅ Notifications sent to: ${notifications.join(', ')}`);
        }
      }

    } catch (error) {
      console.error('Book ride error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      alert(`Error booking ride: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to get readable address from coordinates
  const getReadableLocation = async (coords) => {
    if (!coords || coords.length !== 2) return "Location updating...";
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: coords[0],
          lon: coords[1],
          addressdetails: 1
        }
      });
      
      if (response.data && response.data.display_name) {
        // Extract meaningful parts of the address
        const address = response.data.display_name;
        const parts = address.split(',');
        if (parts.length >= 3) {
          return `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`;
        }
        return parts[0].trim();
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
    
    return `Lat: ${coords[0].toFixed(4)}, Lng: ${coords[1].toFixed(4)}`;
  };

  // Enhanced driver information with better defaults
  const getDriverInfo = (driver) => {
    if (!driver) return null;

    return {
      id: driver.id || `DRV${Math.floor(Math.random() * 1000)}`,
      name: driver.name || 'Driver',
      phone: driver.phone || '+91 9876543210',
      vehicle: {
        model: driver.vehicle?.model || 'Sedan',
        number: driver.vehicle?.number || `MH12AB${Math.floor(Math.random() * 9000) + 1000}`,
        type: driver.vehicle?.type || 'Car'
      },
      rating: driver.rating || (4.0 + Math.random() * 1).toFixed(1),
      distance: driver.distance || (Math.random() * 5 + 0.5).toFixed(1),
      eta: driver.eta || Math.floor(Math.random() * 10 + 3),
      location: driver.location || [0, 0],
      status: driver.status || 'Available'
    };
  };

  const enhancedDriver = matchedDriver ? getDriverInfo(matchedDriver) : null;

  return (
    <div style={styles.container}>
      <h3>Book a Ride</h3>

      <div style={styles.inputSection}>
        <input
          type="text"
          placeholder="Pickup location"
          value={pickupQuery}
          onChange={(e) => debouncedFetch(e.target.value, setPickupQuery, setPickupSuggestions)}
          style={styles.input}
        />
        {pickupSuggestions.length > 0 && (
          <div style={styles.suggestionList}>
            {pickupSuggestions.map((place, index) => (
              <div key={index} style={styles.suggestion} onClick={() => handlePickupSelect(place)}>
                {place.display_name}
              </div>
            ))}
          </div>
        )}
        
        {/* Enhanced Current Location Button with Status */}
        <div style={styles.locationButtonContainer}>
          <button 
            onClick={useCurrentLocationForPickup} 
            style={{
              ...styles.currentLocBtn,
              backgroundColor: locationLoading ? '#6c757d' : locationError ? '#dc3545' : currentLocation ? '#28a745' : '#007bff'
            }}
            disabled={loading}
          >
            {locationLoading ? '🔄 Getting Location...' : 
             locationError ? '❌ Location Error' :
             currentLocation ? '📍 Use Current Location' : '📍 Get Location'}
          </button>
          
          {locationError && (
            <div style={styles.locationError}>
              <p style={styles.errorText}>{locationError}</p>
              <button onClick={retryLocation} style={styles.retryBtn}>
                🔄 Retry Location
              </button>
            </div>
          )}
          
          {currentLocation && !locationError && (
            <div style={styles.locationSuccess}>
              <p style={styles.successText}>
                ✅ Location ready: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={styles.inputSection}>
        <input
          type="text"
          placeholder="Drop location"
          value={dropQuery}
          onChange={(e) => debouncedFetch(e.target.value, setDropQuery, setDropSuggestions)}
          style={styles.input}
        />
        {dropSuggestions.length > 0 && (
          <div style={styles.suggestionList}>
            {dropSuggestions.map((place, index) => (
              <div key={index} style={styles.suggestion} onClick={() => handleDropSelect(place)}>
                {place.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Notification Section - added from first code */}
      <div style={styles.notificationSection}>
        <h4 style={styles.notificationTitle}>📱 Booking Notifications</h4>
        
        {/* Notification Preferences */}
        <div style={styles.notificationPrefs}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notificationPrefs.email}
              onChange={() => handleNotificationPrefChange('email')}
              style={styles.checkbox}
            />
            📧 Email Notification
          </label>
          
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notificationPrefs.sms}
              onChange={() => handleNotificationPrefChange('sms')}
              style={styles.checkbox}
            />
            📱 SMS Notification
          </label>
        </div>

        {/* Email Input */}
        {notificationPrefs.email && (
          <div style={styles.inputSection}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={handleEmailChange}
              style={{
                ...styles.input,
                borderColor: emailError ? '#dc3545' : email && validateEmail(email) ? '#28a745' : '#e1e5e9'
              }}
            />
            {emailError && (
              <div style={styles.inputError}>
                <p style={styles.errorText}>{emailError}</p>
              </div>
            )}
            {email && !emailError && validateEmail(email) && (
              <div style={styles.inputSuccess}>
                <p style={styles.successText}>✅ Email confirmation will be sent</p>
              </div>
            )}
          </div>
        )}

        {/* SMS Input - added from first code */}
        {notificationPrefs.sms && (
          <div style={styles.inputSection}>
            <input
              type="tel"
              placeholder="Enter your mobile number (e.g., 9876543210)"
              value={phone}
              onChange={handlePhoneChange}
              style={{
                ...styles.input,
                borderColor: phoneError ? '#dc3545' : phone && validatePhone(phone) ? '#28a745' : '#e1e5e9'
              }}
            />
            {phoneError && (
              <div style={styles.inputError}>
                <p style={styles.errorText}>{phoneError}</p>
              </div>
            )}
            {phone && !phoneError && validatePhone(phone) && (
              <div style={styles.inputSuccess}>
                <p style={styles.successText}>✅ SMS will be sent to {formatPhoneForDisplay(phone)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div style={styles.loading}>
          <p>🔄 Loading...</p>
        </div>
      )}

      {fare !== null && distance !== null && (
        <div style={styles.fareInfo}>
          <p>
            Distance: <strong>{distance} km</strong> | Fare: <strong>₹{fare}</strong>
          </p>
        </div>
      )}

      {enhancedDriver && (
        <div style={styles.driverCard}>
          <h4 style={styles.driverTitle}>🚕 Driver Found - {enhancedDriver.status}</h4>
          <div style={styles.driverInfo}>
            <div style={styles.driverDetail}>
              <strong>👤 Driver:</strong> {enhancedDriver.name} (ID: {enhancedDriver.id})
            </div>
            <div style={styles.driverDetail}>
              <strong>📞 Contact:</strong> {enhancedDriver.phone}
            </div>
            <div style={styles.driverDetail}>
              <strong>🚗 Vehicle:</strong> {enhancedDriver.vehicle.model} ({enhancedDriver.vehicle.number})
            </div>
            <div style={styles.driverDetail}>
              <strong>⭐ Rating:</strong> {enhancedDriver.rating}/5.0
            </div>
            <div style={styles.driverDetail}>
              <strong>📍 Distance:</strong> {enhancedDriver.distance} km away
            </div>
            <div style={styles.driverDetail}>
              <strong>⏰ ETA:</strong> {enhancedDriver.eta} minutes
            </div>
            <div style={styles.driverDetail}>
              <strong>🗺️ Current Location:</strong>
              <div style={styles.locationDisplay}>
                <LocationDisplay coords={enhancedDriver.location} />
              </div>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={bookRide} 
        style={styles.bookBtn}
        disabled={loading || !pickupQuery || !dropQuery || fare === null}
      >
        {loading ? '⏳ Booking...' : 'Book Ride'}
      </button>

      {bookingMessage && (
        <div style={styles.successMessage}>
          {bookingMessage.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      {/* Enhanced Route Map Preview with dynamic updates */}
      <div style={styles.mapSection}>
        <div style={styles.mapControls}>
          <h4 style={styles.mapTitle}>Map View</h4>
          <div style={styles.mapToggle}>
            <button 
              onClick={() => setShowLiveLocation(false)}
              style={{
                ...styles.toggleBtn,
                backgroundColor: !showLiveLocation ? '#007bff' : '#e9ecef',
                color: !showLiveLocation ? 'white' : '#6c757d'
              }}
            >
              🗺️ Route Preview
            </button>
            <button 
              onClick={() => setShowLiveLocation(true)}
              style={{
                ...styles.toggleBtn,
                backgroundColor: showLiveLocation ? '#e91e63' : '#e9ecef',
                color: showLiveLocation ? 'white' : '#6c757d'
              }}
            >
              📍 Live Location
            </button>
          </div>
        </div>
        
        {showLiveLocation ? (
          <LiveLocationTracker />
        ) : (
          <LiveMap 
            pickupCoords={pickupCoords} 
            dropCoords={dropCoords} 
            driverCoords={enhancedDriver?.location}
            pickupAddress={pickupQuery}
            dropAddress={dropQuery}
            driverInfo={enhancedDriver}
            key={`${pickupCoords?.join(',')}-${dropCoords?.join(',')}-${enhancedDriver?.id}`}
          />
        )}
      </div>
    </div>
  );
}

// Component to display readable location
function LocationDisplay({ coords }) {
  const [address, setAddress] = useState('Loading address...');

  useEffect(() => {
    const fetchAddress = async () => {
      if (!coords || coords.length !== 2) {
        setAddress('Invalid coordinates');
        return;
      }

      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: coords[0],
            lon: coords[1],
            addressdetails: 1
          }
        });
        
        if (response.data && response.data.display_name) {
          const fullAddress = response.data.display_name;
          const parts = fullAddress.split(',');
          
          // Extract meaningful parts (street, area, city)
          if (parts.length >= 3) {
            setAddress(`${parts[0].trim()}, ${parts[1].trim()}`);
          } else {
            setAddress(parts[0].trim());
          }
        } else {
          setAddress(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        setAddress(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
      }
    };

    fetchAddress();
  }, [coords]);

  return <span style={styles.addressText}>{address}</span>;
}

const styles = {
  container: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    maxWidth: "450px",
    margin: "auto",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    textAlign: "left",
    fontFamily: "Arial, sans-serif",
  },
  inputSection: {
    marginBottom: "15px",
    position: "relative",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginBottom: "5px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "2px solid #e1e5e9",
    outline: "none",
    transition: "border-color 0.3s",
    boxSizing: "border-box",
  },
  suggestionList: {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    background: "#fff",
    border: "2px solid #e1e5e9",
    borderTop: "none",
    maxHeight: "150px",
    overflowY: "auto",
    zIndex: 1000,
    borderRadius: "0 0 8px 8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  suggestion: {
    padding: "10px",
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "14px",
    transition: "background-color 0.2s",
  },
  currentLocBtn: {
    marginTop: "8px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.3s",
  },
  locationButtonContainer: {
    marginTop: "8px",
  },
  locationError: {
    marginTop: "8px",
    padding: "10px",
    backgroundColor: "#f8d7da",
    borderRadius: "6px",
    border: "1px solid #f5c6cb",
  },
  locationSuccess: {
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "#d4edda",
    borderRadius: "6px",
    border: "1px solid #c3e6cb",
  },
  errorText: {
    color: "#721c24",
    fontSize: "12px",
    margin: "0 0 8px 0",
    lineHeight: "1.4",
  },
  successText: {
    color: "#155724",
    fontSize: "12px",
    margin: "0",
    lineHeight: "1.4",
  },
  retryBtn: {
    backgroundColor: "#ffc107",
    color: "#212529",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
  },
  notificationSection: {
    marginTop: "20px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  notificationTitle: {
    margin: "0 0 15px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#495057",
  },
  notificationPrefs: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#495057",
  },
  checkbox: {
    marginRight: "8px",
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  inputError: {
    marginTop: "5px",
    padding: "6px",
    backgroundColor: "#f8d7da",
    borderRadius: "4px",
    border: "1px solid #f5c6cb",
  },
  inputSuccess: {
    marginTop: "5px",
    padding: "6px",
    backgroundColor: "#d4edda",
    borderRadius: "4px",
    border: "1px solid #c3e6cb",
  },
  loading: {
    textAlign: "center",
    padding: "10px",
    color: "#6c757d",
    fontSize: "14px",
  },
  fareInfo: {
    padding: "12px",
    backgroundColor: "#e7f3ff",
    borderRadius: "8px",
    border: "1px solid #b3d9ff",
    marginBottom: "15px",
    textAlign: "center",
    fontSize: "14px",
    color: "#0056b3",
  },
  driverCard: {
    marginTop: "15px",
    marginBottom: "15px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  driverTitle: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#28a745",
  },
  driverInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  driverDetail: {
    fontSize: "13px",
    color: "#495057",
    lineHeight: "1.4",
  },
  locationDisplay: {
    marginTop: "4px",
    marginLeft: "8px",
  },
  addressText: {
    fontSize: "12px",
    color: "#6c757d",
    fontStyle: "italic",
  },
  bookBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s, opacity 0.3s",
    marginBottom: "15px",
  },
  successMessage: {
    padding: "12px",
    backgroundColor: "#d4edda",
    borderRadius: "8px",
    border: "1px solid #c3e6cb",
    color: "#155724",
    fontSize: "14px",
    lineHeight: "1.5",
    marginBottom: "15px",
    whiteSpace: "pre-line",
  },
  mapSection: {
    marginTop: "20px",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    overflow: "hidden",
  },
  mapControls: {
    padding: "12px 15px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapTitle: {
    margin: "0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#495057",
  },
  mapToggle: {
    display: "flex",
    gap: "8px",
  },
  toggleBtn: {
    padding: "6px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s",
  },
};

export default BookRide;
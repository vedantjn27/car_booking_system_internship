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
      const otp = Math.floor(1000 + Math.random() * 9000);

      const formattedPhone = formatPhoneForDisplay(phone);
      const smsData = {
        phone: formattedPhone,
        message: `Your ride is confirmed! Driver ${rideDetails.driver?.name || 'Ravi'} is on the way 🚗\nYour OTP is: ${otp}`
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

    const rider_email = localStorage.getItem("email"); // ✅ Get logged-in email
    console.log("Rider Email:", rider_email);
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/book-ride', {
        pickup: pickupQuery,
        drop: dropQuery,
        pickup_coords: pickupCoords,
        rider_email
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
    <div style={styles.fullScreenContainer}>
      <div style={styles.mainContent}>
        {/* Header Section */}
        <div style={styles.header}>
          <h1 style={styles.mainTitle}>🚕 Book Your Ride</h1>
          <p style={styles.subtitle}>Fast, reliable, and affordable transportation</p>
        </div>

        {/* Main Form Container */}
        <div style={styles.formContainer}>
          {/* Location Input Section */}
          <div style={styles.locationSection}>
            <h3 style={styles.sectionTitle}>📍 Trip Details</h3>
            
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Pickup Location</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="Enter pickup location"
                  value={pickupQuery}
                  onChange={(e) => debouncedFetch(e.target.value, setPickupQuery, setPickupSuggestions)}
                  style={styles.input}
                />
                {pickupSuggestions.length > 0 && (
                  <div style={styles.suggestionList}>
                    {pickupSuggestions.map((place, index) => (
                      <div key={index} style={styles.suggestion} onClick={() => handlePickupSelect(place)}>
                        <span style={styles.suggestionText}>{place.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhanced Current Location Button */}
              <div style={styles.locationButtonWrapper}>
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
                   currentLocation ? '📍 Use Current Location' : '📍 Get Current Location'}
                </button>
                
                {locationError && (
                  <div style={styles.statusCard}>
                    <div style={styles.errorCard}>
                      <p style={styles.statusText}>{locationError}</p>
                      <button onClick={retryLocation} style={styles.retryBtn}>
                        🔄 Retry Location
                      </button>
                    </div>
                  </div>
                )}
                
                {currentLocation && !locationError && (
                  <div style={styles.statusCard}>
                    <div style={styles.successCard}>
                      <p style={styles.statusText}>
                        ✅ Location ready: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Drop Location</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="Enter destination"
                  value={dropQuery}
                  onChange={(e) => debouncedFetch(e.target.value, setDropQuery, setDropSuggestions)}
                  style={styles.input}
                />
                {dropSuggestions.length > 0 && (
                  <div style={styles.suggestionList}>
                    {dropSuggestions.map((place, index) => (
                      <div key={index} style={styles.suggestion} onClick={() => handleDropSelect(place)}>
                        <span style={styles.suggestionText}>{place.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification Section */}
          <div style={styles.notificationSection}>
            <h3 style={styles.sectionTitle}>📱 Booking Notifications</h3>
            
            <div style={styles.notificationGrid}>
              <label style={styles.checkboxCard}>
                <input
                  type="checkbox"
                  checked={notificationPrefs.email}
                  onChange={() => handleNotificationPrefChange('email')}
                  style={styles.checkbox}
                />
                <div style={styles.checkboxContent}>
                  <span style={styles.checkboxIcon}>📧</span>
                  <span style={styles.checkboxLabel}>Email Notification</span>
                </div>
              </label>
              
              <label style={styles.checkboxCard}>
                <input
                  type="checkbox"
                  checked={notificationPrefs.sms}
                  onChange={() => handleNotificationPrefChange('sms')}
                  style={styles.checkbox}
                />
                <div style={styles.checkboxContent}>
                  <span style={styles.checkboxIcon}>📱</span>
                  <span style={styles.checkboxLabel}>SMS Notification</span>
                </div>
              </label>
            </div>

            {/* Email Input */}
            {notificationPrefs.email && (
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Email Address</label>
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
                  <div style={styles.statusCard}>
                    <div style={styles.errorCard}>
                      <p style={styles.statusText}>{emailError}</p>
                    </div>
                  </div>
                )}
                {email && !emailError && validateEmail(email) && (
                  <div style={styles.statusCard}>
                    <div style={styles.successCard}>
                      <p style={styles.statusText}>✅ Email confirmation will be sent</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SMS Input */}
            {notificationPrefs.sms && (
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Mobile Number</label>
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
                  <div style={styles.statusCard}>
                    <div style={styles.errorCard}>
                      <p style={styles.statusText}>{phoneError}</p>
                    </div>
                  </div>
                )}
                {phone && !phoneError && validatePhone(phone) && (
                  <div style={styles.statusCard}>
                    <div style={styles.successCard}>
                      <p style={styles.statusText}>✅ SMS will be sent to {formatPhoneForDisplay(phone)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          {/* Loading State */}
          {loading && (
            <div style={styles.loadingCard}>
              <div style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Processing your request...</p>
            </div>
          )}

          {/* Fare Information */}
          {fare !== null && distance !== null && (
            <div style={styles.fareCard}>
              <h4 style={styles.fareTitle}>💰 Trip Estimate</h4>
              <div style={styles.fareDetails}>
                <div style={styles.fareItem}>
                  <span style={styles.fareLabel}>Distance:</span>
                  <span style={styles.fareValue}>{distance} km</span>
                </div>
                <div style={styles.fareItem}>
                  <span style={styles.fareLabel}>Estimated Fare:</span>
                  <span style={styles.farePrice}>₹{fare}</span>
                </div>
              </div>
            </div>
          )}

          {/* Driver Information */}
          {enhancedDriver && (
            <div style={styles.driverCard}>
              <div style={styles.driverHeader}>
                <h4 style={styles.driverTitle}>🚕 Driver Assigned</h4>
                <span style={styles.driverStatus}>{enhancedDriver.status}</span>
              </div>
              
              <div style={styles.driverGrid}>
                <div style={styles.driverInfo}>
                  <div style={styles.driverDetail}>
                    <span style={styles.detailIcon}>👤</span>
                    <div>
                      <p style={styles.detailLabel}>Driver</p>
                      <p style={styles.detailValue}>{enhancedDriver.name}</p>
                    </div>
                  </div>
                  
                  <div style={styles.driverDetail}>
                    <span style={styles.detailIcon}>📞</span>
                    <div>
                      <p style={styles.detailLabel}>Contact</p>
                      <p style={styles.detailValue}>{enhancedDriver.phone}</p>
                    </div>
                  </div>
                  
                  <div style={styles.driverDetail}>
                    <span style={styles.detailIcon}>🚗</span>
                    <div>
                      <p style={styles.detailLabel}>Vehicle</p>
                      <p style={styles.detailValue}>{enhancedDriver.vehicle.model} ({enhancedDriver.vehicle.number})</p>
                    </div>
                  </div>
                </div>
                
                <div style={styles.driverStats}>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>⭐ {enhancedDriver.rating}/5.0</span>
                    <span style={styles.statLabel}>Rating</span>
                  </div>
                  
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>📍 {enhancedDriver.distance} km</span>
                    <span style={styles.statLabel}>Distance</span>
                  </div>
                  
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>⏰ {enhancedDriver.eta} min</span>
                    <span style={styles.statLabel}>ETA</span>
                  </div>
                </div>
              </div>
              
              <div style={styles.driverLocation}>
                <span style={styles.locationLabel}>🗺️ Current Location:</span>
                <div style={styles.locationDisplay}>
                  <LocationDisplay coords={enhancedDriver.location} />
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <button 
            onClick={bookRide} 
            style={{
              ...styles.bookBtn,
              opacity: (loading || !pickupQuery || !dropQuery || fare === null) ? 0.6 : 1,
              cursor: (loading || !pickupQuery || !dropQuery || fare === null) ? 'not-allowed' : 'pointer'
            }}
            disabled={loading || !pickupQuery || !dropQuery || fare === null}
          >
            {loading ? (
              <>
                <div style={styles.buttonSpinner}></div>
                Booking...
              </>
            ) : (
              '🚕 Book Ride Now'
            )}
          </button>

          {/* Success Message */}
          {bookingMessage && (
            <div style={styles.successCard}>
              <h4 style={styles.successTitle}>✅ Booking Confirmed!</h4>
              <div style={styles.successContent}>
                {bookingMessage.split('\n').map((line, index) => (
                  <p key={index} style={styles.successLine}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Map Section */}
          <div style={styles.mapSection}>
            <div style={styles.mapHeader}>
              <h4 style={styles.mapTitle}>🗺️ Map View</h4>
              <div style={styles.mapToggle}>
                <button 
                  onClick={() => setShowLiveLocation(false)}
                  style={{
                    ...styles.toggleBtn,
                    ...((!showLiveLocation) ? styles.toggleBtnActive : styles.toggleBtnInactive)
                  }}
                >
                  Route Preview
                </button>
                <button 
                  onClick={() => setShowLiveLocation(true)}
                  style={{
                    ...styles.toggleBtn,
                    ...((showLiveLocation) ? styles.toggleBtnActive : styles.toggleBtnInactive)
                  }}
                >
                  Live Location
                </button>
              </div>
            </div>
            
            <div style={styles.mapContainer}>
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
        </div>
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
  fullScreenContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxSizing: 'border-box',
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    alignItems: 'start',
  },
  header: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    marginBottom: '30px',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '30px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  mainTitle: {
    fontSize: '2.8rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 10px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#6c757d',
    margin: '0',
    fontWeight: '400',
  },
  formContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  locationSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '15px 20px',
    fontSize: '1rem',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  suggestionList: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    background: '#fff',
    border: '2px solid #e9ecef',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  },
  suggestion: {
    padding: '15px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #f8f9fa',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  suggestionText: {
    fontSize: '0.95rem',
    color: '#495057',
    lineHeight: '1.4',
  },
  locationButtonWrapper: {
    marginTop: '15px',
  },
  currentLocBtn: {
    width: '100%',
    padding: '15px 20px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
  },
  statusCard: {
    marginTop: '10px',
  },
  errorCard: {
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    borderRadius: '8px',
    border: '1px solid #f5c6cb',
  },
  successCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '2px solid #28a745',
    backdropFilter: 'blur(10px)',
  },
  successTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#28a745',
    margin: '0 0 15px 0',
  },
  successContent: {
    color: '#155724',
  },
  successLine: {
    margin: '5px 0',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  statusText: {
    fontSize: '0.85rem',
    margin: '0',
    lineHeight: '1.4',
    color: 'inherit',
  },
  retryBtn: {
    marginTop: '8px',
    padding: '8px 16px',
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
  },
  notificationSection: {
    padding: '25px',
    backgroundColor: '#f8f9fa',
    borderRadius: '15px',
    border: '1px solid #e9ecef',
  },
  notificationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px',
  },
  checkboxCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '2px solid #e9ecef',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '12px',
    cursor: 'pointer',
    accentColor: '#007bff',
  },
  checkboxContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkboxIcon: {
    fontSize: '1.2rem',
  },
  checkboxLabel: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#495057',
  },
  loadingCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px auto',
  },
  loadingText: {
    fontSize: '1rem',
    color: '#6c757d',
    margin: '0',
    fontWeight: '500',
  },
  fareCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '2px solid #007bff',
  },
  fareTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#007bff',
    margin: '0 0 15px 0',
  },
  fareDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  fareItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #e9ecef',
  },
  fareLabel: {
    fontSize: '0.95rem',
    color: '#6c757d',
    fontWeight: '500',
  },
  fareValue: {
    fontSize: '1rem',
    color: '#495057',
    fontWeight: '600',
  },
  farePrice: {
    fontSize: '1.2rem',
    color: '#007bff',
    fontWeight: '700',
  },
  driverCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '2px solid #28a745',
  },
  driverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e9ecef',
  },
  driverTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#28a745',
    margin: '0',
  },
  driverStatus: {
    padding: '5px 15px',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  driverGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  driverInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  driverDetail: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  detailIcon: {
    fontSize: '1.2rem',
    width: '24px',
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: '0.8rem',
    color: '#6c757d',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: '0.95rem',
    color: '#495057',
    margin: '0',
    fontWeight: '500',
  },
  driverStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  statItem: {
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  statValue: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#495057',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  driverLocation: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
  },
  locationLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#495057',
    display: 'block',
    marginBottom: '8px',
  },
  locationDisplay: {
    marginLeft: '8px',
  },
  addressText: {
    fontSize: '0.85rem',
    color: '#6c757d',
    fontStyle: 'italic',
    lineHeight: '1.4',
  },
  bookBtn: {
    width: '100%',
    padding: '18px 30px',
    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 8px 25px rgba(40, 167, 69, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  buttonSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  mapSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  mapHeader: {
    padding: '20px 25px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#495057',
    margin: '0',
  },
  mapToggle: {
    display: 'flex',
    gap: '5px',
    backgroundColor: '#fff',
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  toggleBtn: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  toggleBtnActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
  },
  toggleBtnInactive: {
    backgroundColor: 'transparent',
    color: '#6c757d',
  },
  mapContainer: {
    minHeight: '300px',
    backgroundColor: '#f8f9fa',
    // Remove display: 'flex', alignItems, justifyContent
    // These interfere with map rendering
    width: '100%',
    position: 'relative',
  },
  
  // Responsive Design
  '@media (max-width: 1200px)': {
    mainContent: {
      gridTemplateColumns: '1fr',
      gap: '20px',
    },
    header: {
      padding: '20px',
    },
    mainTitle: {
      fontSize: '2.2rem',
    },
    formContainer: {
      padding: '20px',
    },
  },
  
  '@media (max-width: 768px)': {
    fullScreenContainer: {
      padding: '10px',
    },
    header: {
      padding: '15px',
    },
    mainTitle: {
      fontSize: '1.8rem',
    },
    subtitle: {
      fontSize: '1rem',
    },
    formContainer: {
      padding: '15px',
    },
    notificationGrid: {
      gridTemplateColumns: '1fr',
    },
    driverGrid: {
      gridTemplateColumns: '1fr',
    },
    mapToggle: {
      flexDirection: 'column',
      gap: '8px',
    },
  },
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .suggestion:hover {
    background-color: #f8f9fa !important;
    transform: translateX(5px);
  }
  
  .checkboxCard:hover {
    border-color: #007bff !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1) !important;
  }
  
  .bookBtn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(40, 167, 69, 0.4) !important;
  }
  
  .toggleBtn:hover {
    transform: translateY(-1px);
  }
  
  .input:focus {
    border-color: #007bff !important;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.1) !important;
    transform: translateY(-1px);
  }
  
  .currentLocBtn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
  }
  
  .retryBtn:hover {
    background-color: #e0a800 !important;
    transform: translateY(-1px);
  }
`;
document.head.appendChild(styleSheet);
export default BookRide;
import axios from 'axios';

export const geocodePlace = async (placeName) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;

  const response = await axios.get(url, {
    headers: {
      'Accept-Language': 'en', // Avoid non-English results
    }
  });

  if (response.data.length === 0) {
    throw new Error(`Location "${placeName}" not found`);
  }

  const { lat, lon, display_name } = response.data[0];
  return {
    coords: [parseFloat(lat), parseFloat(lon)],
    name: display_name
  };
};
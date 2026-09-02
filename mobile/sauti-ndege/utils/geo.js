/**
 * Haversine distance between two coordinates, in kilometers.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formats a km distance for display, honoring the user's distance-unit preference.
 */
export function formatDistance(km, unit = 'km') {
  const value = unit === 'mi' ? km * 0.621371 : km;
  const rounded = value < 10 ? value.toFixed(1) : Math.round(value);
  return `${rounded} ${unit} away`;
}
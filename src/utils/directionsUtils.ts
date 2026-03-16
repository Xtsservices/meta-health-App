const GOOGLE_MAPS_API_KEY = "AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo"

// Types for Google Directions API
export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  coordinates: RouteCoordinates[];
  distance: string; // e.g., "5.2 km"
  duration: string; // e.g., "15 mins"
  bounds: {
    northeast: Location;
    southwest: Location;
  };
}

/**
 * Decode Google Maps encoded polyline string into array of coordinates
 * This uses the Polyline Algorithm Decoder
 * @param encoded - Encoded polyline string from Google Directions API
 * @returns Array of {latitude, longitude} coordinates
 */
export function decodePolyline(encoded: string): RouteCoordinates[] {
  const points: RouteCoordinates[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    // Decode latitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Calculate bounds that encompass all route coordinates
 * @param coordinates - Array of route coordinates
 * @returns Bounds object with northeast and southwest corners
 */
export function calculateRouteBounds(coordinates: RouteCoordinates[]): {
  northeast: Location;
  southwest: Location;
} {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounds for empty coordinates array');
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  return {
    northeast: { latitude: maxLat, longitude: maxLng },
    southwest: { latitude: minLat, longitude: minLng },
  };
}

/**
 * Fetch route from Google Directions API
 * @param origin - Starting location {latitude, longitude}
 * @param destination - Ending location {latitude, longitude}
 * @returns Route information including coordinates, distance, duration, and bounds
 */
export async function getDirections(
  origin: Location,
  destination: Location,
): Promise<DirectionsResult> {
  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;

    // Build Google Directions API URL
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

    console.log('🚗 Fetching route from Google Directions API...');

    const response = await fetch(url);
    const data = await response.json();
    console.log('📍 Directions API response received', data);
    
    // Check if API returned valid results
    if (data.status !== 'OK') {
      throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found between these locations');
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Decode the polyline to get route coordinates
    const encodedPolyline = route.overview_polyline.points;
    const coordinates = decodePolyline(encodedPolyline);

    console.log(`✅ Route fetched: ${leg.distance.text}, ${leg.duration.text}, ${coordinates.length} points`);

    // Calculate bounds for the route
    const bounds = calculateRouteBounds(coordinates);

    return {
      coordinates,
      distance: leg.distance.text,
      duration: leg.duration.text,
      bounds,
    };
  } catch (error) {
    console.error('❌ Error fetching directions:', error);
    throw error;
  }
}

/**
 * Calculate padding for map region to fit route nicely
 * @returns Padding object for fitToCoordinates
 */
export function getMapPadding() {
  return {
    top: 100,
    right: 50,
    bottom: 350, // Extra padding for bottom search panel
    left: 50,
  };
}

/**
 * Simplify route coordinates for better performance
 * Reduces the number of points while maintaining route shape
 * @param coordinates - Original route coordinates
 * @param _tolerance - Simplification tolerance (higher = fewer points) - Reserved for future use
 * @returns Simplified array of coordinates
 */
export function simplifyRoute(
  coordinates: RouteCoordinates[],
  _tolerance: number = 0.0001
): RouteCoordinates[] {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  // Keep first and last points, sample middle points
  const simplified: RouteCoordinates[] = [coordinates[0]];
  
  for (let i = 1; i < coordinates.length - 1; i += Math.ceil(coordinates.length / 50)) {
    simplified.push(coordinates[i]);
  }
  
  simplified.push(coordinates[coordinates.length - 1]);
  
  return simplified;
}

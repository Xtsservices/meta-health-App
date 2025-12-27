import { AuthFetch } from '../auth/auth';
import { getSocket } from '../socket/socket';

// Interface for API response
export interface TripRequestResponse {
  message: string;
  requests: TripRequestAPI[];
}

// Interface for raw API data
export interface TripRequestAPI {
  requestID: number;
  bookingID: number;
  patientUserID: number;
  fromLatitude: string;
  fromLongitude: string;
  toLatitude: string;
  toLongitude: string;
  bookingStatus: string;
  requestStatus: string;
  requestedAt: string;
}

// Interface for formatted trip request with location names
export interface TripRequest {
  id: string;
  patientName: string;
  pickupAddress: string;
  dropAddress: string;
  distance: string;
  estimatedTime: string;
  priority: string;
  requestTime: string;
  requestID: number;
  bookingID: number;
  patientUserID: number;
  fromLatitude: string;
  fromLongitude: string;
  toLatitude: string;
  toLongitude: string;
  bookingStatus: string;
  requestStatus: string;
}

/**
 * Reverse geocode coordinates to get human-readable address
 * Using Nominatim (OpenStreetMap) API - free and no API key required
 */
async function reverseGeocode(
  latitude: string,
  longitude: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MetaHealthApp/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Build a readable address from the response
    if (data.display_name) {
      return data.display_name;
    }
    
    // Fallback: construct address from components
    const address = data.address || {};
    const parts = [
      address.road || address.street,
      address.suburb || address.neighbourhood,
      address.city || address.town || address.village,
      address.state,
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : `${latitude}, ${longitude}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Return coordinates as fallback
    return `${latitude}, ${longitude}`;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Calculate estimated time based on distance
 * Assumes average speed of 30 km/h in city traffic
 */
function calculateEstimatedTime(distanceKm: number): string {
  const averageSpeed = 30; // km/h
  const timeInHours = distanceKm / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} mins`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Determine priority based on distance and booking status
 */
function determinePriority(distance: number, bookingStatus: string): string {
  if (bookingStatus === 'emergency' || distance > 15) {
    return 'High';
  } else if (distance > 5) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Format time from ISO string to readable format
 */
function formatRequestTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

/**
 * Fetch trip requests from API and format them with location names
 */
export async function fetchTripRequests(
  token?: string | null
): Promise<TripRequest[]> {
  try {
    const response: any = await AuthFetch(
      'ambulance/driver/bookingRequests',
      token
    );

    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch trip requests');
    }

    if (!response.data || !response.data.requests) {
      return [];
    }

    const requests: TripRequestAPI[] = response.data.requests;

    // Process each request and get location names
    const formattedRequests = await Promise.all(
      requests.map(async (request) => {
        // Get location names using reverse geocoding
        const [pickupAddress, dropAddress] = await Promise.all([
          reverseGeocode(request.fromLatitude, request.fromLongitude),
          reverseGeocode(request.toLatitude, request.toLongitude),
        ]);

        // Calculate distance
        const distanceKm = calculateDistance(
          parseFloat(request.fromLatitude),
          parseFloat(request.fromLongitude),
          parseFloat(request.toLatitude),
          parseFloat(request.toLongitude)
        );

        // Format distance
        const distance =
          distanceKm < 1
            ? `${Math.round(distanceKm * 1000)} m`
            : `${distanceKm.toFixed(1)} km`;

        // Calculate estimated time
        const estimatedTime = calculateEstimatedTime(distanceKm);

        // Determine priority
        const priority = determinePriority(distanceKm, request.bookingStatus);

        // Format request time
        const requestTime = formatRequestTime(request.requestedAt);

        return {
          id: `trip_${request.requestID}`,
          patientName: `Patient #${request.patientUserID}`, // You might want to fetch actual patient name from another API
          pickupAddress,
          dropAddress,
          distance,
          estimatedTime,
          priority,
          requestTime,
          requestID: request.requestID,
          bookingID: request.bookingID,
          patientUserID: request.patientUserID,
          fromLatitude: request.fromLatitude,
          fromLongitude: request.fromLongitude,
          toLatitude: request.toLatitude,
          toLongitude: request.toLongitude,
          bookingStatus: request.bookingStatus,
          requestStatus: request.requestStatus,
        };
      })
    );

    return formattedRequests;
  } catch (error) {
    console.error('Error fetching trip requests:', error);
    throw error;
  }
}

/**
 * Accept a trip request
 */
export async function acceptTripRequest(
  requestID: number,
  token?: string | null
): Promise<any> {
  try {
    // TODO: Replace with actual API endpoint
    const response: any = await AuthFetch(
      `ambulance/driver/acceptTrip?requestID=${requestID}`,
      token
    );

    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to accept trip');
    }

    return response.data;
  } catch (error) {
    console.error('Error accepting trip:', error);
    throw error;
  }
}

/**
 * Reject a trip request
 */
export async function rejectTripRequest(
  requestID: number,
  token?: string | null
): Promise<any> {
  try {
    // TODO: Replace with actual API endpoint
    const response: any = await AuthFetch(
      `ambulance/driver/rejectTrip?requestID=${requestID}`,
      token
    );

    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to reject trip');
    }

    return response.data;
  } catch (error) {
    console.error('Error rejecting trip:', error);
    throw error;
  }
}

/**
 * Setup Socket.IO listener for driver booking requests
 * This will listen for real-time trip requests from the backend
 */
export function setupTripRequestsSocketListener(
  userId: number,
  onRequestsReceived: (requests: TripRequest[]) => void
): () => void {
  const socket = getSocket();
  
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  console.log('🔌 Setting up trip requests socket listener for user:', userId);

  // Listen for driver booking requests from backend
  const handleDriverBookingRequests = async (data: { requests: TripRequestAPI[] }) => {
    console.log('📨 Received driver booking requests:', data);
    
    try {
      if (!data.requests || data.requests.length === 0) {
        onRequestsReceived([]);
        return;
      }

      // Process each request and get location names
      const formattedRequests = await Promise.all(
        data.requests.map(async (request) => {
          // Get location names using reverse geocoding
          const [pickupAddress, dropAddress] = await Promise.all([
            reverseGeocode(request.fromLatitude, request.fromLongitude),
            reverseGeocode(request.toLatitude, request.toLongitude),
          ]);

          // Calculate distance
          const distanceKm = calculateDistance(
            parseFloat(request.fromLatitude),
            parseFloat(request.fromLongitude),
            parseFloat(request.toLatitude),
            parseFloat(request.toLongitude)
          );

          // Format distance
          const distance =
            distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} km`;

          // Calculate estimated time
          const estimatedTime = calculateEstimatedTime(distanceKm);

          // Determine priority
          const priority = determinePriority(distanceKm, request.bookingStatus);

          // Format request time
          const requestTime = formatRequestTime(request.requestedAt);

          return {
            id: `trip_${request.requestID}`,
            patientName: `Patient #${request.patientUserID}`,
            pickupAddress,
            dropAddress,
            distance,
            estimatedTime,
            priority,
            requestTime,
            requestID: request.requestID,
            bookingID: request.bookingID,
            patientUserID: request.patientUserID,
            fromLatitude: request.fromLatitude,
            fromLongitude: request.fromLongitude,
            toLatitude: request.toLatitude,
            toLongitude: request.toLongitude,
            bookingStatus: request.bookingStatus,
            requestStatus: request.requestStatus,
          };
        })
      );

      onRequestsReceived(formattedRequests);
    } catch (error) {
      console.error('Error processing driver booking requests:', error);
      onRequestsReceived([]);
    }
  };

  socket.on('driver-booking-requests', handleDriverBookingRequests);

  // Return cleanup function
  return () => {
    console.log('🔌 Cleaning up trip requests socket listener');
    socket.off('driver-booking-requests', handleDriverBookingRequests);
  };
}

/**
 * Request driver booking requests via Socket.IO
 * This emits an event to get the current trip requests
 */
export function requestDriverBookingRequests(userId: number): void {
  const socket = getSocket();
  
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  console.log('📤 Requesting driver booking requests for user:', userId);
  socket.emit('get-driver-booking-requests', { userId });
}

/**
 * Setup real-time trip requests listener
 * NO POLLING - Socket.IO will push data automatically when available
 * Returns a cleanup function to remove the listener
 */
export function setupTripRequestsListener(
  userId: number,
  onRequestsReceived: (requests: TripRequest[]) => void
): () => void {
  console.log('� Setting up real-time trip requests listener for user:', userId);

  // Setup socket listener - this will receive data automatically when backend pushes it
  const cleanupListener = setupTripRequestsSocketListener(userId, onRequestsReceived);

  // Request initial data once
  requestDriverBookingRequests(userId);

  // Return cleanup function (NO INTERVAL - socket handles real-time updates)
  return () => {
    console.log('� Cleaning up trip requests listener');
    cleanupListener();
  };
}

import { AuthFetch, AuthPost } from '../auth/auth';
import { getSocket } from '../socket/socket';
import { playNotificationSound } from '../utils/notificationSound';

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
  fromAddress: string;
  toAddress: string;
  bookingType: string;
  bookingStatus: 'NORMAL' | 'SOS';
  requestStatus: string;
  requestedAt: string;
  distance?: string;
  estimatedTime?: string;
  driverToPickupETA?: {
    distanceMeters: number;
    distanceText: string;
    durationSeconds: number;
    durationText: string;
  } | null;
  pickupToDestinationETA?: {
    distanceMeters: number;
    distanceText: string;
    durationSeconds: number;
    durationText: string;
  } | null;
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
 * Determine priority based on booking status or booking type
 * SOS = Emergency, NORMAL = Normal
 */
function determinePriority(bookingStatus: string, bookingType?: string): string {
  // Check both fields, case-insensitive
  const isSOSStatus = bookingStatus && bookingStatus.toUpperCase() === 'SOS';
  const isSOSType = bookingType && bookingType.toUpperCase() === 'SOS';
  
  return (isSOSStatus || isSOSType) ? 'Emergency' : 'Normal';
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

    // Process each request - use addresses directly from backend
    const formattedRequests = requests.map((request) => {
      // Use addresses directly from backend
      const pickupAddress = request.fromAddress || `${request.fromLatitude}, ${request.fromLongitude}`;
      
      // For SOS bookings, drop location is pending
      const dropAddress = request.bookingStatus === 'SOS' 
        ? 'Pending' 
        : (request.toAddress || `${request.toLatitude}, ${request.toLongitude}`);

      // Use driverToPickupETA for distance and time
      const distance = request.driverToPickupETA?.distanceText || request.distance || 'N/A';
      const estimatedTime = request.driverToPickupETA?.durationText || request.estimatedTime || 'N/A';

      // Determine priority based on booking status
      const priority = determinePriority(request.bookingStatus, request.bookingType);
      console.log(`Request ${request.requestID}: bookingStatus=${request.bookingStatus}, bookingType=${request.bookingType}, priority=${priority}`);

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
    });

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
    console.log('Accepting trip request:', requestID);
    // TODO: Replace with actual API endpoint
    const response: any = await AuthPost(
      `ambulance/driver/bookings/${requestID}/accept`,
      {},
      token
    );
    console.log('Trip accepted successfully:', response.data);
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to accept trip');
    }
    console.log('Trip accepted successfully:', response.data);
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

// Track previous trip IDs to detect new trips
let previousTripIds = new Set<number>();

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
  const handleDriverBookingRequests = (data: { requests: TripRequestAPI[] }) => {
    console.log('📨 Received driver booking requests:', data);
    
    try {
      if (!data.requests || data.requests.length === 0) {
        previousTripIds.clear();
        onRequestsReceived([]);
        return;
      }

      // Check for NEW trips by comparing with previous trip IDs
      const currentTripIds = new Set(data.requests.map(req => req.requestID));
      const newTrips = data.requests.filter(req => !previousTripIds.has(req.requestID));
      const hasNewTrips = newTrips.length > 0;
      
      console.log('Previous trip IDs:', Array.from(previousTripIds));
      console.log('Current trip IDs:', Array.from(currentTripIds));
      console.log('New trips count:', newTrips.length);

      // Only play sound if there are NEW trips
      if (hasNewTrips) {
        // Check if there's any SOS booking in the NEW requests
        console.log('Checking for SOS bookings in NEW requests:', newTrips);
        
        // Check both bookingStatus and bookingType fields, case-insensitive
        const hasSOSBooking = newTrips.some(req => {
          const isSOSStatus = req.bookingStatus && req.bookingStatus.toUpperCase() === 'SOS';
          const isSOSType = req.bookingType && req.bookingType.toUpperCase() === 'SOS';
          console.log(`New Request ${req.requestID}: bookingStatus=${req.bookingStatus}, bookingType=${req.bookingType}, isSOSStatus=${isSOSStatus}, isSOSType=${isSOSType}`);
          return isSOSStatus || isSOSType;
        });
        
        console.log('Has SOS booking in NEW trips:', hasSOSBooking);
        console.log('Playing sound:', hasSOSBooking ? 'SOS (Emergency)' : 'NORMAL');
        playNotificationSound(hasSOSBooking ? 'SOS' : 'NORMAL');
      } else {
        console.log('No new trips, sound not played');
      }
      
      // Update previous trip IDs
      previousTripIds = currentTripIds;

      // Process each request - use addresses directly from backend
      const formattedRequests = data.requests.map((request) => {
        // Use addresses directly from backend
        const pickupAddress = request.fromAddress || `${request.fromLatitude}, ${request.fromLongitude}`;
        
        // For SOS bookings, drop location is pending
        const dropAddress = request.bookingStatus === 'SOS' 
          ? 'Pending' 
          : (request.toAddress || `${request.toLatitude}, ${request.toLongitude}`);

        // Use driverToPickupETA for distance and time
        const distance = request.driverToPickupETA?.distanceText || request.distance || 'N/A';
        const estimatedTime = request.driverToPickupETA?.durationText || request.estimatedTime || 'N/A';

        // Determine priority based on booking status
        const priority = determinePriority(request.bookingStatus, request.bookingType);

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
      });

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

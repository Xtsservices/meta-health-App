# Live Ambulance Tracking Implementation

## Overview
This document describes the implementation of real-time ambulance tracking with Google Maps road-based routing in the Meta Health App.

## Key Features Implemented

### 1. **Real-Time Location Tracking** 🚑
- **Live Updates**: Ambulance location updates every 3 seconds (configurable)
- **Smooth Animation**: Map smoothly animates to follow the ambulance
- **Visual Indicator**: "LIVE" badge shows active tracking status
- **Continuous Tracking**: Location is tracked throughout the entire trip lifecycle

### 2. **Google Directions API Integration** 🗺️
- **Road-Based Routes**: Replaces straight lines with actual driving routes
- **Accurate Distance & Time**: Real distance and ETA from Google Maps
- **Traffic Awareness**: Shows current traffic conditions on the map
- **Auto-Refresh**: Route updates every 30 seconds to reflect traffic changes

### 3. **Intelligent Route Display** 📍

#### During "Accepted" Status (Heading to Pickup):
- Shows route from **current ambulance location** → **pickup location**
- Blue polyline color (`COLORS.primary`)
- Pickup marker with green pin
- Ambulance marker with custom 🚑 icon

#### During "In Progress" Status (Patient Onboard):
- Shows route from **current ambulance location** → **drop location**
- Green polyline color (`COLORS.success`)
- Drop marker with red pin
- Ambulance marker continuously updates position

## Technical Implementation

### New Dependencies Added
```typescript
import {
  getDirections,
  DirectionsResult,
  RouteCoordinates,
} from '../../utils/directionsUtils';
```

### New State Variables
```typescript
const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinates[]>([]);
const [loadingRoute, setLoadingRoute] = useState(false);
```

### Location Tracking Enhancement
```typescript
// Updates every 3 seconds for real-time tracking
const intervalId = setInterval(updateCurrentLocation, 3000);
```

### Route Fetching Logic
```typescript
useEffect(() => {
  const fetchRoute = async () => {
    // Determines origin and destination based on trip status
    // Fetches route from Google Directions API
    // Updates map with accurate coordinates
    // Refreshes every 30 seconds
  };
}, [activeTrip?.status, currentLocation]);
```

### Map Enhancements
```typescript
<MapView
  showsTraffic={true}        // Shows traffic conditions
  loadingEnabled={true}      // Shows loading indicator
  followsUserLocation={false} // Manual camera control for smooth tracking
/>
```

### Road-Based Polyline
```typescript
{routeCoordinates.length > 0 && (
  <Polyline
    coordinates={routeCoordinates}
    strokeWidth={5}
    geodesic={true}           // Follows Earth's curvature
    lineDashPattern={[0]}     // Solid line
  />
)}
```

## Data Flow

### 1. **Trip Initialization**
```
API Response → Parse Pickup/Drop Coordinates → Store in activeTrip
```

### 2. **Live Location Loop**
```
Every 3 seconds:
  ├─ Get Current GPS Location
  ├─ Update currentLocation state
  ├─ Animate map camera to follow ambulance
  └─ Update distance to destination
```

### 3. **Route Calculation Loop**
```
Every 30 seconds (or when status changes):
  ├─ Determine origin (current location) & destination
  ├─ Call Google Directions API
  ├─ Decode polyline into coordinates
  ├─ Update routeCoordinates for map rendering
  └─ Update distance & ETA from Google data
```

### 4. **Map Rendering**
```
Map renders:
  ├─ Ambulance marker at currentLocation (updates every 3s)
  ├─ Destination marker (pickup or drop based on status)
  ├─ Road-based polyline (routeCoordinates)
  └─ Traffic overlay
```

## User Experience Improvements

### Visual Enhancements
- **Live Indicator**: Red pulsing "LIVE" badge shows active tracking
- **Smooth Movement**: Ambulance marker moves smoothly, not jumpy
- **Realistic Routes**: Routes follow actual roads, not straight lines
- **Traffic Display**: Shows current traffic conditions

### Accuracy Improvements
- **No More Straight Lines**: Uses Google's road network
- **Real Distance**: Actual driving distance, not "as the crow flies"
- **Real ETA**: Considers traffic, speed limits, road types
- **Dynamic Updates**: Route adjusts if driver takes alternate path

### Performance Optimizations
- **Efficient Updates**: Only fetches route when needed
- **Fallback Mechanism**: Shows dashed line if API fails
- **Smart Intervals**: 3s for location, 30s for route to balance accuracy & API costs

## Configuration

### Update Intervals (Customizable)
```typescript
// Location tracking interval
const intervalId = setInterval(updateCurrentLocation, 3000); // 3 seconds

// Route refresh interval
const routeRefreshInterval = setInterval(fetchRoute, 30000); // 30 seconds
```

### Map Camera Settings
```typescript
mapRef.current.animateCamera({
  zoom: 16,        // Adjust for closer/wider view
  duration: 1000,  // Animation smoothness
});
```

## API Requirements

### Google Maps API Key
Ensure `GOOGLE_MAPS_API_KEY` is set in your `.env` file:
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Required Google APIs
1. **Directions API** - For route calculation
2. **Geocoding API** - For address lookup
3. **Maps SDK for Android/iOS** - For map rendering

## Testing Checklist

- [ ] Location permission granted
- [ ] Google Maps API key configured
- [ ] Location updates every 3 seconds
- [ ] Route shows curved road-based path (not straight line)
- [ ] "LIVE" indicator appears
- [ ] Map follows ambulance smoothly
- [ ] Route updates when status changes (accepted → in_progress)
- [ ] Distance and ETA show realistic values
- [ ] Traffic overlay visible
- [ ] Works on both Android and iOS

## Future Enhancements

### Potential Additions
1. **Turn-by-Turn Navigation**: Voice guidance for drivers
2. **Speed Monitoring**: Track if driver exceeds speed limits
3. **Route Deviation Alerts**: Notify if driver goes off-route
4. **ETA Sharing**: Send live ETA to patient/hospital
5. **Trip Replay**: Playback of completed trips
6. **Multi-stop Routes**: Support for multiple pickups/drops

### Performance Optimizations
1. **Location Prediction**: Predict next position for smoother animation
2. **Route Caching**: Cache routes to reduce API calls
3. **Adaptive Intervals**: Slower updates when stopped, faster when moving
4. **Battery Optimization**: Reduce frequency when app in background

## Troubleshooting

### Route Not Showing
- Check Google Maps API key is valid
- Verify Directions API is enabled in Google Cloud Console
- Check network connectivity
- Review console logs for API errors

### Location Not Updating
- Verify location permissions granted
- Check GPS is enabled on device
- Test in outdoor environment (GPS works better outside)
- Review `getCurrentLocation()` function

### Straight Line Instead of Route
- Verify `routeCoordinates` state is populated
- Check API response in console logs
- Ensure polyline decoding is working
- Verify `geodesic={true}` is set on Polyline

## Cost Considerations

### Google Maps API Pricing (as of 2024)
- **Directions API**: $5 per 1,000 requests
- **Route updates every 30s**: ~120 requests per hour per ambulance
- **Estimated cost**: ~$0.60 per hour per active ambulance

### Cost Optimization Tips
1. Increase route refresh interval (e.g., 60 seconds)
2. Only fetch route when trip is active
3. Use route caching for frequently traveled paths
4. Consider using free tier limits (first $200/month free)

## Conclusion

This implementation provides professional-grade, real-time ambulance tracking with accurate road-based routing. The system balances accuracy, performance, and API costs while delivering a smooth user experience for ambulance drivers.

---

**Last Updated**: December 28, 2025
**Version**: 1.0.0
**Component**: `AmbulanceDriverActiveTrip.tsx`

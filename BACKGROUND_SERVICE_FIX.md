# Background Service Fix Documentation

## Problem
The background location tracking service was stopping after 30-47 seconds when the app was minimized or when switching screens.

## Root Causes Identified

### 1. **useFocusEffect Cleanup Function** ⚠️
**Location:** `AmbulanceDriverFooter.tsx` line 178-186

**Problem:** The cleanup function in `useFocusEffect` was stopping the background service whenever the screen lost focus. This meant:
- Minimizing the app → Service stopped
- Switching to another screen → Service stopped
- Pressing home button → Service stopped

**Fix:** Removed the cleanup logic that stopped tracking on screen blur. Now the service only stops when:
- The component unmounts (app closes)
- User logs out
- User explicitly goes offline

### 2. **No Location Updates Received** 📍
**Location:** `locationUtils.ts` backgroundTask function

**Problem:** 
- No initial position was being fetched before starting watchPosition
- watchPosition was timing out due to poor GPS signal indoors
- Using `enableHighAccuracy: false` but still expecting GPS-level accuracy

**Fix:** 
- Added `getCurrentPosition()` call to get immediate location before starting watch
- Increased timeout from 60s to 30s per update (more realistic)
- Improved error handling for timeouts
- Added better logging to track location updates

### 3. **Poor Indoor GPS Performance** 🏠
**Location:** `locationUtils.ts` watchPosition configuration

**Problem:** GPS signal is very weak indoors, causing constant timeouts

**Fix:**
- Using `enableHighAccuracy: false` to prefer NETWORK location (cell towers + WiFi)
- Set `distanceFilter: 10` to update every 10 meters (saves battery, reduces noise)
- Set `maximumAge: 15000` to accept cached locations up to 15 seconds old
- Network location works much better indoors than GPS

### 4. **NoTripRequests Component GPS Issues** 📡
**Location:** `NoTripRequests.tsx`

**Problem:** 
- Only using watchPosition without initial position
- No timeout or maximumAge settings
- GPS was showing "No Signal" immediately

**Fix:**
- Added `getCurrentPosition()` for immediate GPS reading
- Added proper timeout and maximumAge settings
- Improved error logging with emojis
- Better accuracy threshold handling

## Changes Made

### File: `AmbulanceDriverFooter.tsx`
```typescript
// BEFORE: Stopped tracking on screen blur
return () => {
  clearTimeout(timer);
  if (trackingStartedRef.current && user?.id) {
    stopLocationTracking(); // ❌ This was stopping the service!
  }
};

// AFTER: Keep tracking in background
return () => {
  clearTimeout(timer);
  console.log('📱 Screen lost focus but keeping background tracking active');
};

// Added proper cleanup on unmount
React.useEffect(() => {
  return () => {
    if (trackingStartedRef.current) {
      stopLocationTracking(); // ✅ Only stop when app closes
    }
  };
}, []);
```

### File: `locationUtils.ts`
```typescript
// Added initial position fetch
Geolocation.getCurrentPosition(
  position => {
    console.log("✅ Got initial position!");
    // Emit immediately
    socket.emit('location-update', locationData);
  },
  error => console.warn('⚠️ Could not get initial position'),
  {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 30000, // Accept 30s old cache
  }
);

// Improved watchPosition config
{
  enableHighAccuracy: false, // ⚡ NETWORK mode
  distanceFilter: 10, // Update every 10m
  interval: 5000,
  timeout: 30000, // 30s per update
  maximumAge: 15000, // Accept 15s old cache
}

// Added heartbeat to keep service alive
let heartbeatCount = 0;
while (BackgroundService.isRunning()) {
  await sleep(THROTTLE_TIME);
  heartbeatCount++;
  console.log('💓 Background service heartbeat #' + heartbeatCount);
  
  // Update notification every 30 seconds
  if (heartbeatCount % 6 === 0) {
    await BackgroundService.updateNotification({
      taskDesc: `Active - ${Math.floor(heartbeatCount * 5 / 60)} minutes`,
    });
  }
}
```

### File: `NoTripRequests.tsx`
```typescript
// Added getCurrentPosition for immediate reading
Geolocation.getCurrentPosition(
  position => {
    const status = getGpsSignalStrength(position.coords.accuracy);
    setGpsStatus(status);
  },
  error => {
    console.log('⚠️ Initial GPS Error:', error.message, error.code);
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  }
);

// Then start watchPosition
watchId = Geolocation.watchPosition(
  // ... with proper timeout and maximumAge
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
  }
);
```

## Testing Instructions

### 1. Test Background Service Persistence
1. ✅ Start the app and go online
2. ✅ Minimize the app (press home button)
3. ✅ Wait 1-2 minutes
4. ✅ Check logs: `adb logcat | grep "💓 Background"`
5. ✅ Should see heartbeat messages every 5 seconds

### 2. Test Indoor Location Tracking
1. ✅ Stay indoors (weak GPS signal)
2. ✅ Go online as driver
3. ✅ Check logs: `adb logcat | grep "📍 Position"`
4. ✅ Should see position updates with NETWORK location
5. ✅ Accuracy should be 10-100 meters (normal for network location)

### 3. Test GPS Signal Display
1. ✅ Open No Trip Requests screen
2. ✅ Check GPS Signal card
3. ✅ Should show "Weak" or "Good" instead of "No Signal"
4. ✅ Accuracy should display (e.g., "±45m")

### 4. Test Service Cleanup
1. ✅ Start tracking
2. ✅ Close the app completely (swipe from recents)
3. ✅ Check notification area
4. ✅ Notification should disappear (service stopped)

## Expected Behavior

### ✅ When App is in Foreground
- Location updates every 5 seconds (throttled)
- GPS signal indicator updates in real-time
- Socket emits location to server

### ✅ When App is in Background
- Background service notification visible
- Heartbeat logs every 5 seconds
- Location updates continue
- Notification updates every 30 seconds

### ✅ When App is Closed
- Background service stops cleanly
- watchPosition cleared
- Notification dismissed

## Logs to Monitor

```bash
# Monitor background service
adb logcat "*:S" "ReactNativeJS:V" | grep -E "💓|Background"

# Monitor location updates
adb logcat "*:S" "ReactNativeJS:V" | grep -E "📍|Position"

# Monitor GPS signal
adb logcat "*:S" "ReactNativeJS:V" | grep -E "GPS|Initial"

# Monitor all tracking
adb logcat "*:S" "ReactNativeJS:V" | grep -E "tracking|✅|❌|⚠️"
```

## Performance Improvements

### Battery Optimization
- ✅ Using NETWORK location instead of GPS (much less battery drain)
- ✅ Distance filter of 10m prevents excessive updates
- ✅ Throttling updates to 5 seconds minimum

### Indoor Performance
- ✅ Network location works indoors (cell towers + WiFi)
- ✅ Accepts cached locations up to 15 seconds old
- ✅ Graceful fallback when GPS unavailable

### Service Reliability
- ✅ Heartbeat keeps service alive
- ✅ Initial position fetch prevents "waiting for first update" issue
- ✅ Service persists through app minimization

## Known Limitations

1. **Accuracy**: Network location is less accurate than GPS (10-100m vs 5-20m)
   - ✅ Acceptable for ambulance tracking
   - ✅ Shows actual accuracy in UI

2. **Indoor Performance**: Still dependent on cell tower/WiFi availability
   - ✅ Much better than GPS-only
   - ✅ Warning message shown if no updates after 30s

3. **Battery**: Background tracking will drain battery faster
   - ✅ Acceptable for ambulance drivers on duty
   - ✅ Optimized with network location and throttling

## Troubleshooting

### Issue: "No Signal" in GPS card
**Solution:** 
- Check if location permissions are granted
- Try moving near a window
- Wait 10-15 seconds for first update

### Issue: Service stops after a while
**Solution:**
- Check battery optimization settings
- Disable battery optimization for the app
- Check logs for crash/error messages

### Issue: Poor accuracy
**Solution:**
- This is normal for network location indoors
- Move outdoors for better GPS accuracy
- Accuracy will improve when moving (outdoor/driving)

## Next Steps

Consider implementing:
1. Toggle between GPS and Network location based on environment
2. Geofencing to detect when ambulance enters/exits hospital
3. Route optimization based on real-time traffic
4. Battery level monitoring and warnings

# 🚑 Testing Guide - Ambulance Tracking Background Service

## Quick Testing Steps

### Step 1: Restart the App
Since we updated the notification text, you need to restart the app completely:

```bash
# Method 1: Kill and restart app
adb shell am force-stop com.metahealthapp
adb shell am start -n com.metahealthapp/.MainActivity

# Method 2: From device
# - Go to Recent Apps
# - Swipe up on MetaHealth app to close
# - Tap app icon to reopen
```

### Step 2: Go Online as Driver
1. Open the app
2. Log in as ambulance driver
3. Tap "Go Online" button
4. Grant location permissions if prompted

### Step 3: Verify Notification (MAIN REQUIREMENT)
**Pull down notification tray from top of screen**

You should see:
```
┌─────────────────────────────────────┐
│ Ambulance Tracking                  │ ← Title
│ Background location tracking        │
│ active • Updating every 5s          │ ← Description with "background"
│ ▐▌▐▌▐▌ (Progress bar)               │
└─────────────────────────────────────┘
```

After 30 seconds, it will update to:
```
┌─────────────────────────────────────┐
│ Ambulance Tracking                  │
│ Background task active 0 mins •     │ ← Shows "background task"
│ Location updates every 5s           │
└─────────────────────────────────────┘
```

### Step 4: Test Recent Apps Behavior
1. **Press Home button** (circle icon at bottom)
2. **Wait 10 seconds**
3. **Press Recent Apps** (square icon at bottom)
4. **Verify notification still visible** at top of screen
5. **Open another app** (like Chrome or Settings)
6. **Wait 10 seconds**
7. **Pull down notification tray**
8. **Verify "Ambulance Tracking" still shows**

### Step 5: Verify Location Updates
```bash
# On your computer, run:
adb logcat "*:S" "ReactNativeJS:V" | grep "location emitted"

# You should see every 5-10 seconds:
# ✅ Location emitted via polling
# ✅ Location emitted via polling
# ✅ Location emitted via polling
```

### Step 6: Check Server (Backend)
Your backend server should be receiving:
```javascript
// Every 5 seconds:
socket.on('location-update', (data) => {
  console.log('Driver', data.driverId, 'at', data.latitude, data.longitude);
});
```

## Visual Confirmation

### ✅ Requirement 1: Location Updates in Recent Apps
**Test:**
1. Go online as driver
2. Minimize app (press Home)
3. Open Recent Apps
4. Leave app there for 1 minute
5. Check logs (should show continuous updates)

**Expected:**
```bash
# Every 5 seconds in logs:
📍 Poll position: { lat: '17.444580', lng: '78.385150' }
✅ Location emitted via polling
```

### ✅ Requirement 2: Notification Shows "Ambulance Tracking background task"
**Test:**
1. Go online as driver
2. Wait 30 seconds
3. Pull down notification tray
4. Look at notification text

**Expected:**
- Title: "Ambulance Tracking" ✅
- Description includes: "Background task active" ✅
- Description includes: "Location updates every 5s" ✅

## Common Issues & Solutions

### Issue: Notification doesn't show "Background task"
**Solution:** The notification updates every 30 seconds. Initial notification says:
- "Background location tracking active • Updating every 5s"

After 30 seconds it changes to:
- "Background task active X mins • Location updates every 5s"

**Wait at least 30 seconds** to see "Background task" text!

### Issue: Service not starting
**Solution:**
```bash
# 1. Check if app is running
adb shell "ps -A | grep metahealthapp"

# 2. Check logs
adb logcat -d | grep "Background service started"

# 3. Restart app completely
adb shell am force-stop com.metahealthapp
adb shell am start -n com.metahealthapp/.MainActivity
```

### Issue: No location updates in logs
**Solution:**
```bash
# Check if polling is working
adb logcat | grep "Poll position"

# If you see "Poll error", check:
# 1. Location services enabled?
# 2. Location permissions granted?
# 3. Are you indoors? (Try near window)
```

## Full Test Scenario

### Scenario: Driver's 8-Hour Shift

**Hour 0:00 - Start Shift**
1. Driver opens app
2. Logs in
3. Taps "Go Online"
4. Sees notification: "Ambulance Tracking"

**Hour 0:01 - Accept Trip Request**
1. Notification shows: "Background task active 1 mins"
2. Driver accepts trip
3. App opens map view
4. **Notification stays visible** ✅
5. **Location updates continue** (check logs) ✅

**Hour 0:30 - During Trip**
1. Driver uses GPS navigation (other app)
2. **MetaHealth notification still visible** ✅
3. **Location updates still working** ✅
4. Notification shows: "Background task active 30 mins"

**Hour 4:00 - Lunch Break**
1. Driver presses Home
2. Opens WhatsApp, checks messages
3. Opens Chrome, browses web
4. **MetaHealth notification still there** ✅
5. **Location updates continue** (verify on server) ✅

**Hour 8:00 - End Shift**
1. Driver opens MetaHealth app
2. Taps "Go Offline"
3. **Service stops** ✅
4. **Notification disappears** ✅
5. **Location updates stop** ✅

## Verification Commands

```bash
# 1. Check service is running
adb shell "dumpsys activity services | grep RNBackgroundActionsTask"
# Should show: isForeground=true

# 2. Check notification visible
adb shell "dumpsys notification | grep metahealthapp"
# Should show: NotificationChannel with RN_BACKGROUND_ACTIONS_CHANNEL

# 3. Monitor location updates
adb logcat "*:S" "ReactNativeJS:V" | grep -E "Poll|emitted"
# Should show updates every 5 seconds

# 4. Check heartbeat
adb logcat "*:S" "ReactNativeJS:V" | grep "💓"
# Should show heartbeat every 5 seconds

# 5. Count updates in 1 minute
adb logcat -c && sleep 60 && adb logcat -d | grep "location emitted" | wc -l
# Should show approximately 12 updates (60 seconds ÷ 5 seconds)
```

## Success Criteria Checklist

Before deploying to production, verify:

- [ ] Notification shows "Ambulance Tracking" as title
- [ ] Notification shows "Background task active" in description (after 30s)
- [ ] Notification shows "Location updates every 5s"
- [ ] Notification has red color
- [ ] Notification has progress bar animation
- [ ] Service runs when app minimized
- [ ] Service runs when app in recent apps tray
- [ ] Service runs when other apps are open
- [ ] Location updates every 5 seconds (check logs)
- [ ] Location updates sent to server (check backend)
- [ ] Service stops when driver goes offline
- [ ] Notification disappears when service stops
- [ ] No crash or error logs
- [ ] Battery usage acceptable (~2-3% per hour)

## Demo for Stakeholders

**Show these screens to demonstrate it's working:**

1. **Notification Tray Screenshot**
   - Pull down from top
   - Screenshot showing "Ambulance Tracking" with "Background task active"

2. **Recent Apps Screenshot**
   - Press Recent Apps button
   - Screenshot showing notification still visible

3. **Logs Screenshot**
   ```bash
   adb logcat | grep "location emitted"
   ```
   - Screenshot showing continuous updates every 5s

4. **Server Logs**
   - Show backend receiving location updates
   - Show timestamp every 5 seconds

## Final Notes

### What Changed
1. **Notification Title:** Now says "Ambulance Tracking" (clearer)
2. **Notification Description:** Shows "Background task active" explicitly
3. **Updates Timing:** Shows active time and "Location updates every 5s"

### What Stayed the Same
1. ✅ Location updates every 5 seconds (unchanged)
2. ✅ Works in background (unchanged)
3. ✅ Works in recent apps (unchanged)
4. ✅ Battery efficient (unchanged)

### Production Deployment
When deploying to production:
1. Build release APK
2. Test on multiple devices
3. Monitor server logs for location updates
4. Get driver feedback on notification visibility
5. Monitor battery usage over full shifts

---

## Quick Start (TL;DR)

```bash
# 1. Restart app
adb shell am force-stop com.metahealthapp
adb shell am start -n com.metahealthapp/.MainActivity

# 2. In app: Login → Go Online

# 3. Check notification
# Pull down from top → Should see "Ambulance Tracking"

# 4. Test recent apps
# Press Home → Press Recent Apps → Notification still there ✅

# 5. Verify updates
adb logcat | grep "location emitted"
# Should see updates every 5 seconds ✅
```

**Both requirements are now met! 🎉**

# Automatic Socket-Based Online Status

## Problem
Previously, the driver's online/offline status was controlled by a manual toggle button. This created issues:
- ❌ Driver could be "online" but socket disconnected
- ❌ Driver had to manually toggle online/offline
- ❌ Status didn't reflect actual connection state
- ❌ Confusing user experience

## Solution
The `isOnline` state is now **automatically synchronized** with the socket connection status. When the socket connects, the driver is online; when it disconnects, they're offline.

## How It Works

### Automatic Status Updates
```typescript
useEffect(() => {
  const socket = getSocket();
  
  // Set initial status
  setIsOnline(socket.connected);
  
  // Listen for connection events
  socket.on('connect', () => {
    setIsOnline(true);  // ✅ Automatic
  });
  
  socket.on('disconnect', () => {
    setIsOnline(false); // ✅ Automatic
    setTripRequests([]); // Clear requests
  });
}, []);
```

### Connection Flow
```
App Starts
    ↓
Socket Initializes (initSocket)
    ↓
Attempting Connection...
    ↓
┌─────────────────┐
│  Disconnected   │ ← isOnline = false
└─────────────────┘
    ↓
Connection Established
    ↓
┌─────────────────┐
│   Connected ●   │ ← isOnline = true (automatic)
└─────────────────┘
    ↓
Listening for Trip Requests...
    ↓
Internet Lost/Server Down
    ↓
┌─────────────────┐
│  Disconnected   │ ← isOnline = false (automatic)
└─────────────────┘
    ↓
Reconnection Attempts...
    ↓
Connection Restored
    ↓
┌─────────────────┐
│   Connected ●   │ ← isOnline = true (automatic)
└─────────────────┘
```

## Changes Made

### 1. **Added Socket Connection Monitor**

**New Code:**
```typescript
useEffect(() => {
  const socket = getSocket();
  
  if (!socket) {
    setIsOnline(false);
    return;
  }

  // Set initial status
  setIsOnline(socket.connected);

  // Listen for connection events
  const handleConnect = () => {
    console.log('✅ Socket connected - Driver is now ONLINE');
    setIsOnline(true);
  };

  const handleDisconnect = (reason: string) => {
    console.log('❌ Socket disconnected - Driver is now OFFLINE');
    setIsOnline(false);
    setTripRequests([]); // Clear requests when offline
  };

  const handleConnectError = (error: Error) => {
    console.log('⚠️ Socket connection error:', error.message);
    setIsOnline(false);
  };

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectError);

  // Cleanup
  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleConnectError);
  };
}, []);
```

### 2. **Changed Status Button to Informational**

**Before:**
```typescript
const handleToggleOnline = () => {
  setIsOnline(!isOnline); // ❌ Manual control
  Alert.alert('Status', isOnline ? 'Now offline' : 'Now online');
};
```

**After:**
```typescript
const handleToggleOnline = () => {
  // ✅ Just shows info, doesn't change state
  Alert.alert(
    'Connection Status',
    isOnline 
      ? 'You are connected to the server and receiving trip requests automatically.' 
      : 'You are disconnected. Please check your internet connection.'
  );
};
```

### 3. **Updated Button Text**

**Before:**
```tsx
{isOnline ? 'Online' : 'Offline'}
```

**After:**
```tsx
{isOnline ? 'Connected' : 'Disconnected'}
```

More accurate representation of socket connection state.

### 4. **Updated Empty State Message**

**Before:**
```tsx
'Go online to receive trip requests'
```

**After:**
```tsx
'Connecting to server...'
```

Reflects automatic connection rather than manual action.

## Socket Events Monitored

| Event | Action | Result |
|-------|--------|--------|
| `connect` | Socket successfully connects | `isOnline = true` |
| `disconnect` | Socket disconnects | `isOnline = false`, clear requests |
| `connect_error` | Connection error occurs | `isOnline = false` |
| Initial load | Check `socket.connected` | Set initial status |

## Behavior

### When Socket Connects:
1. ✅ `isOnline` automatically set to `true`
2. ✅ Status button shows "Connected" with green dot
3. ✅ Trip request listener starts automatically
4. ✅ Initial data request sent
5. ✅ Real-time updates begin

### When Socket Disconnects:
1. ✅ `isOnline` automatically set to `false`
2. ✅ Status button shows "Disconnected" with grey dot
3. ✅ Trip requests cleared from display
4. ✅ Listener cleanup happens automatically
5. ✅ Socket auto-reconnects (configured in socket.ts)

### When Socket Reconnects:
1. ✅ `isOnline` automatically set to `true` again
2. ✅ Fresh trip requests loaded automatically
3. ✅ Everything resumes seamlessly

## UI Indicators

### Connected State:
```
┌─────────────────────┐
│ Driver Dashboard    │
│ ● Connected         │ ← Green dot, white background
└─────────────────────┘
```

### Disconnected State:
```
┌─────────────────────┐
│ Driver Dashboard    │
│ ○ Disconnected      │ ← Grey dot, semi-transparent
└─────────────────────┘
```

## Advantages

### ✅ Accurate Status
- Status always reflects actual connection
- No mismatch between UI and reality
- Driver knows exactly when they're receiving requests

### ✅ Automatic Behavior
- No manual toggle needed
- Driver doesn't need to do anything
- Status updates in real-time

### ✅ Better Reliability
- Clear when connection is lost
- Automatic reconnection
- Requests cleared when offline (prevents stale data)

### ✅ Better UX
- Driver can focus on trips, not connection status
- Visual feedback matches actual state
- Clear messaging about connection issues

### ✅ Debugging
- Console logs show connection state changes
- Easy to diagnose connection issues
- Clear event flow

## Console Logs

```
🔌 Initial socket status: Connected
✅ Socket connected - Driver is now ONLINE
🚀 Starting Socket.IO real-time listener for user: 123
📤 Requesting driver booking requests for user: 123
📨 Received driver booking requests: 3

... (connection lost) ...

❌ Socket disconnected - Driver is now OFFLINE. Reason: transport close
🛑 Stopping Socket.IO real-time listener

... (reconnecting) ...

✅ Socket connected - Driver is now ONLINE
🚀 Starting Socket.IO real-time listener for user: 123
📤 Requesting driver booking requests for user: 123
```

## Testing

### Test Connection Status:
1. **Open Dashboard**: Status should show "Connected" with green dot
2. **Turn Off WiFi**: Status should change to "Disconnected" with grey dot
3. **Tap Status Button**: Should show connection info alert
4. **Turn On WiFi**: Status should auto-change back to "Connected"

### Test Trip Requests:
1. **Connected**: Should receive trip requests
2. **Disconnected**: Should show empty state with "Connecting..."
3. **Reconnected**: Should automatically load trip requests

### Test Auto-Reconnection:
1. Start app (Connected)
2. Disable internet for 10 seconds
3. Status changes to Disconnected
4. Enable internet
5. Status automatically changes back to Connected
6. Trip requests reload automatically

## Backend Integration

The socket server should:
1. Accept connections from driver app
2. Emit `driver-booking-requests` when:
   - Driver first connects
   - New trip request created
   - Trip status changes
3. Handle `get-driver-booking-requests` event
4. Properly handle disconnections/reconnections

## Configuration

Socket reconnection is configured in `socket.ts`:
```typescript
{
  reconnection: true,
  autoConnect: true,
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 5000,
}
```

This ensures:
- Automatic reconnection on disconnect
- Unlimited retry attempts
- Max 5 seconds between retries

## Notes

- Socket connection is initialized in `useEffect` on app start
- Status updates happen automatically via event listeners
- Button is now informational only (shows status info)
- Trip requests are cleared on disconnect to prevent stale data
- Reconnection happens automatically without user intervention

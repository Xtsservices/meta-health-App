import Sound from 'react-native-sound';
import { Platform } from 'react-native';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

let notificationSound: Sound | null = null;
let emergencySound: Sound | null = null;

/**
 * Initialize the notification sounds
 * Call this once when the app starts or when needed
 */
export function initNotificationSound(): void {
  // For Android, the file should be in android/app/src/main/res/raw/
  // For iOS, the file should be in the app bundle
  const basePath = Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE;

  // Load normal notification sound
  notificationSound = new Sound('notification.mp3', basePath, (error) => {
    if (error) {
      console.log('Failed to load notification sound:', error);
      return;
    }
    console.log('✅ Normal notification sound loaded successfully');
  });

  // Load emergency sound
  emergencySound = new Sound('ambulance_emrg.mp3', basePath, (error) => {
    if (error) {
      console.log('Failed to load emergency sound:', error);
      return;
    }
    console.log('✅ Emergency notification sound loaded successfully');
  });
}

/**
 * Play the notification sound based on booking type
 * @param bookingType - 'SOS' for emergency sound, 'NORMAL' for regular sound
 */
export function playNotificationSound(bookingType: 'SOS' | 'NORMAL' = 'NORMAL'): void {
  const soundToPlay = bookingType === 'SOS' ? emergencySound : notificationSound;
  
  if (!soundToPlay) {
    console.log('⚠️ Notification sound not initialized, initializing now...');
    initNotificationSound();
    // Wait a bit for sound to load then try playing
    setTimeout(() => {
      playNotificationSound(bookingType);
    }, 500);
    return;
  }

  // Reset to beginning if already playing
  soundToPlay.stop(() => {
    soundToPlay?.play((success) => {
      if (success) {
        console.log(`🔔 ${bookingType === 'SOS' ? 'Emergency' : 'Normal'} notification sound played successfully`);
      } else {
        console.log('⚠️ Notification sound playback failed');
      }
    });
  });
}

/**
 * Stop the currently playing notification sound
 */
export function stopNotificationSound(): void {
  if (notificationSound) {
    notificationSound.stop();
    console.log('🔇 Normal notification sound stopped');
  }
  if (emergencySound) {
    emergencySound.stop();
    console.log('🔇 Emergency notification sound stopped');
  }
}

/**
 * Release the sound resources when no longer needed
 */
export function releaseNotificationSound(): void {
  if (notificationSound) {
    notificationSound.release();
    notificationSound = null;
    console.log('🔇 Normal notification sound released');
  }
  if (emergencySound) {
    emergencySound.release();
    emergencySound = null;
    console.log('🔇 Emergency notification sound released');
  }
}

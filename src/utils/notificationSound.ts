import Sound from 'react-native-sound';
import { Platform } from 'react-native';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

let notificationSound: Sound | null = null;

/**
 * Initialize the notification sound
 * Call this once when the app starts or when needed
 */
export function initNotificationSound(): void {
  // For Android, the file should be in android/app/src/main/res/raw/notification.mp3
  // For iOS, the file should be in the app bundle
  const soundFile = Platform.OS === 'android' ? 'notification.mp3' : 'notification.mp3';
  const basePath = Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE;

  notificationSound = new Sound(soundFile, basePath, (error) => {
    if (error) {
      console.log('Failed to load notification sound:', error);
      return;
    }
    console.log('✅ Notification sound loaded successfully');
  });
}

/**
 * Play the notification sound
 * Used when new trip requests arrive
 */
export function playNotificationSound(): void {
  if (!notificationSound) {
    console.log('⚠️ Notification sound not initialized, initializing now...');
    initNotificationSound();
    // Wait a bit for sound to load then try playing
    setTimeout(() => {
      playNotificationSound();
    }, 500);
    return;
  }

  // Reset to beginning if already playing
  notificationSound.stop(() => {
    notificationSound?.play((success) => {
      if (success) {
        console.log('🔔 Notification sound played successfully');
      } else {
        console.log('⚠️ Notification sound playback failed');
      }
    });
  });
}

/**
 * Release the sound resource when no longer needed
 */
export function releaseNotificationSound(): void {
  if (notificationSound) {
    notificationSound.release();
    notificationSound = null;
    console.log('🔇 Notification sound released');
  }
}

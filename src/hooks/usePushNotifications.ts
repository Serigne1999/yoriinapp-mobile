import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import client from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export function usePushNotifications(onNotificationTap?: (data: any) => void) {
  const notifListener    = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    registerAndSendToken();

    // Notification reçue en foreground
    notifListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Tap sur notification (background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      onNotificationTap?.(data);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerAndSendToken() {
  if (!Device.isDevice) return; // émulateur : pas de push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.MAX,
      sound:      'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await client.post('/devices', {
      fcm_token:   token,
      platform:    Platform.OS,
      app_version: '1.0.0',
    });
  } catch (e) {
    // silencieux — le push n'est pas critique
  }
}

import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { useAuthStore } from './src/store/authStore';
import { navigationRef } from './src/navigation/navigationRef';

function AppContent() {
  const { token } = useAuthStore();

  usePushNotifications((data) => {
    if (!token || !navigationRef.isReady()) return;
    if (data?.screen === 'WhatsApp') {
      (navigationRef as any).navigate('App', { screen: 'WhatsApp' });
    }
  });

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}

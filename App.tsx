import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  console.log('[boot] App rendu');
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>YoriinApp OK</Text>
    </View>
  );
}

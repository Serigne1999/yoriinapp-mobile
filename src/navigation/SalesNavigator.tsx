import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SalesScreen     from '../screens/sales/SalesScreen';
import SaleDetailScreen from '../screens/sales/SaleDetailScreen';

export type SalesStackParamList = {
  SalesList:  undefined;
  SaleDetail: { saleId: number };
};

const Stack = createNativeStackNavigator<SalesStackParamList>();

export default function SalesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SalesList"  component={SalesScreen} />
      <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
    </Stack.Navigator>
  );
}

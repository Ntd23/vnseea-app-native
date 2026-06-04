// Description: Configures the root stack navigator from the centralized route registry.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './constants/routes';
import { createStackRoutes } from './routeRegistry';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();
const STACK_ROUTES = createStackRoutes(MainTabNavigator);

function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={ROUTES.LOGIN}
        screenOptions={{ headerShown: false }}
      >
        {STACK_ROUTES.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export type { RootStackParamList } from './types';
export default AppNavigator;

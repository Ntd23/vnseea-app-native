// Description: Configures the root stack navigator and app-level screen routes.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './constants/routes';

// Auth screens
import LoginScreen from '../auth/presentation/screens/LoginScreen';
import RegisterScreen from '../auth/presentation/screens/RegisterScreen';
import ForgotPasswordScreen from '../auth/presentation/screens/ForgotPasswordScreen';

// Main app shell
import MainTabNavigator from './MainTabNavigator';

// Pages screens
import CreatePageScreen from '../pages/presentation/screens/CreatePageScreen';

export type RootStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.MAIN_TABS]: undefined;
  [ROUTES.CREATE_PAGE]: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.LOGIN}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
        <Stack.Screen
          name={ROUTES.FORGOT_PASSWORD}
          component={ForgotPasswordScreen}
        />
        <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabNavigator} />
        <Stack.Screen name={ROUTES.CREATE_PAGE} component={CreatePageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;

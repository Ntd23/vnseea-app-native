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

// Wallet screens
import EarningsScreen from '../wallet/presentation/screens/EarningsScreen';
import AffiliatesScreen from '../wallet/presentation/screens/AffiliatesScreen';
import InviteFriendsScreen from '../wallet/presentation/screens/InviteFriendsScreen';
import MyPointsScreen from '../wallet/presentation/screens/MyPointsScreen';

// Withdrawal screens
import WithdrawalScreen from '../withdrawal/presentation/screens/WithdrawalScreen';

export type RootStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.MAIN_TABS]: undefined;
  [ROUTES.CREATE_PAGE]: undefined;
  [ROUTES.EARNINGS]: undefined;
  [ROUTES.AFFILIATES]: undefined;
  [ROUTES.INVITE_FRIENDS]: undefined;
  [ROUTES.MY_POINTS]: undefined;
  [ROUTES.WITHDRAWAL]: undefined;
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
        <Stack.Screen name={ROUTES.EARNINGS} component={EarningsScreen} />
        <Stack.Screen name={ROUTES.AFFILIATES} component={AffiliatesScreen} />
        <Stack.Screen name={ROUTES.INVITE_FRIENDS} component={InviteFriendsScreen} />
        <Stack.Screen name={ROUTES.MY_POINTS} component={MyPointsScreen} />
        <Stack.Screen name={ROUTES.WITHDRAWAL} component={WithdrawalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;

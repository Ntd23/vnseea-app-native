// Description: Provides the shared create-actions bottom sheet used by app headers.
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  CalendarDays,
  CircleDot,
  FilePlus2,
  ImagePlus,
  Images,
  PackagePlus,
  Megaphone,
  PlaySquare,
  Users,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackRouteName } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

type CreateActionKey =
  | 'post'
  | 'story'
  | 'album'
  | 'ad'
  | 'event'
  | 'poll'
  | 'product'
  | 'page'
  | 'group'
  | 'reel';

type CreateAction = {
  key: CreateActionKey;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  iconColor: string;
  iconBg: string;
  route?: RootStackRouteName;
};

const actions: CreateAction[] = [
  { key: 'post', Icon: ImagePlus, iconColor: '#1d4ed8', iconBg: '#eff6ff', route: ROUTES.CREATE_POST },
  { key: 'story', Icon: CircleDot, iconColor: '#7c3aed', iconBg: '#faf5ff', route: ROUTES.CREATE_STORY },
  { key: 'album', Icon: Images, iconColor: '#10b981', iconBg: '#ecfdf5', route: ROUTES.CREATE_ALBUM },
  { key: 'ad', Icon: Megaphone, iconColor: '#f59e0b', iconBg: '#fffbeb', route: ROUTES.CREATE_AD },
  { key: 'event', Icon: CalendarDays, iconColor: '#ef4444', iconBg: '#fef2f2', route: ROUTES.CREATE_EVENT },
  { key: 'poll', Icon: BarChart3, iconColor: '#0284c7', iconBg: '#f0f9ff', route: ROUTES.CREATE_POLL },
  { key: 'product', Icon: PackagePlus, iconColor: '#8b5cf6', iconBg: '#f5f3ff', route: ROUTES.CREATE_PRODUCT },
  { key: 'page', Icon: FilePlus2, iconColor: '#0ea5e9', iconBg: '#f0f9ff', route: ROUTES.CREATE_PAGE },
  { key: 'group', Icon: Users, iconColor: '#ec4899', iconBg: '#fdf2f8', route: ROUTES.CREATE_GROUP },
  { key: 'reel', Icon: PlaySquare, iconColor: '#9333ea', iconBg: '#faf5ff', route: ROUTES.CREATE_REEL },
];

const SHEET_COPY = {
  vi: {
    title: 'Tạo mới',
    actions: {
      post: { label: 'Tạo bài đăng', subtitle: 'Chia sẻ với mọi người' },
      story: { label: 'Tạo tin', subtitle: 'Chia sẻ khoảnh khắc 24 giờ' },
      album: { label: 'Tạo album ảnh', subtitle: 'Tạo album từ ảnh của bạn' },
      ad: { label: 'Tạo quảng cáo', subtitle: 'Quảng bá sản phẩm, dịch vụ' },
      event: { label: 'Tạo sự kiện', subtitle: 'Lên lịch và mời mọi người' },
      poll: { label: 'Tạo cuộc thăm dò', subtitle: 'Đặt câu hỏi và khảo sát ý kiến' },
      product: { label: 'Tạo sản phẩm', subtitle: 'Giới thiệu sản phẩm' },
      page: { label: 'Tạo trang mới', subtitle: 'Bắt đầu trang của bạn' },
      group: { label: 'Tạo nhóm mới', subtitle: 'Kết nối với nhiều người hơn' },
      reel: { label: 'Tạo video', subtitle: 'Chia sẻ video với mọi người' },
    },
  },
  en: {
    title: 'Create New',
    actions: {
      post: { label: 'Create post', subtitle: 'Share with everyone' },
      story: { label: 'Create story', subtitle: 'Share 24h moments' },
      album: { label: 'Create photo album', subtitle: 'Create album from your photos' },
      ad: { label: 'Create advertisement', subtitle: 'Promote products, services' },
      event: { label: 'Create event', subtitle: 'Schedule and invite people' },
      poll: { label: 'Create poll', subtitle: 'Ask questions and conduct surveys' },
      product: { label: 'Create product', subtitle: 'Introduce products' },
      page: { label: 'Create new page', subtitle: 'Start your page' },
      group: { label: 'Create new group', subtitle: 'Connect with more people' },
      reel: { label: 'Create video', subtitle: 'Share video with everyone' },
    },
  },
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  activeOpacity?: number;
  className?: string;
}

function ScaleButton({
  children,
  onPress,
  style,
  activeOpacity = 0.75,
  className,
  ...props
}: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  return (
    <AnimatedTouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[style, { transform: [{ scale }] }]}
      className={className}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

type CreateActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: RootStackRouteName) => void;
};

function CreateActionSheet({
  visible,
  onClose,
  onNavigate,
}: CreateActionSheetProps) {
  const language = useAppLanguage();
  const copy = SHEET_COPY[language] || SHEET_COPY.vi;

  // Animation values for cascading list items
  const anims = useRef(actions.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      anims.forEach(anim => anim.setValue(0));
      const animations = anims.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 110,
          friction: 12,
          useNativeDriver: true,
        })
      );
      Animated.stagger(40, animations).start();
    }
  }, [visible, anims]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}} // Absorbs touch events to prevent backdrop tap dismissal
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 34 : 24,
            maxHeight: '85%',
          }}
        >
          {/* Drag Handle Indicator */}
          <View
            style={{
              width: 38,
              height: 4,
              backgroundColor: '#cbd5e1',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: 16,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              {copy.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={{
                position: 'absolute',
                right: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#334155" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* List of actions */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {actions.map(({ key, Icon, iconColor, iconBg, route }, index) => {
              const anim = anims[index];
              const opacity = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              });

              const label = copy.actions[key].label;
              const subtitle = copy.actions[key].subtitle;

              return (
                <Animated.View
                  key={key}
                  style={{
                    opacity,
                    transform: [{ translateY }],
                  }}
                >
                  <ScaleButton
                    onPress={() => {
                      onClose();
                      if (route) {
                        onNavigate(route);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                  >
                    {/* Circle Icon Container */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: iconBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16,
                      }}
                    >
                      <Icon size={20} color={iconColor} strokeWidth={2} />
                    </View>

                    {/* Labels */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15.5,
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      >
                        {label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12.5,
                          color: '#64748b',
                          marginTop: 3,
                        }}
                      >
                        {subtitle}
                      </Text>
                    </View>

                    {/* Right Chevron */}
                    <ChevronRight size={18} color="#cbd5e1" strokeWidth={2.5} />
                  </ScaleButton>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default CreateActionSheet;

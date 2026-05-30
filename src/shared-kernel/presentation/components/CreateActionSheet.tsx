// Description: Provides the shared create-actions bottom sheet used by app headers.
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import {
  BarChart3,
  CalendarDays,
  CircleDot,
  FilePlus2,
  ImagePlus,
  Images,
  PackagePlus,
  Pencil,
  PlaySquare,
  Users,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackRouteName } from '../../../navigation/types';

type CreateAction = {
  label: string;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  route?: RootStackRouteName;
};

const actions: CreateAction[] = [
  { label: 'Tạo bài đăng', Icon: ImagePlus, route: ROUTES.CREATE_POST },
  { label: 'Tạo tin', Icon: CircleDot, route: ROUTES.CREATE_STORY },
  { label: 'Tạo album ảnh', Icon: Images, route: ROUTES.CREATE_ALBUM },
  { label: 'Tạo quảng cáo', Icon: Pencil, route: ROUTES.CREATE_AD },
  { label: 'Tạo sự kiện', Icon: CalendarDays, route: ROUTES.CREATE_EVENT },
  { label: 'Tạo cuộc thăm dò', Icon: BarChart3, route: ROUTES.CREATE_POLL },
  {
    label: 'Tạo sản phẩm',
    Icon: PackagePlus,
    route: ROUTES.CREATE_PRODUCT,
  },
  { label: 'Tạo trang mới', Icon: FilePlus2, route: ROUTES.CREATE_PAGE },
  { label: 'Tạo nhóm mới', Icon: Users, route: ROUTES.CREATE_GROUP },
  { label: 'Tạo video', Icon: PlaySquare, route: ROUTES.CREATE_REEL },
];

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/45" onPress={onClose}>
        <View className="mt-auto rounded-t-[28px] bg-white px-6 pb-8 pt-4">
          <View className="mb-4 flex-row items-center justify-end">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          {actions.map(({ label, Icon, route }) => (
            <TouchableOpacity
              key={label}
              className="min-h-[52px] flex-row items-center"
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                if (route) {
                  onNavigate(route);
                }
              }}
            >
              <Icon size={22} color="#0000ff" strokeWidth={1.8} />
              <Text className="ml-4 text-[20px] text-[#2f2f35]">{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export default CreateActionSheet;

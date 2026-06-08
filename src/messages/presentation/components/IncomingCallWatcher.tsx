// Description: Displays foreground incoming LiveKit call controls for direct and group Messages calls.
import React from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useIncomingLiveKitCalls } from '../../application/view-models/useIncomingLiveKitCalls';

function IncomingCallWatcher() {
  const {
    incomingCall,
    incomingGroupCall,
    acceptIncomingCall,
    acceptIncomingGroupCall,
    declineIncomingCall,
    declineIncomingGroup,
  } = useIncomingLiveKitCalls();

  const visibleCall = incomingGroupCall ?? incomingCall;
  const isGroupCall = Boolean(incomingGroupCall);
  const title = incomingGroupCall
    ? incomingGroupCall.group.name
    : incomingCall?.peer.name || 'Người dùng';
  const avatar = incomingGroupCall
    ? incomingGroupCall.group.avatar
    : incomingCall?.peer.avatar || '';
  const callType = incomingGroupCall?.callType ?? incomingCall?.callType;
  const accept = incomingGroupCall
    ? acceptIncomingGroupCall
    : acceptIncomingCall;
  const decline = incomingGroupCall
    ? declineIncomingGroup
    : declineIncomingCall;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(visibleCall)}
      onRequestClose={decline}
    >
      <View className="flex-1 justify-end bg-black/45 px-5 pb-8">
        <View className="rounded-[28px] bg-slate-950 px-6 py-7 shadow-2xl">
          <View className="items-center">
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                className="h-24 w-24 rounded-full bg-slate-800"
              />
            ) : (
              <View className="h-24 w-24 rounded-full bg-slate-800" />
            )}
            <Text className="mt-4 text-center text-2xl font-bold text-white">
              {title}
            </Text>
            <Text className="mt-2 text-center text-base text-slate-300">
              {isGroupCall
                ? callType === 'audio'
                  ? 'Cuộc gọi nhóm thoại đến'
                  : 'Cuộc gọi nhóm video đến'
                : callType === 'audio'
                ? 'Cuộc gọi thoại đến'
                : 'Cuộc gọi video đến'}
            </Text>
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-10">
            <TouchableOpacity
              activeOpacity={0.85}
              className="h-16 w-16 items-center justify-center rounded-full bg-red-600"
              onPress={decline}
            >
              <PhoneOff size={28} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500"
              onPress={accept}
            >
              <Phone size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default IncomingCallWatcher;

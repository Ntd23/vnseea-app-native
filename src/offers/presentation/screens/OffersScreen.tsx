import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { ArrowLeft, Tag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OffersScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-[#f3f4f6]" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      
      {/* Header */}
      <View className="h-14 flex-row items-center justify-between px-4 bg-[#0000ff] z-50 shadow-sm relative">
        <TouchableOpacity 
          className="p-2 -ml-2 rounded-full active:bg-white/10 z-10" 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        
        <View className="absolute left-0 w-full h-full flex-row items-center justify-center" pointerEvents="none">
          <Text className="text-white font-semibold text-lg">
            Ưu đãi
          </Text>
        </View>
        
        <View className="w-10" />
      </View>

      {/* Offers List */}
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4" showsVerticalScrollIndicator={false}>
        
        {/* Offer Card 1 */}
        <TouchableOpacity className="bg-white rounded-xl shadow-sm overflow-hidden flex-row p-3 gap-4 active:scale-[0.98]">
          <View className="w-28 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbFTq7qjkqTLurSceaqelPYTLOAC4tOSImrSY7CisPrQgwa2YY2wapVfCTi7zpLL4mp24X2wOSrmzBZiMPcrPmVKWkJ2lFhbKk6p8axQqNOHnVk-S9GbOcKrHDsDuwZSryYPltT5SXyg9iGzmjAu9jjPMCZPp4nFs822On9PoMcDGtpYpyWhLJ5tLm7cHGplpojrqCjk7FXIwH7K_NA53ebdR7duqVlaunlcgiEl72r4tkfptqzYZ-tl9c7ZAK9BidV1NScHvHROFr' }}
              className="w-full h-full"
              style={{ resizeMode: 'cover' }}
            />
            <View className="absolute top-0 left-0 bg-red-500 rounded-br-lg shadow-sm px-2 py-1">
              <Text className="text-white text-[10px] font-bold">-10%</Text>
            </View>
          </View>
          <View className="flex-1 flex-col justify-between py-1">
            <View>
              <Text className="text-base font-bold text-gray-900 leading-tight" numberOfLines={2}>Ưu đãi 10% Quà Sinh Nhật Đặc Biệt</Text>
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>Bộ quà tặng thú bông Stitch và socola cao cấp dành cho người thương.</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="bg-red-50 px-2 py-1 rounded-md">
                <Text className="text-xs font-medium text-red-600">Hết hạn: 17/04/2026</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Offer Card 2 */}
        <TouchableOpacity className="bg-white rounded-xl shadow-sm overflow-hidden flex-row p-3 gap-4 active:scale-[0.98]">
          <View className="w-28 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD24Ticc_Cm3M_BaRn0FoLAU71GL98_D_U-V1oyzJ8gbsjJ_UXnkO80jpGkC2zERnuKZpG6M8O6P9Ok9pF_IT-4-TzWGND8Y2XO9qu0dXtnq8San-X3Xmul8MT6L_9sUKQlRLI6APNE6etiPWcnGs8tlMue-sE16yRrl1rU-L0Z9rx6yzCzNsMRat6wt59asU1jtkr29aQ2qUv7WEO49rznPESB1vhdatJvQCnn22SppNFxDXaAR8AmGVC1q9ZIIulKOlQfKLjPQJUF' }}
              className="w-full h-full"
              style={{ resizeMode: 'cover' }}
            />
            <View className="absolute top-0 left-0 bg-red-500 rounded-br-lg shadow-sm px-2 py-1">
              <Text className="text-white text-[10px] font-bold">-10%</Text>
            </View>
          </View>
          <View className="flex-1 flex-col justify-between py-1">
            <View>
              <Text className="text-base font-bold text-gray-900 leading-tight" numberOfLines={2}>Giảm 10% Combo Quà Kỷ Niệm</Text>
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>Bóng bay Happy Birthday kèm gấu bông xinh xắn.</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="bg-red-50 px-2 py-1 rounded-md">
                <Text className="text-xs font-medium text-red-600">Hết hạn: 17/04/2026</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Offer Card 3 */}
        <TouchableOpacity className="bg-white rounded-xl shadow-sm overflow-hidden flex-row p-3 gap-4 active:scale-[0.98]">
          <View className="w-28 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe_HfhICUcsnv67eZlhklaeSRcJKKR08Qjqw_Lo_Niw6DPNZN_6628Dw0ZQHSkN09sQ5t2aaVYnyD7U9up1NQbFQHVFiKusn1ylsGSmSD7OgQXZdz4KBrtIF_Zqnpa9z8q1mZmXafdPB61hGvvev0sH-MOkRmygvOG4exxubY8sewsSt4CmY5DtLE-sSfIDjF3ZTlynYXpvVDXZxvEJjbQpEz3GwnDRvcbO6229m_Y39fxEJ_JwYelpM_6HsSuXZv5FOMeMqan8mhA' }}
              className="w-full h-full"
              style={{ resizeMode: 'cover' }}
            />
            <View className="absolute top-0 left-0 bg-red-500 rounded-br-lg shadow-sm px-2 py-1">
              <Text className="text-white text-[10px] font-bold">-10%</Text>
            </View>
          </View>
          <View className="flex-1 flex-col justify-between py-1">
            <View>
              <Text className="text-base font-bold text-gray-900 leading-tight" numberOfLines={2}>Giảm giá 10% Đồ chơi xếp hình LEGO</Text>
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>Thế giới đồ chơi sáng tạo cho bé phát triển trí tuệ.</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="bg-red-50 px-2 py-1 rounded-md">
                <Text className="text-xs font-medium text-red-600">Hết hạn: 29/12/2025</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Offer Card 4 */}
        <TouchableOpacity className="bg-white rounded-xl shadow-sm overflow-hidden flex-row p-3 gap-4 active:scale-[0.98] mb-10">
          <View className="w-28 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border border-gray-100 bg-green-500 flex items-center justify-center">
            <Tag color="#ffffff" size={48} strokeWidth={1.5} />
            <View className="absolute top-0 left-0 bg-red-500 rounded-br-lg shadow-sm px-2 py-1">
              <Text className="text-white text-[10px] font-bold">-1%</Text>
            </View>
          </View>
          <View className="flex-1 flex-col justify-between py-1">
            <View>
              <Text className="text-base font-bold text-gray-900 leading-tight" numberOfLines={2}>Giảm 1% Phụ kiện văn phòng</Text>
              <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>Bìa hồ sơ, tài liệu lưu trữ chất lượng cao.</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="bg-red-50 px-2 py-1 rounded-md">
                <Text className="text-xs font-medium text-red-600">Hết hạn: 28/08/2025</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

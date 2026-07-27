// Description: Presents post actions and the multi-step post reporting flow.

import { APP_BRAND_COLOR } from '../theme/appColors';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Flag,
  Trash2,
  X,
} from 'lucide-react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { ReportPostInput } from '../../../feed/domain/repositories/FeedRepository';
import { useSafeBottomPadding } from '../layout/useSafeBottomLayout';

interface PostMenuActionSheetProps {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
  canDelete?: boolean;
  onSave: (postId: string) => Promise<void>;
  onHide: (postId: string) => Promise<void> | void;
  onDelete: (postId: string) => Promise<void>;
  onReport: (postId: string, input: ReportPostInput) => Promise<void>;
  onReportHide?: (postId: string) => Promise<void> | void;
  onReportSuccessClose?: () => void;
}

interface ReportReasonOption {
  code: string;
  label: string;
}

interface ReportCategory extends ReportReasonOption {
  reasons: ReportReasonOption[];
}

type ActionId = 'save' | 'hide' | 'delete' | 'report';
type ReportStage = 'categories' | 'reasons' | 'confirm';

const POST_REPORT_CATEGORIES: ReportCategory[] = [
  {
    code: 'minor_safety',
    label: 'Vấn đề liên quan đến người dưới 18 tuổi',
    reasons: [
      {
        code: 'minor_intimate_threat',
        label: 'Đe dọa chia sẻ hình ảnh khỏa thân của trẻ em',
      },
      {
        code: 'minor_sexual_exploitation',
        label: 'Có vẻ giống hành vi bóc lột tình dục',
      },
      {
        code: 'minor_intimate_image',
        label: 'Chia sẻ ảnh khỏa thân của trẻ em',
      },
      { code: 'minor_bullying', label: 'Bắt nạt hoặc quấy rối' },
      { code: 'minor_physical_abuse', label: 'Ngược đãi thể chất' },
    ],
  },
  {
    code: 'harassment_abuse',
    label: 'Bắt nạt, quấy rối hoặc lăng mạ/lạm dụng/ngược đãi',
    reasons: [
      { code: 'harassment', label: 'Quấy rối hoặc đe dọa' },
      { code: 'bullying', label: 'Bắt nạt hoặc hạ nhục người khác' },
      { code: 'privacy_abuse', label: 'Chia sẻ thông tin riêng tư' },
      { code: 'physical_abuse', label: 'Lạm dụng hoặc ngược đãi thể chất' },
    ],
  },
  {
    code: 'self_harm',
    label: 'Tự tử hoặc tự hại bản thân',
    reasons: [
      { code: 'suicide', label: 'Nội dung liên quan đến tự tử' },
      { code: 'self_injury', label: 'Tự gây thương tích' },
      { code: 'eating_disorder', label: 'Rối loạn ăn uống' },
    ],
  },
  {
    code: 'violence_hate',
    label: 'Nội dung mang tính bạo lực, thù ghét hoặc gây phiền toái',
    reasons: [
      { code: 'violence_threat', label: 'Bạo lực hoặc đe dọa bạo lực' },
      { code: 'hate_speech', label: 'Ngôn từ gây thù ghét' },
      { code: 'dangerous_org', label: 'Tổ chức hoặc cá nhân nguy hiểm' },
      { code: 'graphic_content', label: 'Hình ảnh phản cảm hoặc ghê rợn' },
    ],
  },
  {
    code: 'restricted_goods',
    label: 'Bán hoặc quảng bá mặt hàng bị hạn chế',
    reasons: [
      { code: 'drugs', label: 'Ma túy hoặc chất bị kiểm soát' },
      { code: 'weapons', label: 'Vũ khí' },
      { code: 'endangered_animals', label: 'Động vật có nguy cơ tuyệt chủng' },
      { code: 'other_restricted_goods', label: 'Mặt hàng bị hạn chế khác' },
    ],
  },
  {
    code: 'adult_content',
    label: 'Nội dung người lớn',
    reasons: [
      { code: 'nudity', label: 'Ảnh khỏa thân' },
      { code: 'sexual_activity', label: 'Hoạt động tình dục' },
      { code: 'sexual_solicitation', label: 'Gạ gẫm tình dục' },
      { code: 'sexual_language', label: 'Ngôn từ khiêu dâm' },
    ],
  },
  {
    code: 'misinformation_fraud',
    label: 'Thông tin sai sự thật, lừa đảo hoặc gian lận',
    reasons: [
      { code: 'scam', label: 'Lừa đảo hoặc gian lận' },
      { code: 'impersonation', label: 'Mạo danh người khác' },
      { code: 'false_information', label: 'Thông tin sai sự thật' },
      { code: 'spam', label: 'Spam' },
    ],
  },
  {
    code: 'intellectual_property',
    label: 'Quyền sở hữu trí tuệ',
    reasons: [
      { code: 'copyright', label: 'Vi phạm bản quyền' },
      { code: 'trademark', label: 'Vi phạm nhãn hiệu' },
      { code: 'counterfeit', label: 'Hàng giả hoặc hàng nhái' },
    ],
  },
  {
    code: 'unwanted_content',
    label: 'Tôi không muốn xem nội dung này',
    reasons: [
      { code: 'irrelevant', label: 'Nội dung không liên quan đến tôi' },
      { code: 'repetitive', label: 'Tôi thấy nội dung này quá nhiều lần' },
      { code: 'other_unwanted', label: 'Lý do khác' },
    ],
  },
];

export function PostMenuActionSheet({
  visible,
  onClose,
  post,
  canDelete = false,
  onSave,
  onHide,
  onDelete,
  onReport,
  onReportHide,
  onReportSuccessClose,
}: PostMenuActionSheetProps) {
  const [loadingId, setLoadingId] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideConfirmationVisible, setHideConfirmationVisible] = useState(false);
  const [reportSuccessVisible, setReportSuccessVisible] = useState(false);
  const [reportStage, setReportStage] = useState<ReportStage | null>(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<
    string | null
  >(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState<string | null>(
    null,
  );
  const safeBottomPadding = useSafeBottomPadding(24);
  const { height: windowHeight } = useWindowDimensions();

  const selectedCategory = useMemo(
    () =>
      POST_REPORT_CATEGORIES.find(
        category => category.code === selectedCategoryCode,
      ) ?? null,
    [selectedCategoryCode],
  );
  const selectedReason = useMemo(
    () =>
      selectedCategory?.reasons.find(
        reason => reason.code === selectedReasonCode,
      ) ?? null,
    [selectedCategory, selectedReasonCode],
  );

  const resetReportFlow = () => {
    setReportStage(null);
    setSelectedCategoryCode(null);
    setSelectedReasonCode(null);
  };

  useEffect(() => {
    if (visible) return;
    setLoadingId(null);
    setError(null);
    setHideConfirmationVisible(false);
    setReportSuccessVisible(false);
    resetReportFlow();
  }, [visible]);

  const runAction = async (
    actionId: Exclude<ActionId, 'report'>,
    action: (postId: string) => Promise<void> | void,
  ) => {
    if (!post) return;
    setLoadingId(actionId);
    setError(null);
    try {
      await action(post.id);
      setHideConfirmationVisible(false);
      onClose();
    } catch (err) {
      setHideConfirmationVisible(false);
      setError(
        err instanceof Error ? err.message : 'Không thực hiện được thao tác.',
      );
    } finally {
      setLoadingId(null);
    }
  };

  const submitReport = async () => {
    if (!post || !selectedCategory || !selectedReason) return;
    setLoadingId('report');
    setError(null);
    try {
      await onReport(post.id, {
        categoryCode: selectedCategory.code,
        categoryLabel: selectedCategory.label,
        reasonCode: selectedReason.code,
        reasonLabel: selectedReason.label,
      });
      await (onReportHide ?? onHide)(post.id);
      resetReportFlow();
      setReportSuccessVisible(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không gửi được báo cáo. Vui lòng thử lại.',
      );
    } finally {
      setLoadingId(null);
    }
  };

  if (!visible || !post) return null;

  const isBusy = loadingId !== null;
  const canRenderDelete = canDelete && post.permissions?.canDelete === true;

  const handleReportBack = () => {
    if (isBusy) return;
    setError(null);
    if (reportStage === 'confirm') {
      setReportStage('reasons');
      return;
    }
    if (reportStage === 'reasons') {
      setSelectedReasonCode(null);
      setReportStage('categories');
      return;
    }
    resetReportFlow();
  };

  const handleRequestClose = () => {
    if (isBusy) return;
    if (reportSuccessVisible) {
      setReportSuccessVisible(false);
      onClose();
      onReportSuccessClose?.();
      return;
    }
    if (hideConfirmationVisible) {
      setHideConfirmationVisible(false);
      return;
    }
    if (reportStage) {
      handleReportBack();
      return;
    }
    onClose();
  };

  const reportSheetHeight = Math.min(windowHeight * 0.92, 860);

  const handleReportSuccessClose = () => {
    if (isBusy) return;
    setReportSuccessVisible(false);
    onClose();
    onReportSuccessClose?.();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={handleRequestClose}>
      <TouchableOpacity
        activeOpacity={1}
        disabled={isBusy}
        onPress={reportSuccessVisible ? handleReportSuccessClose : onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {reportSuccessVisible ? null : reportStage ? (
        <View
          testID="post-report-sheet"
          className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-[28px] bg-slate-100 shadow-lg"
          style={{ height: reportSheetHeight }}
        >
          <View className="items-center pb-2 pt-3">
            <View className="h-1.5 w-24 rounded-full bg-slate-400" />
          </View>

          <ReportHeader
            title={reportStage === 'categories' ? 'Báo cáo' : undefined}
            disabled={isBusy}
            onBack={handleReportBack}
          />

          {reportStage === 'categories' ? (
            <ReportCategoryStep
              categories={POST_REPORT_CATEGORIES}
              bottomPadding={safeBottomPadding}
              onSelect={category => {
                setSelectedCategoryCode(category.code);
                setSelectedReasonCode(null);
                setError(null);
                setReportStage('reasons');
              }}
            />
          ) : null}

          {reportStage === 'reasons' && selectedCategory ? (
            <ReportReasonStep
              category={selectedCategory}
              bottomPadding={safeBottomPadding}
              onSelect={reason => {
                setSelectedReasonCode(reason.code);
                setError(null);
                setReportStage('confirm');
              }}
            />
          ) : null}

          {reportStage === 'confirm' && selectedCategory && selectedReason ? (
            <ReportConfirmStep
              category={selectedCategory}
              reason={selectedReason}
              error={error}
              loading={loadingId === 'report'}
              bottomPadding={safeBottomPadding}
              onSubmit={submitReport}
            />
          ) : null}
        </View>
      ) : (
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pt-4 shadow-lg"
          style={{ paddingBottom: safeBottomPadding }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Tùy chọn bài viết
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text className="mb-3 text-center text-sm text-red-500">
              {error}
            </Text>
          ) : null}

          <MenuAction
            label="Lưu bài viết"
            loading={loadingId === 'save'}
            disabled={isBusy}
            icon={<Bookmark size={20} color={APP_BRAND_COLOR} />}
            iconClassName="bg-brand-soft"
            onPress={() => runAction('save', onSave)}
          />
          <Divider />
          <MenuAction
            label="Ẩn bài viết"
            loading={loadingId === 'hide'}
            disabled={isBusy}
            icon={<EyeOff size={20} color="#64748B" />}
            iconClassName="bg-slate-100"
            onPress={() => {
              setError(null);
              setHideConfirmationVisible(true);
            }}
          />
          {canRenderDelete ? (
            <>
              <Divider />
              <MenuAction
                label="Xóa bài viết"
                loading={loadingId === 'delete'}
                disabled={isBusy}
                icon={<Trash2 size={20} color="#EF4444" />}
                iconClassName="bg-red-100"
                textClassName="text-red-600"
                onPress={() => runAction('delete', onDelete)}
              />
            </>
          ) : null}
          <Divider />
          <MenuAction
            label="Báo cáo bài viết"
            loading={false}
            disabled={isBusy}
            icon={<Flag size={20} color="#EF4444" />}
            iconClassName="bg-red-100"
            onPress={() => {
              setError(null);
              setReportStage('categories');
            }}
          />
        </View>
      )}

      {reportSuccessVisible ? (
        <ReportSuccessPopup onClose={handleReportSuccessClose} />
      ) : null}

      {hideConfirmationVisible && !reportStage && !reportSuccessVisible ? (
        <View className="absolute inset-0 items-center justify-center px-6">
          <TouchableOpacity
            activeOpacity={1}
            disabled={isBusy}
            onPress={() => setHideConfirmationVisible(false)}
            className="absolute inset-0 bg-black/55"
          />
          <View className="w-full rounded-[24px] bg-white px-5 pb-5 pt-6 shadow-lg">
            <View className="self-center rounded-full bg-slate-100 p-4">
              <EyeOff size={28} color="#64748B" />
            </View>
            <Text className="mt-4 text-center text-xl font-extrabold text-slate-900">
              Ẩn bài viết?
            </Text>
            <Text className="mt-2 text-center text-sm font-medium leading-5 text-slate-500">
              Bài viết này sẽ không xuất hiện lại trên thiết bị của bạn.
            </Text>
            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isBusy}
                onPress={() => setHideConfirmationVisible(false)}
                className="h-12 flex-1 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-[15px] font-extrabold text-slate-700">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isBusy}
                onPress={() => runAction('hide', onHide)}
                className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-brand"
              >
                {loadingId === 'hide' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[15px] font-extrabold text-white">
                    OK
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function ReportSuccessPopup({ onClose }: { onClose: () => void }) {
  return (
    <View
      testID="post-report-success-popup"
      className="absolute inset-0 items-center justify-center px-6"
    >
      <View className="w-full max-w-[360px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <View className="items-center px-6 pb-5 pt-7">
          <View className="h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-emerald-100 bg-emerald-50">
            <CheckCircle2 size={43} color="#16A34A" strokeWidth={2.5} />
          </View>

          <Text className="mt-5 text-center text-[24px] font-extrabold text-slate-950">
            Đã gửi báo cáo
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-6 text-slate-500">
            Cảm ơn bạn đã giúp VNSEEA an toàn hơn. Chúng tôi sẽ xem xét bài viết
            này.
          </Text>

          <View className="mt-5 w-full flex-row items-center rounded-2xl bg-slate-100 px-4 py-3.5">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <EyeOff size={21} color={APP_BRAND_COLOR} strokeWidth={2.3} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-slate-900">
                Bài viết đã được ẩn
              </Text>
              <Text className="mt-0.5 text-[13px] leading-5 text-slate-500">
                Nội dung này sẽ không xuất hiện lại với bạn.
              </Text>
            </View>
          </View>
        </View>

        <View className="border-t border-slate-100 px-5 pb-5 pt-4">
          <TouchableOpacity
            testID="post-report-success-close"
            activeOpacity={0.85}
            onPress={onClose}
            className="h-14 items-center justify-center rounded-2xl bg-brand"
          >
            <Text className="text-[16px] font-extrabold text-white">
              Đã hiểu
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ReportHeader({
  title,
  disabled,
  onBack,
}: {
  title?: string;
  disabled: boolean;
  onBack: () => void;
}) {
  return (
    <View className="h-16 flex-row items-center border-b border-slate-200 bg-white px-4">
      <TouchableOpacity
        accessibilityLabel="Quay lại"
        disabled={disabled}
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        <ChevronLeft size={34} color="#111827" strokeWidth={2} />
      </TouchableOpacity>
      {title ? (
        <Text className="absolute left-16 right-16 text-center text-[22px] font-bold text-slate-950">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

function ReportCategoryStep({
  categories,
  bottomPadding,
  onSelect,
}: {
  categories: ReportCategory[];
  bottomPadding: number;
  onSelect: (category: ReportCategory) => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 20 }}
    >
      <Text className="text-[22px] font-semibold leading-7 text-slate-950">
        Tại sao bạn báo cáo bài viết này?
      </Text>
      <Text className="mt-1 text-[16px] leading-6 text-slate-500">
        Nếu bạn nhận thấy ai đó đang gặp nguy hiểm, đừng chần chừ mà hãy tìm
        ngay sự giúp đỡ trước khi gửi báo cáo.
      </Text>

      <View className="mt-4 overflow-hidden rounded-2xl bg-white px-4">
        {categories.map((category, index) => (
          <ReportOptionRow
            key={category.code}
            label={category.label}
            showDivider={index < categories.length - 1}
            onPress={() => onSelect(category)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ReportReasonStep({
  category,
  bottomPadding,
  onSelect,
}: {
  category: ReportCategory;
  bottomPadding: number;
  onSelect: (reason: ReportReasonOption) => void;
}) {
  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
    >
      <Text className="px-5 pb-5 pt-3 text-[22px] font-medium leading-8 text-slate-950">
        Câu nào mô tả đúng nhất về vấn đề này?
      </Text>
      <View className="border-t border-slate-200 px-5">
        {category.reasons.map((reason, index) => (
          <ReportOptionRow
            key={reason.code}
            label={reason.label}
            showDivider={index < category.reasons.length - 1}
            onPress={() => onSelect(reason)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ReportConfirmStep({
  category,
  reason,
  error,
  loading,
  bottomPadding,
  onSubmit,
}: {
  category: ReportCategory;
  reason: ReportReasonOption;
  error: string | null;
  loading: boolean;
  bottomPadding: number;
  onSubmit: () => void;
}) {
  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      >
        <Text className="pt-3 text-[22px] font-medium text-slate-950">
          Bạn sắp gửi báo cáo
        </Text>
        <Text className="mt-1 text-[16px] leading-6 text-slate-500">
          Chúng tôi chỉ gỡ nội dung vi phạm Tiêu chuẩn cộng đồng của VNSEEA.
        </Text>

        <Text className="mt-8 text-[22px] font-medium text-slate-950">
          Chi tiết báo cáo
        </Text>

        <View className="mt-7 gap-7">
          <View>
            <Text className="text-[15px] text-slate-500">
              Tại sao bạn báo cáo bài viết này?
            </Text>
            <Text className="mt-1 text-[20px] leading-7 text-slate-950">
              {category.label}
            </Text>
          </View>
          <View>
            <Text className="text-[15px] text-slate-500">
              Câu nào mô tả đúng nhất về vấn đề này?
            </Text>
            <Text className="mt-1 text-[20px] leading-7 text-slate-950">
              {reason.label}
            </Text>
          </View>
        </View>

        {error ? (
          <Text className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-slate-200 bg-white px-4 pt-3"
        style={{ paddingBottom: bottomPadding }}
      >
        <TouchableOpacity
          testID="post-report-submit"
          activeOpacity={0.85}
          disabled={loading}
          onPress={onSubmit}
          className="h-14 flex-row items-center justify-center rounded-xl bg-brand"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-[18px] font-bold text-white">Gửi</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReportOptionRow({
  label,
  showDivider,
  onPress,
}: {
  label: string;
  showDivider: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      className={`min-h-[68px] flex-row items-center py-3 ${
        showDivider ? 'border-b border-slate-100' : ''
      }`}
    >
      <Text className="mr-3 flex-1 text-[17px] leading-6 text-slate-950">
        {label}
      </Text>
      <ChevronRight size={31} color="#6B7280" strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}

function MenuAction({
  label,
  loading,
  disabled,
  icon,
  iconClassName,
  textClassName = 'text-gray-900',
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  iconClassName: string;
  textClassName?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center py-4"
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={APP_BRAND_COLOR}
          className="mr-3"
        />
      ) : (
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${iconClassName}`}
        >
          {icon}
        </View>
      )}
      <Text className={`text-lg font-medium ${textClassName}`}>{label}</Text>
    </TouchableOpacity>
  );
}

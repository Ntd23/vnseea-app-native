// Description: Centralized i18n copy for the pages bounded context —
// specifically the new Page Detail menu (3-dot → Report / Settings)
// and Page Settings (CTA and Public Signals). Mirrors the
// `Record<AppLanguage, Record<string, string>>` pattern used by
// authCopy and notificationCopy so consumers just call
// `usePagesCopy()` and get the strings for the active language.

import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export const PAGES_COPY: Record<AppLanguage, Record<string, string>> = {
  vi: {
    // Page detail menu (3-dot)
    pageMenuTitle: 'Tùy chọn trang',
    pageMenuReport: 'Báo cáo trang',
    pageMenuSettings: 'Cài đặt trang',
    pageMenuReportDesc: 'Gửi báo cáo trang này đến quản trị viên',
    pageMenuSettingsDesc: 'Quản lý CTA và tín hiệu công khai',

    // Page settings — general
    settingsTitle: 'Cài đặt trang',
    settingsBack: 'Quay lại',
    settingsSave: 'Lưu thay đổi',
    settingsSaved: 'Đã lưu cài đặt',
    settingsReset: 'Hoàn tác',
    settingsEditProfile: 'Chỉnh sửa thông tin trang',
    settingsPageName: 'Tên trang',
    settingsPageCategory: 'Danh mục',
    settingsPageCategoryFallback: 'Chưa phân loại',

    // Sections
    sectionBasicInfo: 'Thông tin cơ bản',
    sectionCta: 'Lời kêu gọi hành động (CTA)',
    sectionPublicSignals: 'Tín hiệu công khai',
    sectionCtaDescription: 'Chọn hành động chính khi người dùng bấm vào nút CTA trên trang của bạn.',
    sectionPublicSignalsDescription: 'Bật/tắt các thông tin công khai hiển thị trên trang.',

    // CTA options
    ctaNone: 'Không có',
    ctaNoneDesc: 'Không hiển thị nút CTA',
    ctaMessage: 'Nhắn tin',
    ctaMessageDesc: 'Mở cuộc trò chuyện với trang',
    ctaFollow: 'Theo dõi',
    ctaFollowDesc: 'Theo dõi trang để nhận cập nhật',
    ctaViewCatalog: 'Xem danh mục',
    ctaViewCatalogDesc: 'Mở danh sách sản phẩm/dịch vụ',
    ctaBookNow: 'Đặt lịch ngay',
    ctaBookNowDesc: 'Đặt lịch hẹn hoặc dịch vụ',
    ctaCallNow: 'Gọi ngay',
    ctaCallNowDesc: 'Gọi điện cho trang qua số điện thoại',

    // CTA inputs
    ctaUrlLabel: 'Liên kết (URL)',
    ctaUrlPlaceholder: 'https://example.com',
    ctaUrlHint: 'Liên kết sẽ mở khi người dùng bấm nút CTA',
    ctaPhoneLabel: 'Số điện thoại',
    ctaPhonePlaceholder: '+84 901 234 567',

    // Public signal labels
    signalMessageButton: 'Bật nút nhắn tin',
    signalMessageButtonDesc: 'Cho phép người dùng gửi tin nhắn cho trang',
    signalFollowerCount: 'Hiển thị số người theo dõi',
    signalFollowerCountDesc: 'Hiện tổng số người đang theo dõi trang',
    signalLikeCount: 'Hiển thị số lượt thích',
    signalLikeCountDesc: 'Hiện tổng số lượt thích trang',
    signalPublicWebsite: 'Hiển thị website công khai',
    signalPublicWebsiteDesc: 'Hiện liên kết website của trang (nếu có)',
    signalSuggestFanpages: 'Gợi ý các trang liên quan',
    signalSuggestFanpagesDesc: 'Hiện các trang cùng danh mục ở cuối trang',

    // Validation + errors
    saveError: 'Không thể lưu cài đặt',
    invalidUrl: 'Liên kết không hợp lệ',
    invalidPhone: 'Số điện thoại không hợp lệ',
    urlRequired: 'Vui lòng nhập liên kết',
    phoneRequired: 'Vui lòng nhập số điện thoại',

    // Toast
    toastSaved: 'Đã lưu thay đổi',
  },
  en: {
    // Page detail menu (3-dot)
    pageMenuTitle: 'Page options',
    pageMenuReport: 'Report page',
    pageMenuSettings: 'Page settings',
    pageMenuReportDesc: 'Send this page to administrators for review',
    pageMenuSettingsDesc: 'Manage CTA and public signals',

    // Page settings — general
    settingsTitle: 'Page settings',
    settingsBack: 'Back',
    settingsSave: 'Save changes',
    settingsSaved: 'Settings saved',
    settingsReset: 'Discard changes',
    settingsEditProfile: 'Edit page info',
    settingsPageName: 'Page name',
    settingsPageCategory: 'Category',
    settingsPageCategoryFallback: 'Uncategorised',

    // Sections
    sectionBasicInfo: 'Basic info',
    sectionCta: 'Call to action (CTA)',
    sectionPublicSignals: 'Public signals',
    sectionCtaDescription: 'Pick the primary action when visitors tap the CTA button on your page.',
    sectionPublicSignalsDescription: 'Toggle which public information is shown on your page.',

    // CTA options
    ctaNone: 'None',
    ctaNoneDesc: 'Do not show a CTA button',
    ctaMessage: 'Message',
    ctaMessageDesc: 'Open a chat with the page',
    ctaFollow: 'Follow',
    ctaFollowDesc: 'Follow the page for updates',
    ctaViewCatalog: 'View catalog',
    ctaViewCatalogDesc: 'Open the list of products / services',
    ctaBookNow: 'Book now',
    ctaBookNowDesc: 'Book an appointment or service',
    ctaCallNow: 'Call now',
    ctaCallNowDesc: 'Call the page via phone number',

    // CTA inputs
    ctaUrlLabel: 'Link (URL)',
    ctaUrlPlaceholder: 'https://example.com',
    ctaUrlHint: 'This link opens when visitors tap the CTA button',
    ctaPhoneLabel: 'Phone number',
    ctaPhonePlaceholder: '+1 555 123 4567',

    // Public signal labels
    signalMessageButton: 'Enable message button',
    signalMessageButtonDesc: 'Let visitors send a message to the page',
    signalFollowerCount: 'Show follower count',
    signalFollowerCountDesc: 'Show the total number of followers',
    signalLikeCount: 'Show like count',
    signalLikeCountDesc: 'Show the total number of likes',
    signalPublicWebsite: 'Show public website',
    signalPublicWebsiteDesc: 'Show the page website link (if set)',
    signalSuggestFanpages: 'Suggest related fanpages',
    signalSuggestFanpagesDesc: 'Show pages in the same category at the bottom',

    // Validation + errors
    saveError: 'Failed to save settings',
    invalidUrl: 'Invalid link',
    invalidPhone: 'Invalid phone number',
    urlRequired: 'Please enter a link',
    phoneRequired: 'Please enter a phone number',

    // Toast
    toastSaved: 'Changes saved',
  },
};

export function usePagesCopy(): Record<string, string> {
  const language = useAppLanguage();
  return PAGES_COPY[language];
}

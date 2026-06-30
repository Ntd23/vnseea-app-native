// Description: Centralized i18n copy + helpers for the Create Movie screen.
//
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by `storiesCopy.ts`. The screen reads `CREATE_MOVIE_COPY[language]`
// via `useAppLanguage` to keep the composer consistent with the rest of the
// movies domain.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type {
  MovieCountryKey,
  MovieGenreKey,
  MovieQuality,
} from '../../domain/types/movies.types';

export type GenreOptionMap = Record<MovieGenreKey, string>;
export type QualityOptionMap = Record<MovieQuality, string>;
export type CountryOptionMap = Record<MovieCountryKey, string>;

export interface CreateMovieCopy {
  headerTitle: string;
  submitButton: string;
  submittingButton: string;
  discardConfirmTitle: string;
  discardConfirmMessage: string;
  discardConfirmAction: string;
  discardCancel: string;

  pickCover: string;
  replaceCover: string;
  coverSelectedLabel: string;
  coverRequired: string;

  fieldNameLabel: string;
  fieldNamePlaceholder: string;
  fieldDescriptionLabel: string;
  fieldDescriptionPlaceholder: string;
  fieldGenreLabel: string;
  fieldGenrePlaceholder: string;
  fieldCountryLabel: string;
  fieldCountryPlaceholder: string;
  fieldStarsLabel: string;
  fieldStarsPlaceholder: string;
  fieldProducerLabel: string;
  fieldProducerPlaceholder: string;
  fieldReleaseLabel: string;
  fieldReleasePlaceholder: string;
  fieldDurationLabel: string;
  fieldDurationPlaceholder: string;
  fieldQualityLabel: string;
  fieldQualityPlaceholder: string;
  fieldRatingLabel: string;
  fieldRatingPlaceholder: string;
  fieldSourceLabel: string;
  fieldSourcePlaceholder: string;

  sourceHintYouTube: string;
  sourceHintVimeo: string;
  sourceHintUrl: string;
  sourceHintEmpty: string;

  validationNameMin: string;
  validationDescriptionMin: string;
  validationGenreRequired: string;
  validationCountryRequired: string;
  validationQualityRequired: string;
  validationReleaseRequired: string;
  validationReleaseRange: (min: number, max: number) => string;
  validationDurationRange: (min: number, max: number) => string;
  validationRatingRange: (min: number, max: number) => string;
  validationSourceRequired: string;
  validationSourceInvalid: string;
  validationCoverTooLarge: (maxW: number, maxH: number) => string;
  validationCoverRequired: string;

  successToast: string;
  errorTitle: string;
  errorRequired: string;
  errorNetwork: string;

  // Localized option maps for pickers.
  genreOptions: GenreOptionMap;
  qualityOptions: QualityOptionMap;
  countryOptions: CountryOptionMap;

  descriptionCounter: (current: number, max: number) => string;
}

const VI_GENRE_OPTIONS: GenreOptionMap = {
  action: 'Hành động',
  comedy: 'Hài',
  drama: 'Kịch tính',
  horror: 'Kinh dị',
  mythological: 'Thần thoại',
  war: 'Chiến tranh',
  adventure: 'Phiêu lưu',
  family: 'Gia đình',
  sport: 'Thể thao',
  animation: 'Hoạt hình',
  crime: 'Tội phạm',
  fantasy: 'Giả tưởng',
  musical: 'Nhạc kịch',
  romance: 'Tình cảm',
  thriller: 'Giật gân',
  history: 'Lịch sử',
  documentary: 'Tài liệu',
  tvshow: 'TV Show',
};

const EN_GENRE_OPTIONS: GenreOptionMap = {
  action: 'Action',
  comedy: 'Comedy',
  drama: 'Drama',
  horror: 'Horror',
  mythological: 'Mythological',
  war: 'War',
  adventure: 'Adventure',
  family: 'Family',
  sport: 'Sport',
  animation: 'Animation',
  crime: 'Crime',
  fantasy: 'Fantasy',
  musical: 'Musical',
  romance: 'Romance',
  thriller: 'Thriller',
  history: 'History',
  documentary: 'Documentary',
  tvshow: 'TV Show',
};

const VI_QUALITY_OPTIONS: QualityOptionMap = {
  cam: 'CAMRip',
  ts: 'TS',
  vsh: 'VHSRip',
  wp: 'WP',
  scr: 'SCR',
  dvds: 'DVDScr',
  ldr: 'LDRip',
  tv: 'TVRip',
  sat: 'SATRip',
  dvb: 'DVBRip',
  dtv: 'DTVRip',
  dvd: 'DVD',
  hdr: 'HDRip',
  'web-dl': 'WEB-DL',
  'hd-tv': 'HD-TV',
  hd: 'HD DVD',
};

const EN_QUALITY_OPTIONS: QualityOptionMap = {
  cam: 'CAMRip',
  ts: 'TS',
  vsh: 'VHSRip',
  wp: 'WP',
  scr: 'SCR (VHSScr)',
  dvds: 'DVDScr',
  ldr: 'LDRip',
  tv: 'TVRip',
  sat: 'SATRip',
  dvb: 'DVBRip',
  dtv: 'DTVRip',
  dvd: 'DVD',
  hdr: 'HDRip',
  'web-dl': 'WEB-DL',
  'hd-tv': 'HD-TV',
  hd: 'HD DVD',
};

const VI_COUNTRY_OPTIONS: CountryOptionMap = {
  'united-states': 'Hoa Kỳ',
  china: 'Trung Quốc',
  india: 'Ấn Độ',
  iran: 'Iran',
  japan: 'Nhật Bản',
  turkey: 'Thổ Nhĩ Kỳ',
  russia: 'Nga',
  france: 'Pháp',
  'united-kingdom': 'Anh',
  vietnam: 'Việt Nam',
};

const EN_COUNTRY_OPTIONS: CountryOptionMap = {
  'united-states': 'United States',
  china: 'China',
  india: 'India',
  iran: 'Iran',
  japan: 'Japan',
  turkey: 'Turkey',
  russia: 'Russia',
  france: 'France',
  'united-kingdom': 'United Kingdom',
  vietnam: 'Vietnam',
};

export const CREATE_MOVIE_COPY: Record<AppLanguage, CreateMovieCopy> = {
  vi: {
    headerTitle: 'Tạo phim',
    submitButton: 'Đăng phim',
    submittingButton: 'Đang đăng...',
    discardConfirmTitle: 'Bỏ phim này?',
    discardConfirmMessage: 'Bạn sẽ mất toàn bộ thông tin đã nhập.',
    discardConfirmAction: 'Bỏ',
    discardCancel: 'Tiếp tục chỉnh sửa',

    pickCover: 'Chọn ảnh bìa',
    replaceCover: 'Thay ảnh bìa',
    coverSelectedLabel: 'Đã chọn ảnh bìa',
    coverRequired: 'Vui lòng chọn ảnh bìa',

    fieldNameLabel: 'Tên phim',
    fieldNamePlaceholder: 'Nhập tên phim',
    fieldDescriptionLabel: 'Mô tả',
    fieldDescriptionPlaceholder: 'Mô tả nội dung phim (tối thiểu 32 ký tự)',
    fieldGenreLabel: 'Thể loại',
    fieldGenrePlaceholder: 'Chọn thể loại',
    fieldCountryLabel: 'Quốc gia',
    fieldCountryPlaceholder: 'Chọn quốc gia',
    fieldStarsLabel: 'Diễn viên',
    fieldStarsPlaceholder: 'Tên các diễn viên, ngăn cách dấu phẩy',
    fieldProducerLabel: 'Đạo diễn / Nhà sản xuất',
    fieldProducerPlaceholder: 'Nhập tên đạo diễn hoặc nhà sản xuất',
    fieldReleaseLabel: 'Năm phát hành',
    fieldReleasePlaceholder: 'VD: 2024',
    fieldDurationLabel: 'Thời lượng (phút)',
    fieldDurationPlaceholder: 'VD: 120',
    fieldQualityLabel: 'Chất lượng',
    fieldQualityPlaceholder: 'Chọn chất lượng',
    fieldRatingLabel: 'Đánh giá (1 - 10)',
    fieldRatingPlaceholder: 'VD: 8',
    fieldSourceLabel: 'Nguồn video',
    fieldSourcePlaceholder: 'YouTube, Vimeo hoặc URL trực tiếp',

    sourceHintYouTube: 'Phát hiện: YouTube',
    sourceHintVimeo: 'Phát hiện: Vimeo',
    sourceHintUrl: 'Phát hiện: URL trực tiếp',
    sourceHintEmpty: 'Hỗ trợ YouTube, Vimeo hoặc URL trực tiếp',

    validationNameMin: 'Tên phim phải có ít nhất 3 ký tự',
    validationDescriptionMin: 'Mô tả phải có ít nhất 32 ký tự',
    validationGenreRequired: 'Vui lòng chọn thể loại',
    validationCountryRequired: 'Vui lòng chọn quốc gia',
    validationQualityRequired: 'Vui lòng chọn chất lượng',
    validationReleaseRequired: 'Vui lòng nhập năm phát hành',
    validationReleaseRange: (min, max) =>
      `Năm phát hành phải nằm trong khoảng ${min} - ${max}`,
    validationDurationRange: (min, max) =>
      `Thời lượng phải nằm trong khoảng ${min} - ${max} phút`,
    validationRatingRange: (min, max) =>
      `Đánh giá phải nằm trong khoảng ${min} - ${max}`,
    validationSourceRequired: 'Vui lòng nhập nguồn video',
    validationSourceInvalid: 'URL không hợp lệ (chỉ hỗ trợ YouTube, Vimeo, hoặc URL trực tiếp)',
    validationCoverTooLarge: (maxW, maxH) =>
      `Kích thước ảnh bìa không được quá ${maxW}×${maxH}`,
    validationCoverRequired: 'Vui lòng chọn ảnh bìa',

    successToast: 'Đã đăng phim',
    errorTitle: 'Không thể đăng phim',
    errorRequired: 'Vui lòng kiểm tra các trường được đánh dấu',
    errorNetwork: 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.',

    genreOptions: VI_GENRE_OPTIONS,
    qualityOptions: VI_QUALITY_OPTIONS,
    countryOptions: VI_COUNTRY_OPTIONS,

    descriptionCounter: (current, max) => `${current}/${max}`,
  },
  en: {
    headerTitle: 'Create movie',
    submitButton: 'Publish',
    submittingButton: 'Publishing...',
    discardConfirmTitle: 'Discard movie?',
    discardConfirmMessage: 'You will lose all the info you have entered.',
    discardConfirmAction: 'Discard',
    discardCancel: 'Keep editing',

    pickCover: 'Pick cover',
    replaceCover: 'Replace cover',
    coverSelectedLabel: 'Cover selected',
    coverRequired: 'Please pick a cover image',

    fieldNameLabel: 'Movie name',
    fieldNamePlaceholder: 'Enter movie name',
    fieldDescriptionLabel: 'Description',
    fieldDescriptionPlaceholder: 'Describe the movie (at least 32 characters)',
    fieldGenreLabel: 'Genre',
    fieldGenrePlaceholder: 'Choose a genre',
    fieldCountryLabel: 'Country',
    fieldCountryPlaceholder: 'Choose a country',
    fieldStarsLabel: 'Stars',
    fieldStarsPlaceholder: 'Actor names, separated by commas',
    fieldProducerLabel: 'Producer / Director',
    fieldProducerPlaceholder: 'Enter producer or director name',
    fieldReleaseLabel: 'Release year',
    fieldReleasePlaceholder: 'e.g. 2024',
    fieldDurationLabel: 'Duration (minutes)',
    fieldDurationPlaceholder: 'e.g. 120',
    fieldQualityLabel: 'Quality',
    fieldQualityPlaceholder: 'Choose a quality',
    fieldRatingLabel: 'Rating (1 - 10)',
    fieldRatingPlaceholder: 'e.g. 8',
    fieldSourceLabel: 'Video source',
    fieldSourcePlaceholder: 'YouTube, Vimeo, or direct URL',

    sourceHintYouTube: 'Detected: YouTube',
    sourceHintVimeo: 'Detected: Vimeo',
    sourceHintUrl: 'Detected: Direct URL',
    sourceHintEmpty: 'Supports YouTube, Vimeo, or direct URL',

    validationNameMin: 'Name must be at least 3 characters',
    validationDescriptionMin: 'Description must be at least 32 characters',
    validationGenreRequired: 'Please choose a genre',
    validationCountryRequired: 'Please choose a country',
    validationQualityRequired: 'Please choose a quality',
    validationReleaseRequired: 'Please enter the release year',
    validationReleaseRange: (min, max) =>
      `Release year must be between ${min} and ${max}`,
    validationDurationRange: (min, max) =>
      `Duration must be between ${min} and ${max} minutes`,
    validationRatingRange: (min, max) =>
      `Rating must be between ${min} and ${max}`,
    validationSourceRequired: 'Please enter a video source',
    validationSourceInvalid: 'Invalid URL (only YouTube, Vimeo, or direct URLs are supported)',
    validationCoverTooLarge: (maxW, maxH) =>
      `Cover size must not exceed ${maxW}×${maxH}`,
    validationCoverRequired: 'Please pick a cover image',

    successToast: 'Movie published',
    errorTitle: 'Could not publish movie',
    errorRequired: 'Please check the highlighted fields',
    errorNetwork: 'Network error. Please check your connection and try again.',

    genreOptions: EN_GENRE_OPTIONS,
    qualityOptions: EN_QUALITY_OPTIONS,
    countryOptions: EN_COUNTRY_OPTIONS,

    descriptionCounter: (current, max) => `${current}/${max}`,
  },
};

export type CreateMovieCopyKey = keyof CreateMovieCopy;

export function getCreateMovieCopy(language: AppLanguage): CreateMovieCopy {
  return CREATE_MOVIE_COPY[language];
}

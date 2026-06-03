// Jobs domain types
// English description: Defines job item types from the WoWonder job API.

export interface JobsItem {
  id: string | number;
  title: string;
  description: string;
  location: string;
  lat?: string;
  lng?: string;
  minimum?: number;
  maximum?: number;
  salary_date?: string;
  job_type: string;
  category: string;
  currency?: string;
  image: string;
  image_type?: string;
  page_id: string | number;
  user_id: string | number;
  time: number;
  post_id?: string | number;
  page?: {
    page_id: string | number;
    page_title: string;
    page_name: string;
    page_description: string;
    avatar: string;
    cover: string;
    user_id: string | number;
    is_page_onwer?: boolean;
  };
}

export interface JobsListResponse {
  api_status: number | string;
  data?: JobsItem[];
  message?: string;
}

export type JobType = 'full_time' | 'part_time' | 'internship' | 'volunteer' | 'contract';

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  volunteer: 'Volunteer',
  contract: 'Contract',
};

export const JOB_TYPE_VIETNAMESE: Record<JobType, string> = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  internship: 'Thực tập',
  volunteer: 'Tình nguyện',
  contract: 'Hợp đồng',
};

// Job categories from WoWonder backend
export const JOB_CATEGORIES: Record<string, string> = {
  '1': 'Kinh doanh',
  '2': 'Chăm sóc khách hàng',
  '3': 'Kế toán',
  '4': 'Nhân sự',
  '5': 'Marketing',
  '6': 'Công nghệ thông tin',
  '7': 'Thiết kế',
  '8': 'Kỹ thuật',
  '9': 'Giáo dục',
  '10': 'Y tế',
  '11': 'Luật',
  '12': 'Khoa học',
  '13': 'Hành chính',
  '14': 'Khác',
};

export const SALARY_DATE_OPTIONS: Record<string, string> = {
  per_hour: 'Theo giờ',
  per_day: 'Theo ngày',
  per_week: 'Theo tuần',
  per_month: 'Theo tháng',
  per_year: 'Theo năm',
};

// Create Job Payload
export interface CreateJobPayload {
  jobTitle: string;
  description: string;
  location: string;
  jobType: JobType;
  category: string;
  pageId: string | number;
  lat?: string;
  lng?: string;
  minimum?: number;
  maximum?: number;
  salaryDate?: string;
  currency?: string;
  imageType?: 'cover' | 'upload';
  thumbnail?: {
    uri: string;
    name: string;
    type: string;
  };
}

// Create Job Response
export interface CreateJobResponse {
  api_status: number | string;
  data?: JobsItem;
  message?: string;
  errors?: Array<{ error_text?: string }>;
}
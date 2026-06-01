// Events domain types
// Port từ: client/src/events/domain/types/

export interface EventsItem {
  id: string | number;
  name?: string;
  event_name?: string;
  description?: string;
  event_description?: string;
  location?: string;
  event_location?: string;
  start_date?: string;
  event_start_date?: string;
  start_time?: string;
  event_start_time?: string;
  end_date?: string;
  event_end_date?: string;
  end_time?: string;
  event_end_time?: string;
  cover?: string;
  event_cover?: string;
  going_count?: string | number;
  interested_count?: string | number;
  invited_count?: string | number;
  is_going?: boolean;
  is_interested?: boolean;
  is_owner?: boolean;  // True if current user created this event
  time?: string | number;
  url?: string;        // Event page URL
  user_data?: {
    user_id: string | number;
    name?: string;
    full_name?: string;
    avatar?: string;
    username?: string;
  };
}

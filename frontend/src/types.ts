export type Language = "zh" | "en";

export interface PublicRecord {
  created_at: string;
  updated_at: string;
  status: string;
  is_public: true;
}

export interface Setting extends PublicRecord {
  setting_id: string;
  event_code: string;
  setting_key: string;
  value_zh: string;
  value_en: string;
  data_type: string;
}

export interface AgendaItem extends PublicRecord {
  agenda_id: string;
  event_code: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room: string;
  title_zh: string;
  title_en: string;
  description_zh: string;
  description_en: string;
  speaker_ids: string;
  sort_order: number;
}

export interface Speaker extends PublicRecord {
  speaker_id: string;
  event_code: string;
  name_zh: string;
  name_en: string;
  title_zh: string;
  title_en: string;
  organization_zh: string;
  organization_en: string;
  bio_zh: string;
  bio_en: string;
  photo_url: string;
  website_url: string;
  sort_order: number;
}

export interface FaqItem extends PublicRecord {
  faq_id: string;
  event_code: string;
  category: string;
  question_zh: string;
  answer_zh: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
}

export interface GlossaryItem extends PublicRecord {
  glossary_id: string;
  event_code: string;
  term_zh: string;
  term_en: string;
  definition_zh: string;
  definition_en: string;
  sort_order: number;
}

export interface EventData {
  settings: Setting[];
  agenda: AgendaItem[];
  speakers: Speaker[];
  faq: FaqItem[];
  glossary: GlossaryItem[];
  mode: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  meta: {
    request_id: string;
    timestamp: string;
    mode: string;
  };
}

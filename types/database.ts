/**
 * Clario database types — aligned with supabase/migrations (Milestone 1).
 * Regenerate from Supabase CLI when the schema changes:
 *   npx supabase gen types typescript --project-id <id> > types/database.generated.ts
 */

export type UserRole = "business_owner" | "client";

export type AppointmentStatus =
  | "pending"
  | "scheduled"
  | "completed"
  | "cancelled";

export type DocumentType =
  | "receipt"
  | "visit_summary"
  | "insurance"
  | "other";

export type FormAssignmentStatus = "pending" | "completed";

export type PurchaseStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ProductCurrency = "ILS" | "USD";

export type VisitPublicationScope = "full" | "recommendations_only";

export type NotificationType =
  | "appointment_request"
  | "appointment_cancelled_by_client"
  | "appointment_approved"
  | "appointment_declined"
  | "form_assigned"
  | "form_update_requested"
  | "form_submitted"
  | "purchase_requested"
  | "purchase_confirmed"
  | "purchase_completed"
  | "purchase_cancelled"
  | "visit_published";

export type RecommendationCategory =
  | "product"
  | "medication"
  | "device"
  | "treatment"
  | "other";

/** JSON array stored on forms.fields */
export type FormFieldType =
  | "short_text"
  | "long_text"
  | "yes_no"
  | "single_choice"
  | "multiple_choice"
  | "date"
  | "checkbox";

export type FormFieldVisibleWhen = {
  questionId: string;
  value: string | boolean;
};

export type FormFieldDefinition = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  order: number;
  options?: string[];
  helpText?: string;
  visibleWhen?: FormFieldVisibleWhen;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  default_appointment_duration_minutes: number;
  created_at: string;
};

export type Client = {
  id: string;
  business_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export type BusinessAvailability = {
  id: string;
  business_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

export type Appointment = {
  id: string;
  business_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  appointment_id: string;
  client_id: string;
  summary: string | null;
  professional_notes: string | null;
  follow_up: string | null;
  published_at: string | null;
  publication_scope: VisitPublicationScope;
  created_at: string;
};

/** Client-safe visit row from public.client_visits (no professional_notes). */
export type ClientVisit = {
  id: string;
  appointment_id: string;
  client_id: string;
  summary: string | null;
  follow_up: string | null;
  publication_scope: VisitPublicationScope;
  created_at: string;
};

export type Form = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  fields: FormFieldDefinition[];
  renewal_interval_months: number | null;
  archived_at: string | null;
  created_at: string;
};

export type FormAssignmentKind =
  | "owner_assign"
  | "owner_update_request"
  | "client_update";

export type FormAssignment = {
  id: string;
  form_id: string;
  client_id: string;
  status: FormAssignmentStatus;
  assignment_kind: FormAssignmentKind;
  prefill_from_submission_id: string | null;
  assigned_at: string;
  completed_at: string | null;
};

export type FormSubmissionSnapshot = {
  formTitle: string;
  formDescription: string | null;
  renewalIntervalMonths: number | null;
  submittedFieldDefinitions: FormFieldDefinition[];
};

export type FormSubmission = {
  id: string;
  form_id: string;
  form_assignment_id: string;
  client_id: string;
  answers: Json;
  snapshot: FormSubmissionSnapshot;
  submitted_at: string;
  valid_until: string | null;
  supersedes_submission_id: string | null;
};

export type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: ProductCurrency;
  is_active: boolean;
  image_path: string | null;
  created_at: string;
};

export type VisitRecommendation = {
  id: string;
  visit_id: string;
  client_id: string;
  category: RecommendationCategory;
  title: string;
  instructions: string | null;
  product_id: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  business_id: string;
  client_id: string;
  status: PurchaseStatus;
  total_amount: number;
  created_at: string;
};

export type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type Document = {
  id: string;
  client_id: string;
  visit_id: string | null;
  type: DocumentType;
  file_path: string;
  file_name: string;
  mime_type: string;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  appointment_id: string | null;
  business_id: string | null;
  client_id: string | null;
  form_assignment_id: string | null;
  purchase_id: string | null;
  visit_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** Supabase Storage path: {business_id}/{client_id}/{document_id}/{file_name} */
export function buildDocumentStoragePath(params: {
  businessId: string;
  clientId: string;
  documentId: string;
  fileName: string;
}): string {
  return `${params.businessId}/${params.clientId}/${params.documentId}/${params.fileName}`;
}

/** RPC from migration 20260829130000 — complete scheduled appointment + create draft visit. */
export type CompleteAppointmentWithVisitArgs = {
  p_appointment_id: string;
};

export type SubmitFormAssignmentArgs = {
  p_form_assignment_id: string;
  p_answers: Json;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string;
          phone?: string | null;
          role?: UserRole;
        };
        Relationships: [];
      };
      businesses: {
        Row: Business;
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          default_appointment_duration_minutes?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          default_appointment_duration_minutes?: number;
        };
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string | null;
          notes?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      business_availability: {
        Row: BusinessAvailability;
        Insert: {
          id?: string;
          business_id: string;
          day_of_week?: number | null;
          specific_date?: string | null;
          start_time: string;
          end_time: string;
        };
        Update: {
          day_of_week?: number | null;
          specific_date?: string | null;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: {
          id?: string;
          business_id: string;
          client_id: string;
          start_time: string;
          end_time: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          start_time?: string;
          end_time?: string;
          status?: AppointmentStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      visits: {
        Row: Visit;
        Insert: {
          id?: string;
          appointment_id: string;
          client_id: string;
          summary?: string | null;
          professional_notes?: string | null;
          follow_up?: string | null;
          published_at?: string | null;
          publication_scope?: VisitPublicationScope;
          created_at?: string;
        };
        Update: {
          summary?: string | null;
          professional_notes?: string | null;
          follow_up?: string | null;
          published_at?: string | null;
          publication_scope?: VisitPublicationScope;
        };
        Relationships: [];
      };
      forms: {
        Row: Form;
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          description?: string | null;
          fields?: FormFieldDefinition[];
          renewal_interval_months?: number | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          fields?: FormFieldDefinition[];
          renewal_interval_months?: number | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      form_assignments: {
        Row: FormAssignment;
        Insert: {
          id?: string;
          form_id: string;
          client_id: string;
          status?: FormAssignmentStatus;
          assignment_kind?: FormAssignmentKind;
          prefill_from_submission_id?: string | null;
          assigned_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: FormAssignmentStatus;
          assignment_kind?: FormAssignmentKind;
          prefill_from_submission_id?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      form_submissions: {
        Row: FormSubmission;
        Insert: {
          id?: string;
          form_id: string;
          form_assignment_id: string;
          client_id: string;
          answers?: Json;
          snapshot: FormSubmissionSnapshot;
          submitted_at?: string;
          valid_until?: string | null;
          supersedes_submission_id?: string | null;
        };
        Update: {
          answers?: Json;
          snapshot?: FormSubmissionSnapshot;
          valid_until?: string | null;
          supersedes_submission_id?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          price: number;
          currency?: ProductCurrency;
          is_active?: boolean;
          image_path?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          currency?: ProductCurrency;
          is_active?: boolean;
          image_path?: string | null;
        };
        Relationships: [];
      };
      visit_recommendations: {
        Row: VisitRecommendation;
        Insert: {
          id?: string;
          visit_id: string;
          client_id: string;
          category: RecommendationCategory;
          title: string;
          instructions?: string | null;
          product_id?: string | null;
          created_at?: string;
        };
        Update: {
          category?: RecommendationCategory;
          title?: string;
          instructions?: string | null;
          product_id?: string | null;
        };
        Relationships: [];
      };
      purchases: {
        Row: Purchase;
        Insert: {
          id?: string;
          business_id: string;
          client_id: string;
          status?: PurchaseStatus;
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          status?: PurchaseStatus;
          total_amount?: number;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: PurchaseItem;
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: {
          id?: string;
          client_id: string;
          visit_id?: string | null;
          type: DocumentType;
          file_path: string;
          file_name: string;
          mime_type: string;
          created_at?: string;
        };
        Update: {
          visit_id?: string | null;
          type?: DocumentType;
          file_path?: string;
          file_name?: string;
          mime_type?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: {
          id?: string;
          recipient_profile_id: string;
          type: NotificationType;
          title: string;
          message: string;
          appointment_id?: string | null;
          business_id?: string | null;
          client_id?: string | null;
          form_assignment_id?: string | null;
          purchase_id?: string | null;
          visit_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      client_visits: {
        Row: ClientVisit;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

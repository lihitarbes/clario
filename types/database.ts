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

export type PurchaseStatus = "pending" | "confirmed" | "cancelled";

export type NotificationType =
  | "appointment_request"
  | "appointment_cancelled_by_client"
  | "appointment_approved"
  | "appointment_declined";

/** JSON array stored on forms.fields */
export type FormFieldDefinition = {
  id: string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "select" | "date";
  required: boolean;
  options?: string[];
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
  day_of_week: number;
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
  created_at: string;
};

export type Form = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  fields: FormFieldDefinition[];
  created_at: string;
};

export type FormAssignment = {
  id: string;
  form_id: string;
  client_id: string;
  status: FormAssignmentStatus;
  assigned_at: string;
  completed_at: string | null;
};

export type FormSubmission = {
  id: string;
  form_id: string;
  form_assignment_id: string;
  client_id: string;
  answers: Json;
  submitted_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type ProductRecommendation = {
  id: string;
  visit_id: string;
  client_id: string;
  product_id: string;
  notes: string | null;
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string;
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
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: {
          day_of_week?: number;
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
          created_at?: string;
        };
        Update: {
          summary?: string | null;
          professional_notes?: string | null;
          follow_up?: string | null;
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
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          fields?: FormFieldDefinition[];
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
          assigned_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: FormAssignmentStatus;
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
          submitted_at?: string;
        };
        Update: {
          answers?: Json;
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
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      product_recommendations: {
        Row: ProductRecommendation;
        Insert: {
          id?: string;
          visit_id: string;
          client_id: string;
          product_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          notes?: string | null;
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
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

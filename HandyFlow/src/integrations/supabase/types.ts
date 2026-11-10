export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  handyflow: {
    Tables: {
      handyman_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          inviter_id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          inviter_id: string
          message?: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          inviter_id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          task_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          task_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          handyman_id: string
          id: string
          message: string
          price: number
          status: Database["handyflow"]["Enums"]["offer_status"]
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          handyman_id: string
          id?: string
          message?: string
          price: number
          status?: Database["handyflow"]["Enums"]["offer_status"]
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          handyman_id?: string
          id?: string
          message?: string
          price?: number
          status?: Database["handyflow"]["Enums"]["offer_status"]
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          available: boolean
          avatar: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          daily_rate: number | null
          email: string | null
          first_name: string | null
          floor: string | null
          formatted_address: string | null
          headline: string | null
          id: string
          is_demo: boolean
          is_public: boolean
          jobs_done: number
          last_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          nickname: string | null
          phones: string[]
          rating: number
          reviews_count: number
          specialties: string[]
          street: string | null
          street_number: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          available?: boolean
          avatar?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          daily_rate?: number | null
          email?: string | null
          first_name?: string | null
          floor?: string | null
          formatted_address?: string | null
          headline?: string | null
          id: string
          is_demo?: boolean
          is_public?: boolean
          jobs_done?: number
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          nickname?: string | null
          phones?: string[]
          rating?: number
          reviews_count?: number
          specialties?: string[]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          available?: boolean
          avatar?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          daily_rate?: number | null
          email?: string | null
          first_name?: string | null
          floor?: string | null
          formatted_address?: string | null
          headline?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          jobs_done?: number
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          nickname?: string | null
          phones?: string[]
          rating?: number
          reviews_count?: number
          specialties?: string[]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      repair_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string
          comment: string
          created_at: string
          direction: string
          handyman_id: string
          id: string
          rating: number
          reviewer_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          comment?: string
          created_at?: string
          direction?: string
          handyman_id: string
          id?: string
          rating: number
          reviewer_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          comment?: string
          created_at?: string
          direction?: string
          handyman_id?: string
          id?: string
          rating?: number
          reviewer_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      task_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          id: string
          message: string
          price: number | null
          task_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          message?: string
          price?: number | null
          task_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          message?: string
          price?: number | null
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      task_requests: {
        Row: {
          agreed_price: number | null
          budget: number | null
          budget_max: number | null
          cancel_requested_by: string | null
          category_id: string | null
          client_id: string
          created_at: string
          description: string
          end_time: string | null
          handyman_id: string | null
          id: string
          is_demo: boolean
          location: string
          postpone_reason: string | null
          postpone_requested_by: string | null
          postpone_requested_date: string | null
          postpone_requested_time: string | null
          postponed_to: string | null
          preferred_date: string | null
          priority: string
          progress: number
          start_time: string | null
          status: Database["handyflow"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          budget?: number | null
          budget_max?: number | null
          cancel_requested_by?: string | null
          category_id?: string | null
          client_id: string
          created_at?: string
          description?: string
          end_time?: string | null
          handyman_id?: string | null
          id?: string
          is_demo?: boolean
          location?: string
          postpone_reason?: string | null
          postpone_requested_by?: string | null
          postpone_requested_date?: string | null
          postpone_requested_time?: string | null
          postponed_to?: string | null
          preferred_date?: string | null
          priority?: string
          progress?: number
          start_time?: string | null
          status?: Database["handyflow"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          budget?: number | null
          budget_max?: number | null
          cancel_requested_by?: string | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          description?: string
          end_time?: string | null
          handyman_id?: string | null
          id?: string
          is_demo?: boolean
          location?: string
          postpone_reason?: string | null
          postpone_requested_by?: string | null
          postpone_requested_date?: string | null
          postpone_requested_time?: string | null
          postponed_to?: string | null
          preferred_date?: string | null
          priority?: string
          progress?: number
          start_time?: string | null
          status?: Database["handyflow"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_postpone_requested_by_fkey"
            columns: ["postpone_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_requests_postpone_requested_by_fkey"
            columns: ["postpone_requested_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_id: string
          author_name: string
          author_role: string
          created_at: string
          featured: boolean
          id: string
          quote: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_role?: string
          created_at?: string
          featured?: boolean
          id?: string
          quote: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: string
          created_at?: string
          featured?: boolean
          id?: string
          quote?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["handyflow"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["handyflow"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["handyflow"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profile_directory: {
        Row: Pick<Database["handyflow"]["Tables"]["profiles"]["Row"],
          "id" | "name" | "avatar" | "headline" | "rating" | "reviews_count" |
          "jobs_done" | "daily_rate" | "available" | "country_code" | "bio" |
          "location" | "specialties" | "city" | "country" | "is_public">
        Relationships: []
      }
    }
    Functions: {
      enroll: { Args: Record<string, never>; Returns: string }
      get_request_participant_contact: {
        Args: { _task_id: string }
        Returns: { name: string; email: string | null; phones: string[]; address: string | null }[]
      }
      get_request_client_contact: {
        Args: { _task_id: string }
        Returns: { name: string; email: string | null; phones: string[]; address: string | null }[]
      }
      resolve_offer: {
        Args: { _offer_id: string; _action: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["handyflow"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "handyman" | "admin"
      offer_status: "pending" | "accepted" | "declined" | "withdrawn"
      task_status:
        | "pending"
        | "negotiating"
        | "agreed"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "handyflow">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  handyflow: {
    Enums: {
      app_role: ["client", "handyman", "admin"],
      offer_status: ["pending", "accepted", "declined", "withdrawn"],
      task_status: [
        "pending",
        "negotiating",
        "agreed",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

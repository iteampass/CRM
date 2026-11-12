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
  talent: {
    Tables: {
      candidate_privileges: {
        Row: { profile_id: string; can_create: boolean; can_view: boolean }
        Insert: { profile_id: string; can_create?: boolean; can_view?: boolean }
        Update: { profile_id?: string; can_create?: boolean; can_view?: boolean }
        Relationships: []
      }
      api: {
        Row: {
          api_key: string | null
          api_link: string | null
          api_name: string | null
          created_at: string
          id: number
        }
        Insert: {
          api_key?: string | null
          api_link?: string | null
          api_name?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          api_key?: string | null
          api_link?: string | null
          api_name?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      candidate_comments: {
        Row: {
          interview_id: string | null
          author_id: string | null
          candidate_id: string
          content: string
          created_at: string
          id: string
          stage: Database["talent"]["Enums"]["comment_stage"]
          updated_at: string
        }
        Insert: {
          interview_id?: string | null
          author_id?: string | null
          candidate_id: string
          content: string
          created_at?: string
          id?: string
          stage?: Database["talent"]["Enums"]["comment_stage"]
          updated_at?: string
        }
        Update: {
          interview_id?: string | null
          author_id?: string | null
          candidate_id?: string
          content?: string
          created_at?: string
          id?: string
          stage?: Database["talent"]["Enums"]["comment_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_comments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_comments_temp: {
        Row: {
          interview_id: string | null
          author_id: string | null
          candidate_id: string | null
          content: string | null
          created_at: string | null
          id: string | null
          stage: Database["talent"]["Enums"]["comment_stage"] | null
          updated_at: string | null
        }
        Insert: {
          interview_id?: string | null
          author_id?: string | null
          candidate_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          stage?: Database["talent"]["Enums"]["comment_stage"] | null
          updated_at?: string | null
        }
        Update: {
          interview_id?: string | null
          author_id?: string | null
          candidate_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          stage?: Database["talent"]["Enums"]["comment_stage"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          created_by: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          parsed_resume_data: Json | null
          phone: string
          position_id: string | null
          resume_meta: Json | null
          resume_text: string | null
          resume_url: string | null
          status: Database["talent"]["Enums"]["candidate_status"]
          updated_at: string
          workspace_id: number
        }
        Insert: {
          created_by?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          parsed_resume_data?: Json | null
          phone?: string
          position_id?: string | null
          resume_meta?: Json | null
          resume_text?: string | null
          resume_url?: string | null
          status?: Database["talent"]["Enums"]["candidate_status"]
          updated_at?: string
          workspace_id?: number
        }
        Update: {
          created_by?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          parsed_resume_data?: Json | null
          phone?: string
          position_id?: string | null
          resume_meta?: Json | null
          resume_text?: string | null
          resume_url?: string | null
          status?: Database["talent"]["Enums"]["candidate_status"]
          updated_at?: string
          workspace_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates_temp: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          parsed_resume_data: Json | null
          phone: string | null
          position_id: string | null
          resume_meta: Json | null
          resume_text: string | null
          resume_url: string | null
          status: Database["talent"]["Enums"]["candidate_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          parsed_resume_data?: Json | null
          phone?: string | null
          position_id?: string | null
          resume_meta?: Json | null
          resume_text?: string | null
          resume_url?: string | null
          status?: Database["talent"]["Enums"]["candidate_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          parsed_resume_data?: Json | null
          phone?: string | null
          position_id?: string | null
          resume_meta?: Json | null
          resume_text?: string | null
          resume_url?: string | null
          status?: Database["talent"]["Enums"]["candidate_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          candidate_id: string
          comments: string
          created_at: string
          criteria: Json
          duration_minutes: number
          id: string
          interview_date: string
          interview_type: string
          interviewer_id: string | null
          meeting_link: string
          score: number | null
          status: Database["talent"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          comments?: string
          created_at?: string
          criteria?: Json
          duration_minutes?: number
          id?: string
          interview_date?: string
          interview_type?: string
          interviewer_id?: string | null
          meeting_link?: string
          score?: number | null
          status?: Database["talent"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          comments?: string
          created_at?: string
          criteria?: Json
          duration_minutes?: number
          id?: string
          interview_date?: string
          interview_type?: string
          interviewer_id?: string | null
          meeting_link?: string
          score?: number | null
          status?: Database["talent"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews_temp: {
        Row: {
          candidate_id: string | null
          comments: string | null
          created_at: string | null
          criteria: Json | null
          id: string | null
          interview_date: string | null
          interview_type: string | null
          interviewer_id: string | null
          score: number | null
          status: Database["talent"]["Enums"]["interview_status"] | null
          updated_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          comments?: string | null
          created_at?: string | null
          criteria?: Json | null
          id?: string | null
          interview_date?: string | null
          interview_type?: string | null
          interviewer_id?: string | null
          score?: number | null
          status?: Database["talent"]["Enums"]["interview_status"] | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          comments?: string | null
          created_at?: string | null
          criteria?: Json | null
          id?: string | null
          interview_date?: string | null
          interview_type?: string | null
          interviewer_id?: string | null
          score?: number | null
          status?: Database["talent"]["Enums"]["interview_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          access_restricted: boolean
          created_at: string
          department: string
          description: string
          id: string
          name: string
          status: Database["talent"]["Enums"]["position_status"]
          updated_at: string
          workspace_id: number
        }
        Insert: {
          access_restricted?: boolean
          created_at?: string
          department?: string
          description?: string
          id?: string
          name: string
          status?: Database["talent"]["Enums"]["position_status"]
          updated_at?: string
          workspace_id?: number
        }
        Update: {
          access_restricted?: boolean
          created_at?: string
          department?: string
          description?: string
          id?: string
          name?: string
          status?: Database["talent"]["Enums"]["position_status"]
          updated_at?: string
          workspace_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "positions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_attendees: {
        Row: { interview_id: string; profile_id: string }
        Insert: { interview_id: string; profile_id: string }
        Update: { interview_id?: string; profile_id?: string }
        Relationships: []
      }
      position_members: {
        Row: {
          role: "position_admin" | "interview_group"
          created_at: string
          position_id: string
          profile_id: string
        }
        Insert: {
          role?: "position_admin" | "interview_group"
          created_at?: string
          position_id: string
          profile_id: string
        }
        Update: {
          role?: "position_admin" | "interview_group"
          created_at?: string
          position_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions_temp: {
        Row: {
          created_at: string | null
          department: string | null
          description: string | null
          id: string | null
          name: string | null
          status: Database["talent"]["Enums"]["position_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          status?: Database["talent"]["Enums"]["position_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          status?: Database["talent"]["Enums"]["position_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_position: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
          user_id: string | null
          workspace_id: number | null
        }
        Insert: {
          company_position?: string
          created_at?: string
          email: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: number | null
        }
        Update: {
          company_position?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: number | null
        }
        Relationships: []
      }
      profiles_temp: {
        Row: {
          company_position: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_position?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_position?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workspace: {
        Row: {
          created_at: string | null
          created_by: string
          id: number
          workspace_admins: string[]
          workspace_name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: never
          workspace_admins: string[]
          workspace_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: never
          workspace_admins?: string[]
          workspace_name?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          code: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          revoked: boolean
          updated_at: string
          used_at: string | null
          used_by: string | null
          workspace_id: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          email?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          workspace_id: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          workspace_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_upload_candidate_resume: { Args: { _candidate_id: string }; Returns: boolean }
      has_candidate_privilege: { Args: { _privilege: string }; Returns: boolean }
      remove_workspace_member: { Args: { _profile_id: string }; Returns: undefined }
      can_manage_candidate: { Args: { _candidate_id: string }; Returns: boolean }
      set_workspace_admin: { Args: { _profile_id: string; _enabled: boolean }; Returns: undefined }

      current_workspace_id: { Args: never; Returns: number }
      is_workspace_admin: { Args: { _workspace_id: number }; Returns: boolean }
    }
    Enums: {
      candidate_status:
        | "new"
        | "screening"
        | "interview"
        | "technical"
        | "final"
        | "offer"
        | "hired"
        | "rejected"
      comment_stage: "recruiter" | "hr" | "technical" | "final"
      interview_status: "scheduled" | "completed" | "cancelled"
      position_status: "open" | "paused" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "talent">]

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
  talent: {
    Enums: {
      candidate_status: [
        "new",
        "screening",
        "interview",
        "technical",
        "final",
        "offer",
        "hired",
        "rejected",
      ],
      comment_stage: ["recruiter", "hr", "technical", "final"],
      interview_status: ["scheduled", "completed", "cancelled"],
      position_status: ["open", "paused", "closed"],
    },
  },
} as const

/**
 * Supabase Database type definitions.
 *
 * This file will be replaced by auto-generated types from `supabase gen types`
 * once the database schema is defined. For now it provides a minimal skeleton
 * so TypeScript is satisfied and the client is properly typed.
 */

export interface Database {
  public: {
    Tables: {
      candidate_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          bio: string | null;
          phone: string | null;
          location: string | null;
          profile_photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          bio?: string | null;
          phone?: string | null;
          location?: string | null;
          profile_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          bio?: string | null;
          phone?: string | null;
          location?: string | null;
          profile_photo_url?: string | null;
          updated_at?: string;
        };
      };
      education: {
        Row: {
          id: string;
          user_id: string;
          institution: string;
          degree: string;
          field_of_study: string | null;
          start_date: string | null;
          end_date: string | null;
          grade: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution: string;
          degree: string;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          grade?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          institution?: string;
          degree?: string;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          grade?: string | null;
          description?: string | null;
          updated_at?: string;
        };
      };
      experience: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          job_title: string;
          employment_type: string | null;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          currently_working: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          job_title: string;
          employment_type?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currently_working?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          job_title?: string;
          employment_type?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currently_working?: boolean;
          description?: string | null;
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          proficiency_level: string;
          years_of_experience: number | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_name: string;
          proficiency_level?: string;
          years_of_experience?: number | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill_name?: string;
          proficiency_level?: string;
          years_of_experience?: number | null;
          category?: string | null;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          technologies: string[] | null;
          github_url: string | null;
          live_url: string | null;
          start_date: string | null;
          end_date: string | null;
          currently_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          technologies?: string[] | null;
          github_url?: string | null;
          live_url?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currently_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          technologies?: string[] | null;
          github_url?: string | null;
          live_url?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currently_active?: boolean;
          updated_at?: string;
        };
      };
      candidate_preferences: {
        Row: {
          id: string;
          user_id: string;
          desired_roles: string[];
          locations: string[];
          work_mode: string;
          min_salary: number;
          notice_period: string | null;
          open_to_relocate: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          desired_roles?: string[];
          locations?: string[];
          work_mode?: string;
          min_salary?: number;
          notice_period?: string | null;
          open_to_relocate?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          desired_roles?: string[];
          locations?: string[];
          work_mode?: string;
          min_salary?: number;
          notice_period?: string | null;
          open_to_relocate?: boolean;
          updated_at?: string;
        };
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          original_file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_at: string;
          is_active: boolean;
          storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          original_file_name: string;
          file_size?: number;
          mime_type?: string;
          uploaded_at?: string;
          is_active?: boolean;
          storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          original_file_name?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_at?: string;
          is_active?: boolean;
          storage_path?: string | null;
          updated_at?: string;
        };
      };
      onboarding_progress: {
        Row: {
          id: string;
          user_id: string;
          current_step: string;
          completed_steps: string[];
          onboarding_data: Record<string, unknown>;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_step?: string;
          completed_steps?: string[];
          onboarding_data?: Record<string, unknown>;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_step?: string;
          completed_steps?: string[];
          onboarding_data?: Record<string, unknown>;
          completed?: boolean;
          updated_at?: string;
        };
      };
      profile_completion: {
        Row: {
          id: string;
          user_id: string;
          percentage: number;
          completed_sections: string[];
          incomplete_sections: string[];
          missing_fields: string[];
          section_details: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          percentage?: number;
          completed_sections?: string[];
          incomplete_sections?: string[];
          missing_fields?: string[];
          section_details?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          percentage?: number;
          completed_sections?: string[];
          incomplete_sections?: string[];
          missing_fields?: string[];
          section_details?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      recruiters: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          job_title: string;
          department: string | null;
          work_email: string | null;
          phone: string | null;
          company_name: string | null;
          company_logo_url: string | null;
          company_website: string | null;
          company_industry: string | null;
          company_size: string | null;
          company_headquarters: string | null;
          hiring_roles: string[];
          hiring_locations: string[];
          work_modes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          job_title: string;
          department?: string | null;
          work_email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          company_logo_url?: string | null;
          company_website?: string | null;
          company_industry?: string | null;
          company_size?: string | null;
          company_headquarters?: string | null;
          hiring_roles?: string[];
          hiring_locations?: string[];
          work_modes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          job_title?: string;
          department?: string | null;
          work_email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          company_logo_url?: string | null;
          company_website?: string | null;
          company_industry?: string | null;
          company_size?: string | null;
          company_headquarters?: string | null;
          hiring_roles?: string[];
          hiring_locations?: string[];
          work_modes?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recruiters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          resume_id: string;
          overall_score: number;
          section_scores: Record<string, unknown>;
          strengths: string[];
          weaknesses: string[];
          suggestions: string[];
          ats_compatibility: number | null;
          keyword_analysis: Record<string, unknown> | null;
          raw_analysis: Record<string, unknown> | null;
          status: string;
          target_role: string | null;
          model_version: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resume_id: string;
          overall_score?: number;
          section_scores?: Record<string, unknown>;
          strengths?: string[];
          weaknesses?: string[];
          suggestions?: string[];
          ats_compatibility?: number | null;
          keyword_analysis?: Record<string, unknown> | null;
          raw_analysis?: Record<string, unknown> | null;
          status?: string;
          target_role?: string | null;
          model_version?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          resume_id?: string;
          overall_score?: number;
          section_scores?: Record<string, unknown>;
          strengths?: string[];
          weaknesses?: string[];
          suggestions?: string[];
          ats_compatibility?: number | null;
          keyword_analysis?: Record<string, unknown> | null;
          raw_analysis?: Record<string, unknown> | null;
          status?: string;
          target_role?: string | null;
          model_version?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          recruiter_id: string;
          company_name: string;
          legal_name: string | null;
          company_size: string | null;
          industry: string | null;
          website: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          postal_code: string | null;
          logo_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          company_name: string;
          legal_name?: string | null;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recruiter_id?: string;
          company_name?: string;
          legal_name?: string | null;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          logo_url?: string | null;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "recruiters";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_settings: {
        Row: {
          user_id: string;
          language: string;
          timezone: string;
          two_factor: boolean;
          job_alerts: boolean;
          weekly_digest: boolean;
          profile_visible: boolean;
          application_updates: boolean;
          interview_reminders: boolean;
          new_matches: boolean;
          product_news: boolean;
          plan: string;
          renews_on: string;
          ai_credits_used: number;
          ai_credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          language?: string;
          timezone?: string;
          two_factor?: boolean;
          job_alerts?: boolean;
          weekly_digest?: boolean;
          profile_visible?: boolean;
          application_updates?: boolean;
          interview_reminders?: boolean;
          new_matches?: boolean;
          product_news?: boolean;
          plan?: string;
          renews_on?: string;
          ai_credits_used?: number;
          ai_credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          language?: string;
          timezone?: string;
          two_factor?: boolean;
          job_alerts?: boolean;
          weekly_digest?: boolean;
          profile_visible?: boolean;
          application_updates?: boolean;
          interview_reminders?: boolean;
          new_matches?: boolean;
          product_news?: boolean;
          plan?: string;
          renews_on?: string;
          ai_credits_used?: number;
          ai_credits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_prep_progress: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          practiced: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          practiced?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practiced?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      copilot_conversations: {
        Row: {
          user_id: string;
          audience: string;
          messages: Record<string, unknown>[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          audience: string;
          messages?: Record<string, unknown>[];
          updated_at?: string;
        };
        Update: {
          messages?: Record<string, unknown>[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;

    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

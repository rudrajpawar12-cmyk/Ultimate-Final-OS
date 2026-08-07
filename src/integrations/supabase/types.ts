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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          created_at: string
          id: string
          input_hash: string
          kind: string
          model_version: string | null
          payload: Json
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_hash: string
          kind: string
          model_version?: string | null
          payload?: Json
          subject_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_hash?: string
          kind?: string
          model_version?: string | null
          payload?: Json
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_events: {
        Row: {
          actor: string
          application_id: string
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          actor?: string
          application_id: string
          created_at?: string
          description?: string | null
          id?: string
          status: string
          title: string
          user_id: string
        }
        Update: {
          actor?: string
          application_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author: string
          body: string
          created_at: string
          id: string
          recruiter_id: string
        }
        Insert: {
          application_id: string
          author?: string
          body: string
          created_at?: string
          id?: string
          recruiter_id: string
        }
        Update: {
          application_id?: string
          author?: string
          body?: string
          created_at?: string
          id?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      application_stage_events: {
        Row: {
          actor: string | null
          application_id: string
          created_at: string
          from_stage: string | null
          id: string
          recruiter_id: string
          to_stage: string
        }
        Insert: {
          actor?: string | null
          application_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          recruiter_id: string
          to_stage: string
        }
        Update: {
          actor?: string | null
          application_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          recruiter_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_events_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      application_tags: {
        Row: {
          application_id: string
          created_at: string
          id: string
          recruiter_id: string
          tag: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          recruiter_id: string
          tag: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          recruiter_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_tags_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_tags_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          recruiter_id: string | null
          resume_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          recruiter_id?: string | null
          resume_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          recruiter_id?: string | null
          resume_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_preferences: {
        Row: {
          created_at: string
          desired_roles: string[]
          id: string
          locations: string[]
          min_salary: number
          notice_period: string | null
          open_to_relocate: boolean
          updated_at: string
          user_id: string
          work_mode: string
        }
        Insert: {
          created_at?: string
          desired_roles?: string[]
          id?: string
          locations?: string[]
          min_salary?: number
          notice_period?: string | null
          open_to_relocate?: boolean
          updated_at?: string
          user_id: string
          work_mode?: string
        }
        Update: {
          created_at?: string
          desired_roles?: string[]
          id?: string
          locations?: string[]
          min_salary?: number
          notice_period?: string | null
          open_to_relocate?: boolean
          updated_at?: string
          user_id?: string
          work_mode?: string
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          bio: string | null
          created_at: string
          full_name: string
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          profile_photo_url: string | null
          profile_views: number
          twitter_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          full_name?: string
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          full_name?: string
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      candidate_settings: {
        Row: {
          ai_credits: number
          ai_credits_used: number
          application_updates: boolean
          created_at: string
          interview_reminders: boolean
          job_alerts: boolean
          language: string
          new_matches: boolean
          plan: string
          product_news: boolean
          profile_visible: boolean
          renews_on: string
          timezone: string
          two_factor: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          ai_credits?: number
          ai_credits_used?: number
          application_updates?: boolean
          created_at?: string
          interview_reminders?: boolean
          job_alerts?: boolean
          language?: string
          new_matches?: boolean
          plan?: string
          product_news?: boolean
          profile_visible?: boolean
          renews_on?: string
          timezone?: string
          two_factor?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          ai_credits?: number
          ai_credits_used?: number
          application_updates?: boolean
          created_at?: string
          interview_reminders?: boolean
          job_alerts?: boolean
          language?: string
          new_matches?: boolean
          plan?: string
          product_news?: boolean
          profile_visible?: boolean
          renews_on?: string
          timezone?: string
          two_factor?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          company_size: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          recruiter_id: string
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          recruiter_id: string
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          recruiter_id?: string
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: true
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_conversations: {
        Row: {
          audience: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          created_at: string
          degree: string
          description: string | null
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          company_name: string
          created_at: string
          currently_working: boolean
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          job_title: string
          location: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          currently_working?: boolean
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          location?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          currently_working?: boolean
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          location?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_prep_progress: {
        Row: {
          created_at: string
          id: string
          practiced: boolean
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          practiced?: boolean
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          practiced?: boolean
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number
          feedback: Json | null
          id: string
          job_id: string
          location: string
          mode: string
          notes: string
          panel: Json
          recruiter_id: string
          scheduled_at: string
          stage: string
          state: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          job_id: string
          location?: string
          mode?: string
          notes?: string
          panel?: Json
          recruiter_id: string
          scheduled_at?: string
          stage?: string
          state?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          job_id?: string
          location?: string
          mode?: string
          notes?: string
          panel?: Json
          recruiter_id?: string
          scheduled_at?: string
          stage?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      job_views: {
        Row: {
          created_at: string
          id: string
          job_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          benefits: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          department: string | null
          description: string
          employment_type: string | null
          experience_level: string | null
          id: string
          location: string | null
          max_experience: number | null
          max_salary: number | null
          min_experience: number | null
          min_salary: number | null
          recruiter_id: string | null
          requirements: string | null
          responsibilities: string | null
          skills: string[]
          status: string
          title: string
          updated_at: string
          workplace_type: string | null
        }
        Insert: {
          application_deadline?: string | null
          benefits?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          department?: string | null
          description?: string
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          location?: string | null
          max_experience?: number | null
          max_salary?: number | null
          min_experience?: number | null
          min_salary?: number | null
          recruiter_id?: string | null
          requirements?: string | null
          responsibilities?: string | null
          skills?: string[]
          status?: string
          title?: string
          updated_at?: string
          workplace_type?: string | null
        }
        Update: {
          application_deadline?: string | null
          benefits?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          department?: string | null
          description?: string
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          location?: string | null
          max_experience?: number | null
          max_salary?: number | null
          min_experience?: number | null
          min_salary?: number | null
          recruiter_id?: string | null
          requirements?: string | null
          responsibilities?: string | null
          skills?: string[]
          status?: string
          title?: string
          updated_at?: string
          workplace_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json
          read: boolean
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_steps: string[]
          created_at: string
          current_step: string
          id: string
          onboarding_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          id?: string
          onboarding_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          id?: string
          onboarding_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_completion: {
        Row: {
          completed_sections: string[]
          created_at: string
          id: string
          incomplete_sections: string[]
          missing_fields: string[]
          percentage: number
          section_details: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_sections?: string[]
          created_at?: string
          id?: string
          incomplete_sections?: string[]
          missing_fields?: string[]
          percentage?: number
          section_details?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_sections?: string[]
          created_at?: string
          id?: string
          incomplete_sections?: string[]
          missing_fields?: string[]
          percentage?: number
          section_details?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          currently_active: boolean
          description: string | null
          end_date: string | null
          github_url: string | null
          id: string
          live_url: string | null
          start_date: string | null
          technologies: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currently_active?: boolean
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          start_date?: string | null
          technologies?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currently_active?: boolean
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          start_date?: string | null
          technologies?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_workspace_settings: {
        Row: {
          created_at: string
          id: string
          recruiter_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recruiter_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recruiter_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_workspace_settings_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: true
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiters: {
        Row: {
          bio: string | null
          company_headquarters: string | null
          company_industry: string | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          department: string | null
          designation: string | null
          full_name: string
          hiring_locations: string[]
          hiring_roles: string[]
          id: string
          job_title: string
          linkedin_url: string | null
          phone: string | null
          profile_photo_url: string | null
          updated_at: string
          user_id: string
          work_email: string | null
          work_modes: string[]
        }
        Insert: {
          bio?: string | null
          company_headquarters?: string | null
          company_industry?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          full_name?: string
          hiring_locations?: string[]
          hiring_roles?: string[]
          id?: string
          job_title?: string
          linkedin_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          user_id: string
          work_email?: string | null
          work_modes?: string[]
        }
        Update: {
          bio?: string | null
          company_headquarters?: string | null
          company_industry?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          full_name?: string
          hiring_locations?: string[]
          hiring_roles?: string[]
          id?: string
          job_title?: string
          linkedin_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          user_id?: string
          work_email?: string | null
          work_modes?: string[]
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          ats_compatibility: number | null
          completed_at: string | null
          created_at: string
          id: string
          keyword_analysis: Json | null
          model_version: string | null
          overall_score: number
          raw_analysis: Json | null
          resume_id: string
          section_scores: Json
          status: string
          strengths: string[]
          suggestions: string[]
          target_role: string | null
          updated_at: string
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          ats_compatibility?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          keyword_analysis?: Json | null
          model_version?: string | null
          overall_score?: number
          raw_analysis?: Json | null
          resume_id: string
          section_scores?: Json
          status?: string
          strengths?: string[]
          suggestions?: string[]
          target_role?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string[]
        }
        Update: {
          ats_compatibility?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          keyword_analysis?: Json | null
          model_version?: string | null
          overall_score?: number
          raw_analysis?: Json | null
          resume_id?: string
          section_scores?: Json
          status?: string
          strengths?: string[]
          suggestions?: string[]
          target_role?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "resume_analyses_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          is_active: boolean
          mime_type: string
          original_file_name: string
          storage_path: string | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          is_active?: boolean
          mime_type?: string
          original_file_name?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          is_active?: boolean
          mime_type?: string
          original_file_name?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          proficiency_level: string
          skill_name: string
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          proficiency_level?: string
          skill_name: string
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          proficiency_level?: string
          skill_name?: string
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          _link: string
          _message: string
          _metadata: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      current_recruiter_id: { Args: never; Returns: string }
      is_my_recruiter: { Args: { _recruiter_id: string }; Returns: boolean }
      is_recruiter_applicant: { Args: { _user_id: string }; Returns: boolean }
      recruiter_applicant_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      recruiter_user_id: { Args: { _recruiter_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// JELAJAH — Supabase Database Types
// Auto-generated dari schema.sql. Update jika ada migrasi.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          public_key: string;
          display_name: string | null;
          avatar_url: string | null;
          reputation_score: number;
          level: number;
          xp: number;
          is_verified_hider: boolean;
          is_brand: boolean;
          created_at: string;
        };
        Insert: {
          public_key: string;
          display_name?: string | null;
          avatar_url?: string | null;
          reputation_score?: number;
          level?: number;
          xp?: number;
          is_verified_hider?: boolean;
          is_brand?: boolean;
          created_at?: string;
        };
      };
      hunts: {
        Row: {
          id: number;
          contract_id: string | null;
          hider_pubkey: string;
          hunt_type: string;
          clue: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          amount_stroops: number | null;
          deadline: string;
          status: string;
          photo_cid: string | null;
          created_at: string;
        };
        Insert: {
          contract_id?: string | null;
          hider_pubkey: string;
          hunt_type: string;
          clue: string;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          amount_stroops?: number | null;
          deadline: string;
          status?: string;
          photo_cid?: string | null;
          created_at?: string;
        };
      };
      claims: {
        Row: {
          id: number;
          hunt_id: number;
          hunter_pubkey: string;
          photo_cid: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          status: string;
          submitted_at: string;
          resolved_at: string | null;
        };
        Insert: {
          hunt_id: number;
          hunter_pubkey: string;
          photo_cid?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          status?: string;
          submitted_at?: string;
          resolved_at?: string | null;
        };
      };
      disputes: {
        Row: {
          id: number;
          claim_id: number;
          hunt_id: number;
          reason: string;
          verifiers: string[];
          votes: Record<string, unknown>;
          status: string;
          resolution: string | null;
          created_at: string;
        };
        Insert: {
          claim_id: number;
          hunt_id: number;
          reason: string;
          verifiers?: string[];
          votes?: Record<string, unknown>;
          status?: string;
          resolution?: string | null;
          created_at?: string;
        };
      };
      verifiers: {
        Row: {
          public_key: string;
          stake: number;
          disputes_handled: number;
          dispute_fee_earned: number;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          public_key: string;
          stake?: number;
          disputes_handled?: number;
          dispute_fee_earned?: number;
          is_active?: boolean;
          joined_at?: string;
        };
      };
      brands: {
        Row: {
          public_key: string;
          company_name: string;
          subscription_tier: string;
          subscription_start: string | null;
          subscription_end: string | null;
          total_campaigns: number;
          total_spent: number;
          created_at: string;
        };
        Insert: {
          public_key: string;
          company_name: string;
          subscription_tier?: string;
          subscription_start?: string | null;
          subscription_end?: string | null;
          total_campaigns?: number;
          total_spent?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: number;
          user_pubkey: string;
          type: string;
          title: string;
          message: string;
          data: Record<string, unknown> | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_pubkey: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, unknown> | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

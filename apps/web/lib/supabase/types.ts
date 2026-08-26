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
          hunt_id_hash: string;
          contract_id: string | null;
          create_tx_hash: string;
          hider_pubkey: string;
          asset_contract: string;
          hunt_type: string;
          clue: string;
          clue_hash: string;
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
          hunt_id_hash: string;
          contract_id?: string | null;
          create_tx_hash: string;
          hider_pubkey: string;
          asset_contract: string;
          hunt_type: string;
          clue: string;
          clue_hash: string;
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
          photo_hash: string;
          tx_hash: string;
          resolve_tx_hash: string | null;
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
          photo_hash: string;
          tx_hash: string;
          resolve_tx_hash?: string | null;
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
      appeals: {
        Row: {
          id: number;
          dispute_id: number;
          appellant_pubkey: string;
          reason: string;
          additional_evidence: string | null;
          verifiers: string[];
          votes: Record<string, unknown>;
          status: string;
          resolution: string | null;
          fee_paid: number;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          dispute_id: number;
          appellant_pubkey: string;
          reason: string;
          additional_evidence?: string | null;
          verifiers?: string[];
          votes?: Record<string, unknown>;
          status?: string;
          resolution?: string | null;
          fee_paid?: number;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      campaigns: {
        Row: {
          id: number;
          brand_pubkey: string;
          name: string;
          description: string | null;
          budget: number | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          brand_pubkey: string;
          name: string;
          description?: string | null;
          budget?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      campaign_hunts: {
        Row: {
          campaign_id: number;
          hunt_id: number;
        };
        Insert: {
          campaign_id: number;
          hunt_id: number;
        };
      };
      referrals: {
        Row: {
          id: number;
          referrer_pubkey: string;
          referee_pubkey: string;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          referrer_pubkey: string;
          referee_pubkey: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      leaderboard_snapshots: {
        Row: {
          id: number;
          rank_type: string;
          user_pubkey: string;
          score: number;
          period_start: string;
          period_end: string;
          rank: number;
          created_at: string;
        };
        Insert: {
          rank_type: string;
          user_pubkey: string;
          score: number;
          period_start: string;
          period_end: string;
          rank: number;
          created_at?: string;
        };
      };
      streaks: {
        Row: {
          id: number;
          user_pubkey: string;
          streak_type: string;
          current_count: number;
          longest_count: number;
          last_activity_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_pubkey: string;
          streak_type: string;
          current_count?: number;
          longest_count?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: number;
          user_pubkey: string;
          badge_id: number;
          badge_name: string;
          earned_at: string;
        };
        Insert: {
          user_pubkey: string;
          badge_id: number;
          badge_name: string;
          earned_at?: string;
        };
      };
      community_activities: {
        Row: {
          id: number;
          user_pubkey: string;
          activity_type: string;
          description: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          user_pubkey: string;
          activity_type: string;
          description: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: number;
          user_pubkey: string;
          api_key_hash: string;
          name: string;
          permissions: Record<string, unknown>;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          user_pubkey: string;
          api_key_hash: string;
          name: string;
          permissions?: Record<string, unknown>;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      audit_log: {
        Row: {
          id: number;
          action: string;
          actor_pubkey: string | null;
          entity_type: string | null;
          entity_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          action: string;
          actor_pubkey?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

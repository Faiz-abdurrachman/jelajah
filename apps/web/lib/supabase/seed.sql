-- JELAJAH — Seed Data SQL
-- Run via Supabase SQL Editor or supabase-jelajah_execute_sql
-- Project: vzohtezrdhselrommvcm

-- ⚠️ Pastiin existing data gak conflict. Run satu per satu kalo perlu.

-- Users (3 existing)
-- Budi Hunter:    GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M
-- Sita Hider:     GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F
-- Veri Master:    GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M

-- 5 NEW HUNTS
INSERT INTO hunts (contract_id, hider_pubkey, hunt_type, clue, latitude, longitude, radius_meters, amount_stroops, deadline, status) VALUES
  ('CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3', 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'gps', 'Jembatan penyeberangan dekat halte busway, cari kotak merah kecil.', -6.2297, 106.8258, 30, 150000000, NOW() + INTERVAL '5 days', 'active'),
  ('CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG4', 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'puzzle', 'Pecahkan cipher: KOORDINAT = (J+E+L+A+J+A+H) x 0.001', -6.1958, 106.8228, 15, 250000000, NOW() + INTERVAL '10 days', 'active'),
  ('CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG5', 'GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'gps', 'Patung di tengah taman kota. Selfie dengan patung sebagai bukti.', -6.2088, 106.8456, 40, 500000000, NOW() + INTERVAL '7 days', 'active'),
  ('CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG6', 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'quest', 'Quest 3-step: Pasar tradisional ke Museum ke Taman.', -6.1754, 106.8272, 25, 300000000, NOW() + INTERVAL '14 days', 'active'),
  ('CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG7', 'GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'photo', 'Jumping shot di depan air mancur. Pose harus kreatif!', -6.2198, 106.8023, 20, 100000000, NOW() + INTERVAL '3 days', 'active');

-- 3 NEW CLAIMS
INSERT INTO claims (hunt_id, hunter_pubkey, photo_cid, gps_lat, gps_lng, status, submitted_at) VALUES
  (5, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest123abc', -6.2297, 106.8258, 'pending', NOW()),
  (6, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest234abc', -6.1958, 106.8228, 'pending', NOW() - INTERVAL '1 hour'),
  (7, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest345abc', -6.2088, 106.8456, 'approved', NOW() - INTERVAL '2 hours');

-- 2 NEW DISPUTES
INSERT INTO disputes (claim_id, hunt_id, reason, verifiers, votes, status, created_at) VALUES
  (2, 5, 'Foto bukti tidak sesuai clue. Metadata GPS beda.', ARRAY['GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M'], '{"v1":true,"v2":false}'::jsonb, 'voting', NOW()),
  (3, 6, 'Hunter klaim sudah solve cipher tapi QR code tidak terbaca.', ARRAY['GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M'], '{"v1":true}'::jsonb, 'resolved', NOW() - INTERVAL '3 hours');

-- 3 NEW COMMUNITY ACTIVITIES
INSERT INTO community_activities (user_pubkey, activity_type, description, metadata, created_at) VALUES
  ('GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'hunt_created', 'Sita Hider membuat 4 hunt baru di Jakarta Pusat dan Selatan', '{"count":4}'::jsonb, NOW()),
  ('GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'claim_submitted', 'Budi Hunter klaim 3 hunt dalam 2 jam', '{"count":3}'::jsonb, NOW() - INTERVAL '30 minutes'),
  ('GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'dispute_resolved', 'Veri Master resolve dispute puzzle hunt — hunter menang', '{"dispute_id":3}'::jsonb, NOW() - INTERVAL '3 hours');

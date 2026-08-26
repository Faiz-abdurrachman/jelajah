-- JELAJAH — Seed Data SQL
-- Run via Supabase SQL Editor or supabase-jelajah_execute_sql
-- Project: vzohtezrdhselrommvcm

-- ⚠️ Pastiin existing data gak conflict. Run satu per satu kalo perlu.
-- DATA DEMO LEGACY SAJA: baris ini bukan hasil transaksi on-chain dan jangan
-- dipakai di production. Field hash diisi marker deterministik agar kompatibel
-- dengan schema GPS MVP yang mewajibkan metadata canonical chain.

-- Users (3 existing)
-- Budi Hunter:    GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M
-- Sita Hider:     GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F
-- Veri Master:    GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M

-- 5 NEW HUNTS
INSERT INTO hunts (hunt_id_hash, contract_id, create_tx_hash, hider_pubkey, asset_contract, hunt_type, clue, clue_hash, latitude, longitude, radius_meters, amount_stroops, deadline, status) VALUES
  (LPAD('1', 64, '0'), 'CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3', LPAD('11', 64, 'a'), 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'gps', 'Jembatan penyeberangan dekat halte busway, cari kotak merah kecil.', LPAD('21', 64, 'b'), -6.2297, 106.8258, 30, 150000000, NOW() + INTERVAL '5 days', 'active'),
  (LPAD('2', 64, '0'), 'CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG4', LPAD('12', 64, 'a'), 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'puzzle', 'Pecahkan cipher: KOORDINAT = (J+E+L+A+J+A+H) x 0.001', LPAD('22', 64, 'b'), -6.1958, 106.8228, 15, 250000000, NOW() + INTERVAL '10 days', 'active'),
  (LPAD('3', 64, '0'), 'CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG5', LPAD('13', 64, 'a'), 'GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'gps', 'Patung di tengah taman kota. Selfie dengan patung sebagai bukti.', LPAD('23', 64, 'b'), -6.2088, 106.8456, 40, 500000000, NOW() + INTERVAL '7 days', 'active'),
  (LPAD('4', 64, '0'), 'CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG6', LPAD('14', 64, 'a'), 'GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'quest', 'Quest 3-step: Pasar tradisional ke Museum ke Taman.', LPAD('24', 64, 'b'), -6.1754, 106.8272, 25, 300000000, NOW() + INTERVAL '14 days', 'active'),
  (LPAD('5', 64, '0'), 'CFJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILG7', LPAD('15', 64, 'a'), 'GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'photo', 'Jumping shot di depan air mancur. Pose harus kreatif!', LPAD('25', 64, 'b'), -6.2198, 106.8023, 20, 100000000, NOW() + INTERVAL '3 days', 'active');

-- 3 NEW CLAIMS
INSERT INTO claims (hunt_id, hunter_pubkey, photo_cid, photo_hash, tx_hash, gps_lat, gps_lng, status, submitted_at) VALUES
  (5, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest123abc0000', LPAD('31', 64, 'c'), LPAD('41', 64, 'd'), -6.2297, 106.8258, 'pending', NOW()),
  (6, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest234abc0000', LPAD('32', 64, 'c'), LPAD('42', 64, 'd'), -6.1958, 106.8228, 'pending', NOW() - INTERVAL '1 hour'),
  (7, 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'bafybeigtest345abc0000', LPAD('33', 64, 'c'), LPAD('43', 64, 'd'), -6.2088, 106.8456, 'approved', NOW() - INTERVAL '2 hours');

-- 2 NEW DISPUTES
INSERT INTO disputes (claim_id, hunt_id, reason, verifiers, votes, status, created_at) VALUES
  (2, 5, 'Foto bukti tidak sesuai clue. Metadata GPS beda.', ARRAY['GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M'], '{"v1":true,"v2":false}'::jsonb, 'voting', NOW()),
  (3, 6, 'Hunter klaim sudah solve cipher tapi QR code tidak terbaca.', ARRAY['GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M'], '{"v1":true}'::jsonb, 'resolved', NOW() - INTERVAL '3 hours');

-- 3 NEW COMMUNITY ACTIVITIES
INSERT INTO community_activities (user_pubkey, activity_type, description, metadata, created_at) VALUES
  ('GCK9L2M7PXT5Q8YWF3DJ6VR1BN4ASZGEHUC7MNX9WQK2YJTP5V8RXL6F', 'hunt_created', 'Sita Hider membuat 4 hunt baru di Jakarta Pusat dan Selatan', '{"count":4}'::jsonb, NOW()),
  ('GBH4T6N2XUJ8K3WQMR7F5YL9PZ2VC1DARSB8ETGKW6NHXVJQYUZP3F4M', 'claim_submitted', 'Budi Hunter klaim 3 hunt dalam 2 jam', '{"count":3}'::jsonb, NOW() - INTERVAL '30 minutes'),
  ('GDX3R7VW5BQ8N2YJ6MK1CT4FZP9LAGHUEWS4D6R8N7B2V9C5XQ3ZKJ1M', 'dispute_resolved', 'Veri Master resolve dispute puzzle hunt — hunter menang', '{"dispute_id":3}'::jsonb, NOW() - INTERVAL '3 hours');

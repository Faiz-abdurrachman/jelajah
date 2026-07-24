export {
  supabase,
  getOrCreateUser,
  getActiveHunts,
  getUserHunts,
  getUserClaims,
  subscribeToNewHunts,
  subscribeToNotifications,
  getAllQuests,
  getDisputes,
  getVerifierStats,
  getLeaderboard,
  getCommunityActivities,
  getBrandProfile,
  subscribeToCommunityActivities,
} from "./client";
export type { Database } from "./types";

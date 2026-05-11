import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Trophy, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeaderboardUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalStudyHours: number;
  studyStreak: number;
  ranking: number;
  isFriend: boolean;
  isRival?: boolean;
  studying?: string;
}

// Seed data for demo purposes
const SEED_USERS: LeaderboardUser[] = [
  {
    id: "demo-1",
    displayName: "Alex",
    totalStudyHours: 14,
    studyStreak: 3,
    ranking: 1,
    isFriend: true,
    isRival: true,
    studying: "Physics",
  },
  {
    id: "demo-2",
    displayName: "Jordan",
    totalStudyHours: 12,
    studyStreak: 2,
    ranking: 2,
    isFriend: true,
    isRival: true,
    studying: "Math",
  },
  {
    id: "you",
    displayName: "You",
    totalStudyHours: 12.5,
    studyStreak: 4,
    ranking: 3,
    isFriend: false,
    isRival: false,
    studying: "Biology",
  },
  {
    id: "demo-3",
    displayName: "Casey Williams",
    totalStudyHours: 32.75,
    studyStreak: 5,
    ranking: 3,
    isFriend: false,
  },
  {
    id: "demo-4",
    displayName: "Morgan Davis",
    totalStudyHours: 28.5,
    studyStreak: 3,
    ranking: 4,
    isFriend: false,
  },
  {
    id: "demo-5",
    displayName: "Taylor Johnson",
    totalStudyHours: 22.0,
    studyStreak: 2,
    ranking: 5,
    isFriend: false,
  },
];

const Friends = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(SEED_USERS);
  const [loading, setLoading] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // For now, show seed data
      // In production, this would query the profiles table
      setLeaderboard(SEED_USERS);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendInvite = async () => {
    if (!friendEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setInviteLoading(true);
    try {
      // EmailJS integration would go here
      // For now, just show a toast
      toast.success(`Invitation sent to ${friendEmail}! 🎉`, {
        description: "They'll be added to your friends list once they accept.",
      });
      setFriendEmail("");
    } catch (err) {
      console.error("Failed to send invite:", err);
      toast.error("Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const addFriend = async (friendId: string) => {
    try {
      // In production, this would update a friends table
      setLeaderboard((prev) =>
        prev.map((user) =>
          user.id === friendId ? { ...user, isFriend: true } : user
        )
      );
      toast.success("Friend added! 👋");
    } catch (err) {
      console.error("Failed to add friend:", err);
      toast.error("Failed to add friend");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compete with friends and see who's studying the most
          </p>
        </div>

        {/* Add Friend Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="studymap-card-elevated"
        >
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Add Friends
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Friend's Email
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  disabled={inviteLoading}
                />
                <Button
                  onClick={sendFriendInvite}
                  disabled={inviteLoading || !friendEmail.trim()}
                >
                  {inviteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Send an invite link via email. Once accepted, you'll be able to
              see their study stats!
            </p>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="studymap-card-elevated"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Top Studiers
          </h3>

          <div className="space-y-2">
            {leaderboard.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Ranking */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {user.ranking}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <p className={`font-medium ${user.isRival ? "text-destructive" : "text-foreground"}`}>
                      {user.displayName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        📚 {user.totalStudyHours.toFixed(1)}h
                      </span>
                      <span className="text-xs text-muted-foreground">
                        🔥 {user.studyStreak} day streak
                      </span>
                      {user.studying && (
                        <span className="text-xs font-medium text-primary">Studying: {user.studying}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {user.isFriend ? (
                  <span className="text-xs font-medium text-primary px-3 py-1 rounded-full bg-primary/10">
                    Friend ✓
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Add
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Add {user.displayName}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll be able to see their study stats and compare
                        progress.
                      </AlertDialogDescription>
                      <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => addFriend(user.id)}
                        >
                          Add Friend
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Friends;

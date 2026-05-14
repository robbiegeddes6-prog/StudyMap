import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PRO_MONTHLY_PRICE } from "@/lib/config";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Settings as SettingsIcon,
  LogOut,
  Eye,
  Zap,
  CheckCircle2,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user, signOut, isPremium, setIsPremium } = useAuth();
  const navigate = useNavigate();
  const [visibleOnLeaderboard, setVisibleOnLeaderboard] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { startCheckout, loading: processingPayment } = useStripeCheckout();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (err) {
      console.error("Failed to sign out:", err);
      toast.error("Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  // Handle Stripe success redirect: ?upgraded=true
  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") return;

    // Clear the param immediately so refresh doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete("upgraded");
    setSearchParams(next, { replace: true });

    // Update Supabase profile
    if (user?.id) {
      supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("Failed to update profile:", error.message);
        });
    }

    // Update local auth state + localStorage
    setIsPremium(true);
    localStorage.setItem("studybuddy_is_premium", "true");

    toast.success("🎉 Welcome to StudyMap Pro!", {
      description: "You now have access to all premium features.",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubscribe = async () => {
    if (isPremium) {
      toast.info("You're already a Pro member!");
      return;
    }
    try {
      await startCheckout();
    } catch {
      toast.error("Couldn't start checkout. Please try again.");
    }
  };

  const SettingItem = ({
    icon: Icon,
    title,
    description,
    children,
    delay = 0,
  }: {
    icon: typeof SettingsIcon;
    title: string;
    description: string;
    children: React.ReactNode;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="studymap-card-elevated"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Account Info */}
        <SettingItem
          icon={SettingsIcon}
          title="Account"
          description={user?.email || "No email"}
          delay={0}
        >
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground truncate max-w-xs">
              {user?.email}
            </p>
          </div>
        </SettingItem>

        {/* Leaderboard Visibility */}
        <SettingItem
          icon={Eye}
          title="Leaderboard Visibility"
          description="Show your study stats on the leaderboard"
          delay={0.1}
        >
          <Switch
            checked={visibleOnLeaderboard}
            onCheckedChange={setVisibleOnLeaderboard}
          />
        </SettingItem>

        {/* Subscription Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="studymap-card-elevated border-primary/20 bg-primary/5"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Subscription</h3>
                {isPremium && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isPremium
                  ? "You have access to all AI features including Quick Add, Auto Scheduler, and File Upload."
                  : "Upgrade to unlock AI-powered study scheduling, Quick Add, and file analysis."}
              </p>

              {!isPremium && (
                <div className="bg-white/5 rounded-lg p-3 mb-4 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Free Plan Includes:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Basic study timer
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Task management
                    </li>
                    <li className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-muted-foreground" />
                      AI features (limited)
                    </li>
                  </ul>
                </div>
              )}

              {isPremium && (
                <div className="bg-white/5 rounded-lg p-3 mb-4 border border-primary/50">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Premium Features:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Advanced study timer with analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Quick Add with AI parsing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Auto study scheduler
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      File upload & analysis
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-4">
              <div className="text-right mb-4">
                <p className="text-2xl font-bold text-foreground">
                  {PRO_MONTHLY_PRICE}
                  <span className="text-sm text-muted-foreground font-normal">/mo</span>
                </p>
              </div>

              {isPremium ? (
                <Button disabled className="w-full bg-primary/20 text-primary border border-primary/30">
                  <Star className="w-4 h-4 mr-2" />
                  Pro Member ✓
                </Button>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  disabled={processingPayment}
                  className="w-full"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <SettingItem
          icon={LogOut}
          title="Sign Out"
          description="End your current session"
          delay={0.3}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Sign Out?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll be logged out of your StudyMap account. You can sign back in anytime.
              </AlertDialogDescription>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing Out...
                    </>
                  ) : (
                    "Sign Out"
                  )}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </SettingItem>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="studymap-card-elevated border-border/50"
        >
          <div>
            <h3 className="font-semibold text-foreground mb-2">About StudyMap</h3>
            <p className="text-sm text-muted-foreground mb-3">
              StudyMap is an AI-powered study planner that helps you schedule smarter, study harder,
              and never miss a deadline.
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Version: 1.0.0</p>
              <p>© 2026 StudyMap. All rights reserved.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

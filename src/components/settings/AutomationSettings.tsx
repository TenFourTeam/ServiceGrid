import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Mail, Users, Save, TestTube, Info, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { AutomationActivityLog } from "./AutomationActivityLog";

interface AutomationSettingsData {
  id: string;
  business_id: string;
  auto_score_leads: boolean;
  lead_score_threshold: number;
  auto_send_welcome_email: boolean;
  welcome_email_delay_minutes: number;
  auto_assign_leads: boolean;
  assignment_method: string;
  // Communication automation settings
  auto_create_conversations: boolean;
  auto_send_job_updates: boolean;
  auto_send_followup_email: boolean;
  followup_email_delay_hours: number;
}

export function AutomationSettings() {
  const { businessId } = useBusinessContext();
  const [settings, setSettings] = useState<AutomationSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchSettings();
    }
  }, [businessId]);

  const fetchSettings = async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("automation_settings")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings exist yet, create defaults
          const { data: newData, error: insertError } = await supabase
            .from("automation_settings")
            .insert({ business_id: businessId })
            .select()
            .single();
          
          if (insertError) throw insertError;
          setSettings(newData);
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error("Error fetching automation settings:", error);
      toast.error("Failed to load automation settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !businessId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("automation_settings")
        .update({
          auto_score_leads: settings.auto_score_leads,
          lead_score_threshold: settings.lead_score_threshold,
          auto_send_welcome_email: settings.auto_send_welcome_email,
          welcome_email_delay_minutes: settings.welcome_email_delay_minutes,
          auto_assign_leads: settings.auto_assign_leads,
          assignment_method: settings.assignment_method,
          auto_create_conversations: settings.auto_create_conversations,
          auto_send_job_updates: settings.auto_send_job_updates,
          auto_send_followup_email: settings.auto_send_followup_email,
          followup_email_delay_hours: settings.followup_email_delay_hours,
          updated_at: new Date().toISOString()
        })
        .eq("business_id", businessId);

      if (error) throw error;
      
      toast.success("Automation settings saved");
    } catch (error: any) {
      console.error("Error saving automation settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const enableTestMode = async () => {
    if (!settings) return;
    
    const testSettings = {
      ...settings,
      auto_score_leads: true,
      auto_send_welcome_email: true,
      welcome_email_delay_minutes: 1, // Quick for testing
      auto_assign_leads: true,
      assignment_method: 'workload'
    };
    setSettings(testSettings);
    
    // Save immediately
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("automation_settings")
        .update({
          auto_score_leads: true,
          lead_score_threshold: settings.lead_score_threshold,
          auto_send_welcome_email: true,
          welcome_email_delay_minutes: 1,
          auto_assign_leads: true,
          assignment_method: 'workload',
          updated_at: new Date().toISOString()
        })
        .eq("business_id", businessId);

      if (error) throw error;
      toast.success("Test mode enabled - all automation active with 1-minute email delay");
    } catch (error: any) {
      console.error("Error enabling test mode:", error);
      toast.error("Failed to enable test mode");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load automation settings
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Lead Scoring
          </CardTitle>
          <CardDescription>
            Automatically score and qualify leads based on data completeness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-score">Auto-score leads</Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate lead scores when customers are created or updated
              </p>
            </div>
            <Switch
              id="auto-score"
              checked={settings.auto_score_leads}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_score_leads: checked })
              }
            />
          </div>
          
          {settings.auto_score_leads && (
            <div className="space-y-2">
              <Label htmlFor="score-threshold">Qualification threshold (0-100)</Label>
              <Input
                id="score-threshold"
                type="number"
                min={0}
                max={100}
                value={settings.lead_score_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lead_score_threshold: parseInt(e.target.value) || 0
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Leads scoring above this threshold will be automatically marked as qualified
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welcome Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Welcome Emails
          </CardTitle>
          <CardDescription>
            Automatically send welcome emails to new customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-email">Auto-send welcome emails</Label>
              <p className="text-sm text-muted-foreground">
                Send a personalized welcome email when new customers are created
              </p>
            </div>
            <Switch
              id="auto-email"
              checked={settings.auto_send_welcome_email}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_send_welcome_email: checked })
              }
            />
          </div>
          
          {settings.auto_send_welcome_email && (
            <div className="space-y-2">
              <Label htmlFor="email-delay">Delay before sending (minutes)</Label>
              <Input
                id="email-delay"
                type="number"
                min={0}
                max={1440}
                value={settings.welcome_email_delay_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    welcome_email_delay_minutes: parseInt(e.target.value) || 0
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Wait this many minutes before sending (allows time for data entry)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Lead Assignment
          </CardTitle>
          <CardDescription>
            Automatically assign new requests to team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-assign">Auto-assign leads</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign new service requests to available team members
              </p>
            </div>
            <Switch
              id="auto-assign"
              checked={settings.auto_assign_leads}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_assign_leads: checked })
              }
            />
          </div>
          
          {settings.auto_assign_leads && (
            <div className="space-y-2">
              <Label htmlFor="assignment-method">Assignment method</Label>
              <Select
                value={settings.assignment_method}
                onValueChange={(value) =>
                  setSettings({ ...settings, assignment_method: value })
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workload">
                    Workload Balancing
                  </SelectItem>
                  <SelectItem value="round_robin">
                    Round Robin
                  </SelectItem>
                  <SelectItem value="territory">
                    Territory-based
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {settings.assignment_method === 'workload' && 
                  "Assigns to the team member with the fewest jobs this week"}
                {settings.assignment_method === 'round_robin' && 
                  "Rotates assignments evenly among team members"}
                {settings.assignment_method === 'territory' && 
                  "Assigns based on customer location (requires territory setup)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            Communication Automation
          </CardTitle>
          <CardDescription>
            Automatically manage customer communications and follow-ups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-conversations">Auto-create conversations</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a conversation thread when new service requests are submitted
              </p>
            </div>
            <Switch
              id="auto-conversations"
              checked={settings.auto_create_conversations}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_create_conversations: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-job-updates">Auto-send job status updates</Label>
              <p className="text-sm text-muted-foreground">
                Notify customers when job status changes (en route, in progress, completed)
              </p>
            </div>
            <Switch
              id="auto-job-updates"
              checked={settings.auto_send_job_updates}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_send_job_updates: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-followup">Auto-send follow-up emails</Label>
              <p className="text-sm text-muted-foreground">
                Queue a follow-up email after job completion to request feedback
              </p>
            </div>
            <Switch
              id="auto-followup"
              checked={settings.auto_send_followup_email}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_send_followup_email: checked })
              }
            />
          </div>

          {settings.auto_send_followup_email && (
            <div className="space-y-2">
              <Label htmlFor="followup-delay">Follow-up delay (hours)</Label>
              <Input
                id="followup-delay"
                type="number"
                min={1}
                max={168}
                value={settings.followup_email_delay_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    followup_email_delay_hours: parseInt(e.target.value) || 24
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Wait this many hours after job completion before sending follow-up
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Info className="h-5 w-5" />
            How to Test Lead Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
            <li>Enable all automation settings above (or use "Enable Test Mode")</li>
            <li>Go to Requests → click "Share Request Form" to get your public form link</li>
            <li>Submit a test request with a real email address</li>
            <li>Watch the Automation Activity section below for scoring, assignment, and email events</li>
            <li>Check the Customers page for lead score display</li>
            <li>Check the Requests page for auto-assignment</li>
          </ol>
        </CardContent>
      </Card>

      {/* Automation Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Automation Activity
          </CardTitle>
          <CardDescription>
            Recent automated actions (last 24 hours)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationActivityLog />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={enableTestMode} disabled={isSaving}>
          <TestTube className="mr-2 h-4 w-4" />
          Enable Test Mode
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

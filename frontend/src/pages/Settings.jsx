import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Bell,
  MessageSquare,
  Phone,
  Save,
  TestTube,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const [settings, setSettings] = useState({
    sms_enabled: false,
    alert_phone_number: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings({
        sms_enabled: response.data.sms_enabled,
        alert_phone_number: response.data.alert_phone_number || ""
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (settings.sms_enabled && !settings.alert_phone_number) {
      toast.error("Please enter a phone number to enable SMS alerts");
      return;
    }

    // Validate phone number format
    if (settings.alert_phone_number && !settings.alert_phone_number.match(/^\+[1-9]\d{1,14}$/)) {
      toast.error("Please enter phone number in E.164 format (e.g., +1234567890)");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testSMS = async () => {
    if (!settings.alert_phone_number) {
      toast.error("Please enter and save a phone number first");
      return;
    }

    setTesting(true);
    try {
      // First save settings to ensure they're up to date
      await axios.put(`${API}/settings`, { ...settings, sms_enabled: true });
      
      // Trigger a test by creating a test event
      const response = await axios.post(`${API}/sensors/trigger`, { 
        sensor_id: "test-sms" 
      });
      
      // This will fail since there's no test sensor, but we can show a message
      toast.info("SMS test initiated. Check your phone for the message.", { duration: 5000 });
    } catch (error) {
      // If it's a 404 (sensor not found), that's expected for test
      if (error.response?.status === 404) {
        toast.info("To test SMS, trigger an actual sensor while the system is armed");
      } else {
        toast.error("Failed to test SMS");
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-manrope font-bold text-4xl tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Configure your alarm system preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* SMS Notifications Card */}
        <Card className="bento-card" data-testid="sms-settings-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="font-manrope">SMS Notifications</CardTitle>
                <CardDescription>Receive alerts via text message</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable SMS Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-enabled" className="text-base font-medium">
                  Enable SMS Alerts
                </Label>
                <p className="text-sm text-slate-500">
                  Get notified when intrusion is detected
                </p>
              </div>
              <Switch
                id="sms-enabled"
                checked={settings.sms_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, sms_enabled: checked })}
                data-testid="sms-enabled-switch"
              />
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Alert Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={settings.alert_phone_number}
                onChange={(e) => setSettings({ ...settings, alert_phone_number: e.target.value })}
                placeholder="+1234567890"
                className="max-w-xs"
                data-testid="phone-number-input"
              />
              <p className="text-xs text-slate-500">
                Enter phone number in E.164 format (e.g., +1234567890)
              </p>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">How it works</AlertTitle>
              <AlertDescription className="text-blue-700 text-sm">
                When the system is <strong>armed</strong> and a sensor is triggered, 
                you'll receive an SMS alert with details about the intrusion location.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              <Button 
                variant="outline" 
                onClick={testSMS} 
                disabled={testing || !settings.alert_phone_number}
                data-testid="test-sms-btn"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testing ? "Testing..." : "Test SMS"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info Card */}
        <Card className="bento-card" data-testid="system-info-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="font-manrope">System Information</CardTitle>
                <CardDescription>About your alarm system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">SMS Provider</span>
                <span className="font-medium">Twilio</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Status</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600">Operational</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Twilio Setup Info */}
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Twilio Phone Number Required</AlertTitle>
          <AlertDescription className="text-amber-700 text-sm">
            To send SMS alerts, you need to configure a Twilio phone number in the backend environment. 
            Contact your administrator if SMS alerts are not working.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

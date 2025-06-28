import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Database, 
  Shield, 
  Bell,
  Globe,
  Key,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  companyEmail: string;
  companyName: string;
}

interface GoogleSettings {
  clientId: string;
  clientSecret: string;
  spreadsheetId: string;
  folderId: string;
}

const Settings = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    companyEmail: '',
    companyName: ''
  });
  
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings>({
    clientId: '',
    clientSecret: '',
    spreadsheetId: '',
    folderId: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testGoogleStatus, setTestGoogleStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [emailResponse, googleResponse] = await Promise.all([
        axios.get('/settings/email'),
        axios.get('/settings/google')
      ]);
      
      if (emailResponse.data.settings) {
        setEmailSettings(emailResponse.data.settings);
      }
      
      if (googleResponse.data.settings) {
        setGoogleSettings(googleResponse.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      setLoading(true);
      await axios.post('/settings/email', emailSettings);
      
      toast({
        title: "Success",
        description: "Email settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveGoogleSettings = async () => {
    try {
      setLoading(true);
      await axios.post('/settings/google', googleSettings);
      
      toast({
        title: "Success",
        description: "Google settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving Google settings:', error);
      toast({
        title: "Error",
        description: "Failed to save Google settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      setTestEmailStatus('testing');
      await axios.post('/settings/test-email', emailSettings);
      
      setTestEmailStatus('success');
      toast({
        title: "Success",
        description: "Email connection test successful",
      });
    } catch (error) {
      console.error('Error testing email connection:', error);
      setTestEmailStatus('error');
      toast({
        title: "Error",
        description: "Email connection test failed",
        variant: "destructive",
      });
    }
  };

  const testGoogleConnection = async () => {
    try {
      setTestGoogleStatus('testing');
      await axios.post('/settings/test-google', googleSettings);
      
      setTestGoogleStatus('success');
      toast({
        title: "Success",
        description: "Google connection test successful",
      });
    } catch (error) {
      console.error('Error testing Google connection:', error);
      setTestGoogleStatus('error');
      toast({
        title: "Error",
        description: "Google connection test failed",
        variant: "destructive",
      });
    }
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure system settings and integrations
          </p>
        </div>
      </div>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure SMTP settings for sending automated emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.gmail.com"
                value={emailSettings.smtpHost}
                onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                placeholder="587"
                value={emailSettings.smtpPort}
                onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpUser">SMTP Username</Label>
              <Input
                id="smtpUser"
                placeholder="your-email@gmail.com"
                value={emailSettings.smtpUser}
                onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="smtpPass">SMTP Password</Label>
              <Input
                id="smtpPass"
                type="password"
                placeholder="App password"
                value={emailSettings.smtpPass}
                onChange={(e) => setEmailSettings({...emailSettings, smtpPass: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                placeholder="hr@yourcompany.com"
                value={emailSettings.companyEmail}
                onChange={(e) => setEmailSettings({...emailSettings, companyEmail: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Your Company Name"
                value={emailSettings.companyName}
                onChange={(e) => setEmailSettings({...emailSettings, companyName: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={saveEmailSettings} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Save Email Settings
            </Button>
            <Button variant="outline" onClick={testEmailConnection} disabled={loading}>
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
            {getTestStatusIcon(testEmailStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Google Sheets Integration
          </CardTitle>
          <CardDescription>
            Configure Google Sheets API for data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Google OAuth Client ID"
                value={googleSettings.clientId}
                onChange={(e) => setGoogleSettings({...googleSettings, clientId: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Google OAuth Client Secret"
                value={googleSettings.clientSecret}
                onChange={(e) => setGoogleSettings({...googleSettings, clientSecret: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spreadsheetId">Default Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={googleSettings.spreadsheetId}
                onChange={(e) => setGoogleSettings({...googleSettings, spreadsheetId: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="folderId">Google Drive Folder ID</Label>
              <Input
                id="folderId"
                placeholder="Google Drive Folder ID"
                value={googleSettings.folderId}
                onChange={(e) => setGoogleSettings({...googleSettings, folderId: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={saveGoogleSettings} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Save Google Settings
            </Button>
            <Button variant="outline" onClick={testGoogleConnection} disabled={loading}>
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
            {getTestStatusIcon(testGoogleStatus)}
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            General system configuration and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive email notifications for system events</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Backup</Label>
                <p className="text-sm text-gray-500">Automatically backup data to Google Drive</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Debug Mode</Label>
                <p className="text-sm text-gray-500">Enable detailed logging for troubleshooting</p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure security and access control settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">Require 2FA for all user accounts</p>
              </div>
              <Switch />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Session Timeout</Label>
                <p className="text-sm text-gray-500">Automatically log out inactive users</p>
              </div>
              <Select defaultValue="8">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>API Rate Limiting</Label>
                <p className="text-sm text-gray-500">Limit API requests to prevent abuse</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings; 
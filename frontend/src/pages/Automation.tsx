import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { 
  Play, 
  Pause, 
  Settings as SettingsIcon, 
  Clock,
  Calendar,
  Mail,
  FileText,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap
} from "lucide-react";

interface Automation {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'document' | 'payroll' | 'reminder';
  status: 'active' | 'inactive' | 'error';
  schedule: string;
  lastRun: string;
  nextRun: string;
  trigger: string;
  actions: string[];
}

const Automation = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/automation');
      setAutomations(response.data.automations || []);
    } catch (error) {
      console.error('Error fetching automations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await axios.put(`/automation/${id}/toggle`, { status: newStatus });
      
      toast({
        title: "Success",
        description: `Automation ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: "Error",
        description: "Failed to toggle automation",
        variant: "destructive",
      });
    }
  };

  const runAutomation = async (id: string) => {
    try {
      await axios.post(`/automation/${id}/run`);
      
      toast({
        title: "Success",
        description: "Automation started successfully",
      });
      
      fetchAutomations();
    } catch (error) {
      console.error('Error running automation:', error);
      toast({
        title: "Error",
        description: "Failed to run automation",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-600" />;
      case 'document':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'payroll':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <Zap className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automation</h2>
          <p className="text-muted-foreground">
            Manage automated HR workflows and processes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{automations.length}</p>
                <p className="text-sm text-gray-600">Total Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {automations.filter(auto => auto.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {automations.filter(auto => {
                    const lastRun = new Date(auto.lastRun);
                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - lastRun.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 1;
                  }).length}
                </p>
                <p className="text-sm text-gray-600">Ran Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {automations.filter(auto => auto.status === 'error').length}
                </p>
                <p className="text-sm text-gray-600">With Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Automations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Welcome emails</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payroll notifications</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Document reminders</span>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Document Workflows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Contract generation</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Invoice processing</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Report generation</span>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Scheduled Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Monthly payroll</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Benefits calculation</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data backup</span>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Workflows</CardTitle>
          <CardDescription>
            Manage your automated HR processes and workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading automations...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{automation.name}</div>
                        <div className="text-sm text-gray-500">{automation.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getTypeIcon(automation.type)}
                        <span className="ml-2 capitalize">{automation.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(automation.status)}
                    </TableCell>
                    <TableCell>{automation.schedule}</TableCell>
                    <TableCell>
                      {automation.lastRun ? new Date(automation.lastRun).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {automation.nextRun ? new Date(automation.nextRun).toLocaleDateString() : 'Not scheduled'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => runAutomation(automation.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAutomation(automation.id, automation.status)}
                        >
                          {automation.status === 'active' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Automation; 
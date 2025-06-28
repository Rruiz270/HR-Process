import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calculator, 
  Mail, 
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const quickStats = [
    { title: "Pending Invoices", value: "12", icon: FileText, color: "text-orange-600" },
    { title: "Processed Payrolls", value: "45", icon: Calculator, color: "text-green-600" },
    { title: "Emails Sent", value: "128", icon: Mail, color: "text-blue-600" },
    { title: "Active Employees", value: "67", icon: Users, color: "text-purple-600" },
  ];

  const upcomingTasks = [
    { date: "1st", task: "Send invoice request emails", status: "pending" },
    { date: "4th", task: "Send invoice consolidation", status: "pending" },
    { date: "23rd", task: "Prepare VT/VR benefits", status: "upcoming" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to HR Management System</h1>
            <p className="text-gray-600">Automated document processing and payroll management</p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Task
            </Button>
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className={`p-3 rounded-full bg-gray-100 mr-4 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Main HR Processes
              </CardTitle>
              <CardDescription>
                Manage your key HR workflows and processes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/invoices" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300">
                  <CardContent className="flex items-center p-6">
                    <FileText className="h-8 w-8 text-blue-600 mr-4" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Invoice Management</h3>
                      <p className="text-sm text-gray-600">Track and process invoices</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/payroll" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-300">
                  <CardContent className="flex items-center p-6">
                    <Calculator className="h-8 w-8 text-green-600 mr-4" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Payroll Management</h3>
                      <p className="text-sm text-gray-600">Calculate and process payroll</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/benefits" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-purple-300">
                  <CardContent className="flex items-center p-6">
                    <Users className="h-8 w-8 text-purple-600 mr-4" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Benefits (VT/VR)</h3>
                      <p className="text-sm text-gray-600">Manage employee benefits</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/emails" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-orange-300">
                  <CardContent className="flex items-center p-6">
                    <Mail className="h-8 w-8 text-orange-600 mr-4" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Email Templates</h3>
                      <p className="text-sm text-gray-600">Manage email communications</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Monthly Schedule
              </CardTitle>
              <CardDescription>
                Key dates and upcoming tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-shrink-0">
                    {task.status === 'pending' ? (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Day {task.date}</p>
                    <p className="text-sm text-gray-600">{task.task}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Upload Invoice
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Payroll
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Send Bulk Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

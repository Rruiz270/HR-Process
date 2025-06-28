
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  Download, 
  Upload,
  DollarSign,
  Users,
  FileSpreadsheet,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Payroll = () => {
  const { toast } = useToast();
  const [payrollData, setPayrollData] = useState([
    { id: 1, name: "Lucas Menezes", role: "Designer", type: "PJ", baseValue: 3500, finalValue: 3500, status: "calculated" },
    { id: 2, name: "Maria Silva", role: "Developer", type: "CLT", baseValue: 5000, finalValue: 4200, status: "pending" },
    { id: 3, name: "João Santos", role: "Manager", type: "PJ", baseValue: 8000, finalValue: 8000, status: "approved" },
  ]);

  const handleCalculatePayroll = () => {
    toast({
      title: "Payroll Calculated",
      description: "All payroll calculations have been updated",
    });
  };

  const handleExportSpreadsheet = () => {
    toast({
      title: "Spreadsheet Exported",
      description: "Payroll data exported to Google Sheets",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
              <p className="text-gray-600">Calculate and process employee payments</p>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={handleExportSpreadsheet}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Sheets
              </Button>
              <Button onClick={handleCalculatePayroll}>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate All
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Month</TabsTrigger>
            <TabsTrigger value="calculator">Payroll Calculator</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="flex items-center p-6">
                  <Users className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">67</p>
                    <p className="text-sm text-gray-600">Total Employees</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center p-6">
                  <DollarSign className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">R$ 45K</p>
                    <p className="text-sm text-gray-600">Total PJ</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center p-6">
                  <Calculator className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">R$ 78K</p>
                    <p className="text-sm text-gray-600">Total CLT</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center p-6">
                  <FileSpreadsheet className="h-8 w-8 text-orange-600 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">R$ 123K</p>
                    <p className="text-sm text-gray-600">Grand Total</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payroll Table */}
            <Card>
              <CardHeader>
                <CardTitle>June 2024 Payroll</CardTitle>
                <CardDescription>Employee payment calculations and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payrollData.map((employee) => (
                    <Card key={employee.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                            <p className="text-sm text-gray-600">{employee.role} • {employee.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <p className="font-semibold">R$ {employee.finalValue.toLocaleString()}</p>
                            {employee.baseValue !== employee.finalValue && (
                              <p className="text-sm text-gray-500 line-through">R$ {employee.baseValue.toLocaleString()}</p>
                            )}
                          </div>
                          
                          <Badge variant={employee.status === 'approved' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Calculator className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="mr-1 h-3 w-3" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Calculator</CardTitle>
                <CardDescription>Calculate individual or bulk payroll amounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="employee-name">Employee Name</Label>
                      <Input id="employee-name" placeholder="Enter employee name" />
                    </div>
                    <div>
                      <Label htmlFor="base-salary">Base Salary</Label>
                      <Input id="base-salary" type="number" placeholder="Enter base salary" />
                    </div>
                    <div>
                      <Label htmlFor="worked-days">Days Worked</Label>
                      <Input id="worked-days" type="number" placeholder="Enter days worked" />
                    </div>
                    <div>
                      <Label htmlFor="bonuses">Bonuses/Additions</Label>
                      <Input id="bonuses" type="number" placeholder="Enter bonus amount" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deductions">Deductions</Label>
                      <Input id="deductions" type="number" placeholder="Enter deductions" />
                    </div>
                    <div>
                      <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                      <Input id="tax-rate" type="number" placeholder="Enter tax rate" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <Label className="text-lg font-semibold">Calculated Total</Label>
                      <p className="text-2xl font-bold text-blue-600">R$ 0.00</p>
                    </div>
                    <Button className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Save Calculation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Reports</CardTitle>
                <CardDescription>Generate and download payroll reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Download className="h-6 w-6 mb-2" />
                    Monthly Report
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <FileSpreadsheet className="h-6 w-6 mb-2" />
                    Tax Summary
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Employee Summary
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Calculator className="h-6 w-6 mb-2" />
                    Cost Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Payroll;

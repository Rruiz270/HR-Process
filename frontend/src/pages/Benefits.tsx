import React, { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { CalendarIcon, Upload, Download, Send, CheckCircle, AlertCircle, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../hooks/use-toast';

interface Benefit {
  _id: string;
  employeeId: string;
  month: string;
  year: number;
  valeRefeicao: {
    enabled: boolean;
    dailyValue: number;
    businessDays: number;
    saturdays: number;
    totalDays: number;
    totalAmount: number;
    deductions: Array<{
      date: string;
      amount: number;
      reason: string;
      type: string;
    }>;
    finalAmount: number;
    scheduleFile?: {
      url: string;
      uploadedAt: string;
    };
  };
  valeTransporte: {
    enabled: boolean;
    fixedAmount: number;
    dailyValue: number;
    totalDays: number;
    totalAmount: number;
    deductions: Array<{
      date: string;
      amount: number;
      reason: string;
      type: string;
    }>;
    finalAmount: number;
    addressChanged: boolean;
  };
  mobilidade: {
    enabled: boolean;
    monthlyValue: number;
  };
  paymentStatus: 'Pending' | 'Calculated' | 'Approved' | 'Paid' | 'Cancelled';
  paymentMethod: string;
  flashPayment: {
    sent: boolean;
    sentAt?: string;
    flashReference?: string;
    flashStatus: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  };
  employeeData?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
    position: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  totalVR: number;
  totalVT: number;
  totalMobilidade: number;
  totalAmount: number;
  employeeCount: number;
  pendingCount: number;
  calculatedCount: number;
  approvedCount: number;
  paidCount: number;
}

const Benefits: React.FC = () => {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [deductionData, setDeductionData] = useState({
    benefitType: 'VR',
    date: new Date(),
    amount: 0,
    reason: '',
    type: 'Absence'
  });
  const [scheduleData, setScheduleData] = useState({
    businessDays: 22,
    saturdays: 0,
    file: null as File | null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBenefits();
    fetchStatistics();
  }, [selectedMonth, selectedYear]);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/benefits/month/${selectedMonth}/${selectedYear}`);
      setBenefits(response.data.benefits);
    } catch (error) {
      console.error('Error fetching benefits:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar benefícios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`/benefits/statistics/${selectedMonth}/${selectedYear}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCalculateBenefit = async (benefit: Benefit) => {
    try {
      await axios.post('/benefits/calculate', {
        employeeId: benefit.employeeId,
        month: selectedMonth,
        year: selectedYear,
        valeRefeicao: benefit.valeRefeicao,
        valeTransporte: benefit.valeTransporte,
        mobilidade: benefit.mobilidade
      });
      
      toast({
        title: "Sucesso",
        description: "Benefício calculado com sucesso"
      });
      
      fetchBenefits();
    } catch (error) {
      console.error('Error calculating benefit:', error);
      toast({
        title: "Erro",
        description: "Falha ao calcular benefício",
        variant: "destructive"
      });
    }
  };

  const handleAddDeduction = async () => {
    if (!selectedBenefit) return;
    
    try {
      await axios.post('/benefits/deduction', {
        benefitId: selectedBenefit._id,
        benefitType: deductionData.benefitType,
        date: deductionData.date.toISOString(),
        amount: deductionData.amount,
        reason: deductionData.reason,
        type: deductionData.type
      });
      
      toast({
        title: "Sucesso",
        description: "Dedução adicionada com sucesso"
      });
      
      setShowDeductionDialog(false);
      setDeductionData({
        benefitType: 'VR',
        date: new Date(),
        amount: 0,
        reason: '',
        type: 'Absence'
      });
      fetchBenefits();
    } catch (error) {
      console.error('Error adding deduction:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar dedução",
        variant: "destructive"
      });
    }
  };

  const handleUploadSchedule = async () => {
    if (!selectedBenefit || !scheduleData.file) return;
    
    try {
      const formData = new FormData();
      formData.append('schedule', scheduleData.file);
      formData.append('employeeId', selectedBenefit.employeeId);
      formData.append('month', selectedMonth.toString());
      formData.append('year', selectedYear.toString());
      formData.append('businessDays', scheduleData.businessDays.toString());
      formData.append('saturdays', scheduleData.saturdays.toString());
      
      await axios.post('/benefits/upload-schedule', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast({
        title: "Sucesso",
        description: "Cronograma enviado com sucesso"
      });
      
      setShowScheduleDialog(false);
      setScheduleData({
        businessDays: 22,
        saturdays: 0,
        file: null
      });
      fetchBenefits();
    } catch (error) {
      console.error('Error uploading schedule:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar cronograma",
        variant: "destructive"
      });
    }
  };

  const handleApproveBenefits = async (benefitIds: string[]) => {
    try {
      await axios.post('/benefits/approve', { benefitIds });
      
      toast({
        title: "Sucesso",
        description: `${benefitIds.length} benefícios aprovados`
      });
      
      fetchBenefits();
    } catch (error) {
      console.error('Error approving benefits:', error);
      toast({
        title: "Erro",
        description: "Falha ao aprovar benefícios",
        variant: "destructive"
      });
    }
  };

  const handleSendToFlash = async (benefitIds: string[]) => {
    try {
      const response = await axios.post('/benefits/send-to-flash', { benefitIds });
      
      toast({
        title: "Sucesso",
        description: `${response.data.sentCount} benefícios enviados para Flash`
      });
      
      fetchBenefits();
    } catch (error) {
      console.error('Error sending to Flash:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar para Flash",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      Calculated: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      Approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      Paid: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      Cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando benefícios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Benefícios</h1>
          <p className="text-muted-foreground">
            Gerencie VR, VT e outros benefícios dos funcionários CLT
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {format(new Date(2024, month - 1), 'MMMM', { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total VR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalVR)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total VT</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalVT)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalAmount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.employeeCount}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.approvedCount} aprovados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="benefits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="benefits">Benefícios</TabsTrigger>
          <TabsTrigger value="flash">Flash Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Benefícios</CardTitle>
              <CardDescription>
                Benefícios para {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>VR</TableHead>
                    <TableHead>VT</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flash</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((benefit) => (
                    <TableRow key={benefit._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {benefit.employeeData?.firstName} {benefit.employeeData?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {benefit.employeeData?.department} • {benefit.employeeData?.employeeId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatCurrency(benefit.valeRefeicao.finalAmount)}</div>
                          <div className="text-muted-foreground">
                            {benefit.valeRefeicao.businessDays + benefit.valeRefeicao.saturdays} dias
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatCurrency(benefit.valeTransporte.finalAmount)}</div>
                          <div className="text-muted-foreground">
                            {benefit.valeTransporte.fixedAmount > 0 ? 'Valor fixo' : `${benefit.valeTransporte.totalDays} dias`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(
                          benefit.valeRefeicao.finalAmount + 
                          benefit.valeTransporte.finalAmount + 
                          benefit.mobilidade.monthlyValue
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(benefit.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {benefit.flashPayment.sent ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Send className="w-3 h-3 mr-1" />
                            Enviado
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBenefit(benefit);
                              setShowDeductionDialog(true);
                            }}
                          >
                            Dedução
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBenefit(benefit);
                              setShowScheduleDialog(true);
                            }}
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Cronograma
                          </Button>
                          {benefit.paymentStatus === 'Pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleCalculateBenefit(benefit)}
                            >
                              Calcular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flash" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integração Flash</CardTitle>
              <CardDescription>
                Envie benefícios aprovados para pagamento via Flash
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      const approvedBenefits = benefits.filter(b => b.paymentStatus === 'Approved');
                      if (approvedBenefits.length > 0) {
                        handleApproveBenefits(approvedBenefits.map(b => b._id));
                      }
                    }}
                    disabled={benefits.filter(b => b.paymentStatus === 'Calculated').length === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar Calculados
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const approvedBenefits = benefits.filter(b => 
                        b.paymentStatus === 'Approved' && !b.flashPayment.sent
                      );
                      if (approvedBenefits.length > 0) {
                        handleSendToFlash(approvedBenefits.map(b => b._id));
                      }
                    }}
                    disabled={benefits.filter(b => b.paymentStatus === 'Approved' && !b.flashPayment.sent).length === 0}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Flash
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {benefits.filter(b => b.paymentStatus === 'Approved' && !b.flashPayment.sent).length} benefícios prontos para envio
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deduction Dialog */}
      <Dialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Dedução</DialogTitle>
            <DialogDescription>
              Adicione uma dedução para {selectedBenefit?.employeeData?.firstName} {selectedBenefit?.employeeData?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select value={deductionData.benefitType} onValueChange={(value) => setDeductionData({...deductionData, benefitType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VR">Vale Refeição</SelectItem>
                  <SelectItem value="VT">Vale Transporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deductionData.date ? format(deductionData.date, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deductionData.date}
                    onSelect={(date) => date && setDeductionData({...deductionData, date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={deductionData.amount}
                onChange={(e) => setDeductionData({...deductionData, amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={deductionData.reason}
                onChange={(e) => setDeductionData({...deductionData, reason: e.target.value})}
                placeholder="Ex: Falta não justificada"
              />
            </div>
            
            <div>
              <Label>Tipo</Label>
              <Select value={deductionData.type} onValueChange={(value) => setDeductionData({...deductionData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Absence">Falta</SelectItem>
                  <SelectItem value="Holiday">Feriado</SelectItem>
                  <SelectItem value="Vacation">Férias</SelectItem>
                  <SelectItem value="Other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeductionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddDeduction}>
              Adicionar Dedução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Upload Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Cronograma</DialogTitle>
            <DialogDescription>
              Faça upload do cronograma de trabalho para {selectedBenefit?.employeeData?.firstName} {selectedBenefit?.employeeData?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Dias úteis</Label>
              <Input
                type="number"
                value={scheduleData.businessDays}
                onChange={(e) => setScheduleData({...scheduleData, businessDays: parseInt(e.target.value) || 0})}
                placeholder="22"
              />
            </div>
            
            <div>
              <Label>Sábados</Label>
              <Input
                type="number"
                value={scheduleData.saturdays}
                onChange={(e) => setScheduleData({...scheduleData, saturdays: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Arquivo do Cronograma</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={(e) => setScheduleData({...scheduleData, file: e.target.files?.[0] || null})}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: Excel, CSV, PDF (máx. 5MB)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUploadSchedule} disabled={!scheduleData.file}>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Cronograma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Benefits;

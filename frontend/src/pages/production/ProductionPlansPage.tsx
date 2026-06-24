import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, CheckCircle, Trash2, Cake, List, CalendarDays } from 'lucide-react';
import { productionApi, productsApi } from '../../api/client';
import { getStoredUser } from '../../hooks/useAuth';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ProductionCalendarView from './ProductionCalendarView';
import { format } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', CONFIRMED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
};

function PlanForm({ plan, products, onSubmit, onClose }: any) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: plan || { planDate: new Date().toISOString().split('T')[0], lines: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Plan Date *</label>
          <input {...register('planDate', { required: true })} type="date" className="input" />
        </div>
        <div>
          <label className="label">Week Number</label>
          <input {...register('weekNumber', { valueAsNumber: true })} type="number" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input {...register('notes')} className="input" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">Production Lines</label>
          <button type="button" onClick={() => append({ productId: '', plannedQuantity: 1 })} className="btn-secondary btn-sm">
            <Plus className="w-3 h-3" /> Add Product
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7">
                <select {...register(`lines.${i}.productId`, { required: true })} className="input text-sm">
                  <option value="">Select product...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <input {...register(`lines.${i}.plannedQuantity`, { required: true, valueAsNumber: true })} type="number" step="0.001" placeholder="Qty" className="input text-sm" />
              </div>
              <button type="button" onClick={() => remove(i)} className="col-span-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-gray-400">No lines added yet</p>}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Plan</button>
      </div>
    </form>
  );
}

export default function ProductionPlansPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState<'create' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const isAdmin = getStoredUser()?.role === 'ADMIN';

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['production-plans'],
    queryFn: () => productionApi.plans.list().then(r => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productionApi.plans.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-plans'] }); toast.success('Plan created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => productionApi.plans.confirm(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['production-plans'] });
      const shortages = data.data?.shortages ?? [];
      if (shortages.length > 0) {
        toast.error(`Plan confirmed but ${shortages.length} ingredient(s) are short!`);
      } else {
        toast.success('Plan confirmed — stock levels OK');
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionApi.plans.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-plans'] }); toast.success('Plan deleted'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'planDate', header: 'Date', render: (r: any) => format(new Date(r.planDate), 'MMM d, yyyy') },
    { key: 'weekNumber', header: 'Week', render: (r: any) => r.weekNumber ? `W${r.weekNumber}` : '—' },
    { key: 'status', header: 'Status', render: (r: any) => <span className={STATUS_BADGE[r.status]}>{r.status}</span> },
    { key: 'lines', header: 'Products', render: (r: any) => `${r.lines?.length ?? 0} products` },
    { key: 'batches', header: 'Batches', render: (r: any) => r._count?.batches ?? 0 },
    { key: 'notes', header: 'Notes', render: (r: any) => r.notes || '—' },
    {
      key: 'completion', header: 'Planning', render: (r: any) => {
        if (r.completionPct === null || r.completionPct === undefined) return <span className="text-xs text-[#6A6D70]">—</span>;
        const pct: number = r.completionPct;
        const color = pct === 100 ? '#256F3A' : pct >= 50 ? '#FF385C' : '#E76500';
        return (
          <div className="flex items-center gap-2">
            <Cake className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-medium" style={{ color }}>{pct}%</span>
          </div>
        );
      },
    },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(`/production/plans/${r.id}`)} className="btn-sm btn-secondary"><Eye className="w-3 h-3" /></button>
        {r.status === 'DRAFT' && (
          <button onClick={() => confirmMutation.mutate(r.id)} className="btn-sm btn-primary"><CheckCircle className="w-3 h-3" /> Confirm</button>
        )}
        {(r.status === 'DRAFT' || (r.status === 'CONFIRMED' && isAdmin)) && (
          <button onClick={() => { if (confirm('Delete this plan?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Production Plans"
        subtitle="Schedule and manage production runs"
        actions={
          <div className="flex items-center gap-2">
            {/* List / Calendar toggle */}
            <div className="flex items-center bg-[#F5F6F7] rounded-lg p-0.5 border border-[#EDEFF0]">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'list' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <List className="w-3.5 h-3.5" /> Liste
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'calendar' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Kalender
              </button>
            </div>
            <button onClick={() => setModal('create')} className="btn-primary"><Plus className="w-4 h-4" /> New Plan</button>
          </div>
        }
      />

      {viewMode === 'calendar' ? (
        <div className="card">
          <ProductionCalendarView plans={plans} />
        </div>
      ) : (
      <div className="card p-0">
        <Table columns={columns} data={plans} loading={isLoading} />
      </div>
      )}
      {modal === 'create' && (

        <Modal title="New Production Plan" onClose={() => setModal(null)} size="lg">
          <PlanForm
            products={products}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => createMutation.mutate(data)}
          />
        </Modal>
      )}
    </div>
  );
}

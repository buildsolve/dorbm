import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Play, CheckSquare } from 'lucide-react';
import { productionApi, productsApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  PLANNED: 'badge-gray', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
};

export default function ProductionBatchesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'complete' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => productionApi.batches.list().then(r => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productionApi.batches.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Batch created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => productionApi.batches.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Batch started'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: any) => productionApi.batches.complete(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Batch completed — finished goods added to storage'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'batchNumber', header: 'Batch #', render: (r: any) => <span className="font-mono text-sm">{r.batchNumber}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={STATUS_BADGE[r.status]}>{r.status}</span> },
    { key: 'plannedQty', header: 'Planned', render: (r: any) => Number(r.plannedQty).toFixed(2) },
    { key: 'actualQty', header: 'Actual', render: (r: any) => r.actualQty ? Number(r.actualQty).toFixed(2) : '—' },
    { key: 'wastageQty', header: 'Wastage', render: (r: any) => r.wastageQty ? Number(r.wastageQty).toFixed(2) : '—' },
    { key: 'yieldPercent', header: 'Yield', render: (r: any) => r.yieldPercent ? `${Number(r.yieldPercent).toFixed(1)}%` : '—' },
    { key: 'createdAt', header: 'Created', render: (r: any) => format(new Date(r.createdAt), 'MMM d, yyyy') },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        {r.status === 'PLANNED' && <button onClick={() => startMutation.mutate(r.id)} className="btn-sm btn-secondary"><Play className="w-3 h-3" /> Start</button>}
        {r.status === 'IN_PROGRESS' && <button onClick={() => { setSelected(r); setModal('complete'); }} className="btn-sm btn-primary"><CheckSquare className="w-3 h-3" /> Complete</button>}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Production Batches"
        subtitle="Track batch execution, yield and wastage"
        actions={<button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary"><Plus className="w-4 h-4" /> New Batch</button>}
      />
      <div className="card p-0">
        <Table columns={columns} data={batches} loading={isLoading} />
      </div>

      {modal === 'create' && (
        <Modal title="New Production Batch" onClose={() => setModal(null)}>
          <BatchCreateForm products={products} onClose={() => setModal(null)} onSubmit={(d: any) => createMutation.mutate(d)} />
        </Modal>
      )}
      {modal === 'complete' && selected && (
        <Modal title={`Complete Batch ${selected.batchNumber}`} onClose={() => setModal(null)}>
          <BatchCompleteForm batch={selected} onClose={() => setModal(null)} onSubmit={(d: any) => completeMutation.mutate({ id: selected.id, data: d })} />
        </Modal>
      )}
    </div>
  );
}

function BatchCreateForm({ products, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: { plannedQty: 1 } });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Product</label>
        <select {...register('productId')} className="input">
          <option value="">Select product...</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Planned Quantity *</label>
          <input {...register('plannedQty', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
        <div>
          <label className="label">Batch Number</label>
          <input {...register('batchNumber')} className="input" placeholder="Auto-generated if empty" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input {...register('notes')} className="input" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Create Batch</button>
      </div>
    </form>
  );
}

function BatchCompleteForm({ batch, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: { actualQty: batch.plannedQty, wastageQty: 0 },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Actual Output *</label>
          <input {...register('actualQty', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
        <div>
          <label className="label">Wastage</label>
          <input {...register('wastageQty', { valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input {...register('notes')} className="input" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Complete Batch</button>
      </div>
    </form>
  );
}

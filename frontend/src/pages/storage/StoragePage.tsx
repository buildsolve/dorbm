import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, ArrowUpDown, AlertTriangle, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import { storageApi, productsApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import StorageVisualPage from './StorageVisualPage';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';

export default function StoragePage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'visual' | 'table'>('visual');
  const [modal, setModal] = useState<'create' | 'edit' | 'move' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['storage-records'],
    queryFn: () => storageApi.records.list().then(r => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => storageApi.locations.list().then(r => r.data),
  });
  const { data: expiring = [] } = useQuery({
    queryKey: ['expiring'],
    queryFn: () => storageApi.expiring(5).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => storageApi.records.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-records'] }); toast.success('Record created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => storageApi.records.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-records'] }); toast.success('Record updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storageApi.records.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-records'] }); toast.success('Record removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, data }: any) => storageApi.records.move(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-records'] }); toast.success('Movement recorded'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    if (isPast(exp)) return <span className="badge-red">Expired</span>;
    if (isWithinInterval(exp, { start: new Date(), end: addDays(new Date(), 3) })) return <span className="badge-yellow">Expiring soon</span>;
    return <span className="badge-green">Fresh</span>;
  };

  const columns = [
    { key: 'product', header: 'Product', render: (r: any) => r.product?.name },
    { key: 'batchNumber', header: 'Batch', render: (r: any) => <span className="font-mono text-xs">{r.batchNumber}</span> },
    { key: 'location', header: 'Location', render: (r: any) => r.location?.name || '—' },
    { key: 'quantity', header: 'Qty', render: (r: any) => Number(r.quantity).toFixed(2) },
    { key: 'expiryDate', header: 'Expires', render: (r: any) => r.expiryDate ? format(new Date(r.expiryDate), 'MMM d') : '—' },
    { key: 'status', header: 'Status', render: (r: any) => getExpiryBadge(r.expiryDate) },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(r); setModal('move'); }} className="btn-sm btn-secondary"><ArrowUpDown className="w-3 h-3" /> Move</button>
        <button onClick={() => { setSelected(r); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => { if (confirm('Remove this record?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lager"
        subtitle="Fertigprodukte, Chargen und Lagerorte"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-[#F7F7F7] rounded-full p-1 gap-0.5">
              <button
                onClick={() => setView('visual')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all"
                style={{
                  background: view === 'visual' ? '#FFFFFF' : 'transparent',
                  color: view === 'visual' ? '#222222' : '#6A6A6A',
                  boxShadow: view === 'visual' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Lager
              </button>
              <button
                onClick={() => setView('table')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all"
                style={{
                  background: view === 'table' ? '#FFFFFF' : 'transparent',
                  color: view === 'table' ? '#222222' : '#6A6A6A',
                  boxShadow: view === 'table' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <List className="w-3.5 h-3.5" /> Liste
              </button>
            </div>
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus className="w-4 h-4" /> Einlagerung
            </button>
          </div>
        }
      />

      {/* Visual view */}
      {view === 'visual' && <StorageVisualPage />}

      {/* Table view */}
      {view === 'table' && <>
      {expiring.length > 0 && (
        <div className="p-4 bg-[#FEF3CD] border border-[#FADA92] flex items-start gap-3" style={{ borderRadius: 12 }}>
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{expiring.length} Charge(n) laufen innerhalb von 5 Tagen ab</p>
            <p className="text-sm text-amber-600">{expiring.slice(0, 3).map((e: any) => e.product?.name).join(', ')}{expiring.length > 3 ? '...' : ''}</p>
          </div>
        </div>
      )}

      <div className="card p-0">
        <Table columns={columns} data={records} loading={isLoading} />
      </div>
      </> }

      {modal === 'create' && (
        <Modal title="New Storage Record" onClose={() => setModal(null)}>
          <StorageForm products={products} locations={locations} onClose={() => setModal(null)} onSubmit={(d: any) => createMutation.mutate(d)} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Edit Storage Record" onClose={() => setModal(null)}>
          <StorageForm
            record={selected}
            products={products}
            locations={locations}
            onClose={() => setModal(null)}
            onSubmit={(d: any) => updateMutation.mutate({ id: selected.id, data: d })}
          />
        </Modal>
      )}
      {modal === 'move' && selected && (
        <Modal title="Record Movement" onClose={() => setModal(null)} size="sm">
          <MovementForm onClose={() => setModal(null)} onSubmit={(d: any) => moveMutation.mutate({ id: selected.id, data: d })} />
        </Modal>
      )}
    </div>
  );
}

function generateBatchNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `FG-${date}-${rand}`;
}

function StorageForm({ record, products, locations, onClose, onSubmit }: any) {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: record
      ? {
          ...record,
          productionDate: record.productionDate ? record.productionDate.slice(0, 10) : '',
          expiryDate: record.expiryDate ? record.expiryDate.slice(0, 10) : '',
          locationId: record.locationId ?? '',
        }
      : { quantity: 1, batchNumber: generateBatchNumber() },
  });

  // Auto-fill unit cost when product changes
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const product = products.find((p: any) => p.id === e.target.value);
    if (product?.totalCost != null) {
      setValue('unitCost', Number((product.totalCost ?? 0).toFixed(4)));
    }
  };

  const submit = handleSubmit((data: any) => {
    const clean: any = { ...data };
    if (!clean.locationId) delete clean.locationId;
    if (typeof clean.unitCost === 'string') {
      const parsed = parseFloat(String(clean.unitCost).replace(',', '.'));
      clean.unitCost = isNaN(parsed) ? undefined : parsed;
    } else if (clean.unitCost != null && isNaN(clean.unitCost)) {
      delete clean.unitCost;
    }
    onSubmit(clean);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Product *</label>
        <select {...register('productId', { required: true })} className="input" onChange={handleProductChange}>
          <option value="">Select product...</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Batch Number</label>
          <input {...register('batchNumber', { required: true })} className="input bg-gray-50" />
        </div>
        <div>
          <label className="label">Quantity *</label>
          <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Production Date</label>
          <input {...register('productionDate')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Expiry Date</label>
          <input {...register('expiryDate')} type="date" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Location</label>
          <select {...register('locationId')} className="input">
            <option value="">— None —</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Unit Cost (€)</label>
          <input {...register('unitCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

function MovementForm({ onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: { type: 'OUT', quantity: 1 } });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Movement Type</label>
        <select {...register('type')} className="input">
          <option value="IN">Stock In (adjustment)</option>
          <option value="OUT">Stock Out / Dispatch</option>
          <option value="TRANSFER">Transfer</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>
      <div>
        <label className="label">Quantity *</label>
        <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
      </div>
      <div>
        <label className="label">Notes</label>
        <input {...register('notes')} className="input" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Record</button>
      </div>
    </form>
  );
}

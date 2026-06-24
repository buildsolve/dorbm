import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowDownCircle, ArrowUpCircle, Flame } from 'lucide-react';
import { inventoryApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';

const TYPE_BADGES: Record<string, string> = {
  STOCK_IN: 'badge-green',
  STOCK_OUT: 'badge-blue',
  WASTAGE: 'badge-yellow',
  SPOILAGE: 'badge-red',
  PRODUCTION_USE: 'badge-purple',
  ADJUSTMENT: 'badge-gray',
};

export default function StockTransactionsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'stock-in' | 'stock-out' | 'wastage' | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['stock-transactions'],
    queryFn: () => inventoryApi.stock.transactions().then(r => r.data),
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', false],
    queryFn: () => inventoryApi.ingredients.list().then(r => r.data),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryApi.suppliers.list().then(r => r.data),
  });

  const stockInMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.stock.stockIn(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transactions'] }); qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Stock recorded'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const stockOutMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.stock.stockOut(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transactions'] }); qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Stock out recorded'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const wastageMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.stock.wastage(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transactions'] }); qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Wastage recorded'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r: any) => format(new Date(r.createdAt), 'MMM d, yyyy HH:mm') },
    { key: 'ingredient', header: 'Ingredient', render: (r: any) => r.ingredient?.name },
    { key: 'type', header: 'Type', render: (r: any) => <span className={TYPE_BADGES[r.type] || 'badge-gray'}>{r.type.replace('_', ' ')}</span> },
    { key: 'quantity', header: 'Quantity', render: (r: any) => `${Number(r.quantity).toFixed(3)} ${r.ingredient?.unit}` },
    { key: 'batchNumber', header: 'Batch', render: (r: any) => r.batchNumber || '—' },
    { key: 'notes', header: 'Notes', render: (r: any) => r.notes || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Transactions"
        subtitle="Track all inventory movements"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setModal('stock-in')} className="btn-primary btn-sm"><ArrowDownCircle className="w-4 h-4" /> Stock In</button>
            <button onClick={() => setModal('stock-out')} className="btn-secondary btn-sm"><ArrowUpCircle className="w-4 h-4" /> Stock Out</button>
            <button onClick={() => setModal('wastage')} className="btn btn-sm bg-amber-100 text-amber-800 hover:bg-amber-200"><Flame className="w-4 h-4" /> Wastage</button>
          </div>
        }
      />
      <div className="card p-0">
        <Table columns={columns} data={transactions} loading={isLoading} />
      </div>

      {modal === 'stock-in' && (
        <StockForm type="Stock In" ingredients={ingredients} suppliers={suppliers}
          onClose={() => setModal(null)}
          onSubmit={(d: any) => stockInMutation.mutate(d)} />
      )}
      {modal === 'stock-out' && (
        <StockForm type="Stock Out" ingredients={ingredients}
          onClose={() => setModal(null)}
          onSubmit={(d: any) => stockOutMutation.mutate(d)} />
      )}
      {modal === 'wastage' && (
        <WastageForm ingredients={ingredients}
          onClose={() => setModal(null)}
          onSubmit={(d: any) => wastageMutation.mutate(d)} />
      )}
    </div>
  );
}

function StockForm({ type, ingredients, suppliers, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm();
  return (
    <Modal title={`Record ${type}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Ingredient *</label>
          <select {...register('ingredientId', { required: true })} className="input">
            <option value="">Select ingredient...</option>
            {ingredients.map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity *</label>
            <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
          </div>
          {type === 'Stock In' && (
            <div>
              <label className="label">Unit Cost</label>
              <input {...register('unitCost', { valueAsNumber: true })} type="number" step="0.0001" className="input" />
            </div>
          )}
        </div>
        {type === 'Stock In' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Batch Number</label>
                <input {...register('batchNumber')} className="input" />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input {...register('expiryDate')} type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Supplier</label>
              <select {...register('supplierId')} className="input">
                <option value="">— None —</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label">Notes</label>
          <input {...register('notes')} className="input" />
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Record</button>
        </div>
      </form>
    </Modal>
  );
}

function WastageForm({ ingredients, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: { type: 'WASTAGE' } });
  return (
    <Modal title="Record Wastage / Spoilage" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Ingredient *</label>
          <select {...register('ingredientId', { required: true })} className="input">
            <option value="">Select ingredient...</option>
            {ingredients.map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity *</label>
            <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
          </div>
          <div>
            <label className="label">Type</label>
            <select {...register('type')} className="input">
              <option value="WASTAGE">Wastage</option>
              <option value="SPOILAGE">Spoilage</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input {...register('notes')} className="input" />
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-danger">Record Wastage</button>
        </div>
      </form>
    </Modal>
  );
}

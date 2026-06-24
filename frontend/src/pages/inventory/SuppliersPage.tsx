import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { inventoryApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

function SupplierForm({ supplier, onSubmit, onClose }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: supplier || {} });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Code *</label>
          <input {...register('code', { required: true })} className="input" placeholder="SUP001" />
        </div>
        <div>
          <label className="label">Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Premium Flour Mills" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contact Name</label>
          <input {...register('contactName')} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Phone</label>
          <input {...register('phone')} className="input" />
        </div>
        <div>
          <label className="label">Address</label>
          <input {...register('address')} className="input" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Supplier</button>
      </div>
    </form>
  );
}

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryApi.suppliers.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.suppliers.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => inventoryApi.suppliers.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.suppliers.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'code', header: 'Code', width: '100px' },
    { key: 'name', header: 'Name' },
    { key: 'contactName', header: 'Contact', render: (r: any) => r.contactName || '—' },
    { key: 'email', header: 'Email', render: (r: any) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r: any) => r.phone || '—' },
    { key: 'isActive', header: 'Status', render: (r: any) => <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(r); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => { if (confirm('Remove?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Manage raw material suppliers"
        actions={<button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Supplier</button>}
      />
      <div className="card p-0">
        <Table columns={columns} data={suppliers} loading={isLoading} />
      </div>
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Supplier' : 'Edit Supplier'} onClose={() => setModal(null)}>
          <SupplierForm
            supplier={selected}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected.id, data })}
          />
        </Modal>
      )}
    </div>
  );
}

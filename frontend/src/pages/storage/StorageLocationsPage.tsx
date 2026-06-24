import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { storageApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

export default function StorageLocationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => storageApi.locations.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => storageApi.locations.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-locations'] }); toast.success('Location created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => storageApi.locations.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-locations'] }); toast.success('Location updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storageApi.locations.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-locations'] }); toast.success('Location removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'code', header: 'Code', width: '100px' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', render: (r: any) => r.description || '—' },
    { key: 'capacity', header: 'Capacity', render: (r: any) => r.capacity ? `${r.capacity} units` : '—' },
    { key: 'isActive', header: 'Status', render: (r: any) => <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => { if (confirm('Remove?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Storage Locations" actions={
        <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Location</button>
      } />
      <div className="card p-0">
        <Table columns={columns} data={locations} loading={isLoading} />
      </div>
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Location' : 'Edit Location'} onClose={() => setModal(null)} size="sm">
          <LocationForm
            location={selected}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected.id, data })}
          />
        </Modal>
      )}
    </div>
  );
}

function LocationForm({ location, onSubmit, onClose }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: location || {} });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Code *</label>
          <input {...register('code', { required: true })} className="input" placeholder="LOC001" />
        </div>
        <div>
          <label className="label">Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Display Fridge 1" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input {...register('description')} className="input" />
      </div>
      <div>
        <label className="label">Capacity (units)</label>
        <input {...register('capacity', { valueAsNumber: true })} type="number" className="input" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';
import { productionApi } from '../../api/client';
import { format } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', CONFIRMED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
};

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['production-plan', id],
    queryFn: () => productionApi.plans.get(id!).then(r => r.data),
  });

  const { data: pickList = [] } = useQuery({
    queryKey: ['pick-list', id],
    queryFn: () => productionApi.plans.pickList(id!).then(r => r.data),
    enabled: !!plan,
  });

  const confirmMutation = useMutation({
    mutationFn: () => productionApi.plans.confirm(id!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['production-plan', id] });
      const shortages = data.data?.shortages ?? [];
      toast[shortages.length > 0 ? 'error' : 'success'](
        shortages.length > 0 ? `${shortages.length} ingredient shortages!` : 'Plan confirmed'
      );
    },
  });

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!plan) return null;

  const shortages = pickList.filter((r: any) => r.available < r.required);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/production/plans')} className="btn-secondary btn-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Production Plan — {format(new Date(plan.planDate), 'MMM d, yyyy')}
          </h1>
          <p className="text-sm text-gray-500">Week {plan.weekNumber ?? '—'} · <span className={STATUS_BADGE[plan.status]}>{plan.status}</span></p>
        </div>
        {plan.status === 'DRAFT' && (
          <button onClick={() => confirmMutation.mutate()} className="btn-primary">
            <CheckCircle className="w-4 h-4" /> Confirm Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Lines */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Production Lines</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Product</th>
                <th className="table-header">Planned Qty</th>
                <th className="table-header">Actual Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plan.lines?.map((line: any) => (
                <tr key={line.id}>
                  <td className="table-cell font-medium">{line.product?.name}</td>
                  <td className="table-cell">{Number(line.plannedQuantity).toFixed(2)}</td>
                  <td className="table-cell">{line.actualQuantity ? Number(line.actualQuantity).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pick List */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#FF385C]" /> Ingredient Pick List
          </h2>
          {shortages.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {shortages.length} ingredient(s) below required quantity
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Ingredient</th>
                <th className="table-header">Required</th>
                <th className="table-header">Available</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pickList.map((item: any) => (
                <tr key={item.id}>
                  <td className="table-cell font-medium">{item.name}</td>
                  <td className="table-cell">{item.required.toFixed(3)} {item.unit}</td>
                  <td className="table-cell">{item.available.toFixed(3)} {item.unit}</td>
                  <td className="table-cell">
                    {item.available >= item.required
                      ? <span className="badge-green">OK</span>
                      : <span className="badge-red">Short {(item.required - item.available).toFixed(3)} {item.unit}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batches */}
      {plan.batches?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Production Batches</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Batch #</th>
                <th className="table-header">Status</th>
                <th className="table-header">Planned</th>
                <th className="table-header">Actual</th>
                <th className="table-header">Yield %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plan.batches.map((b: any) => (
                <tr key={b.id}>
                  <td className="table-cell font-mono">{b.batchNumber}</td>
                  <td className="table-cell"><span className={STATUS_BADGE[b.status]}>{b.status}</span></td>
                  <td className="table-cell">{Number(b.plannedQty).toFixed(2)}</td>
                  <td className="table-cell">{b.actualQty ? Number(b.actualQty).toFixed(2) : '—'}</td>
                  <td className="table-cell">{b.yieldPercent ? `${Number(b.yieldPercent).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

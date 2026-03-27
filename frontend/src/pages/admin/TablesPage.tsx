import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, QrCode, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/shared/Layout';
import Modal from '@/components/shared/Modal';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { tableService } from '@/services/table.service';
import type { Table, CreateTableRequest } from '@/types';

// ─── Table Form ───────────────────────────────────────────────────────────────

interface TableFormProps {
  initial?: Table;
  onSubmit: (data: CreateTableRequest) => void;
  isPending: boolean;
}

function TableForm({ initial, onSubmit, isPending }: TableFormProps) {
  const [number, setNumber] = useState(initial?.number ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ number, name, capacity });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Table Number *</label>
          <input
            type="number"
            required
            min={1}
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
          <input
            type="number"
            required
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Table 1, Window Seat"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
        />
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {isPending && <LoadingSpinner size="sm" />}
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

interface QrModalProps {
  table: Table;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function QrModal({ table, onRegenerate, isRegenerating }: QrModalProps) {
  const orderUrl = `${window.location.origin}/order/${table.id}`;

  return (
    <div className="space-y-5 text-center">
      <div>
        <p className="text-gray-600 text-sm">
          Scan to order from <span className="font-semibold">{table.name}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1 break-all">{orderUrl}</p>
      </div>

      {table.qrCode ? (
        <img
          src={table.qrCode}
          alt={`QR code for ${table.name}`}
          className="mx-auto w-48 h-48 border border-gray-200 rounded-xl"
        />
      ) : (
        <div className="mx-auto w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400">
          <QrCode className="w-12 h-12" />
        </div>
      )}

      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="flex items-center gap-2 mx-auto px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        Regenerate QR Code
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TablesPage() {
  const qc = useQueryClient();
  const [tableModal, setTableModal] = useState<{ open: boolean; editing?: Table }>({ open: false });
  const [qrModal, setQrModal] = useState<{ open: boolean; table?: Table }>({ open: false });

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: tableService.getTables,
  });

  const createTable = useMutation({
    mutationFn: tableService.createTable,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table created');
      setTableModal({ open: false });
    },
    onError: () => toast.error('Failed to create table'),
  });

  const updateTable = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTableRequest }) =>
      tableService.updateTable(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated');
      setTableModal({ open: false });
    },
    onError: () => toast.error('Failed to update table'),
  });

  const deleteTable = useMutation({
    mutationFn: tableService.deleteTable,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deleted');
    },
    onError: () => toast.error('Failed to delete table'),
  });

  const regenerateQr = useMutation({
    mutationFn: tableService.regenerateQrCode,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      setQrModal({ open: true, table: updated });
      toast.success('QR code regenerated');
    },
    onError: () => toast.error('Failed to regenerate QR code'),
  });

  const confirmDelete = (table: Table) => {
    if (confirm(`Delete table "${table.name}"?`)) deleteTable.mutate(table.id);
  };

  if (isLoading) {
    return <Layout><PageLoader /></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tables</h1>
            <p className="text-gray-500 text-sm mt-1">{tables.length} tables</p>
          </div>
          <button
            onClick={() => setTableModal({ open: true })}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Add Table
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-lg">{table.name}</p>
                  <p className="text-xs text-gray-400">Table #{table.number}</p>
                </div>
                {!table.isActive && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>Capacity: {table.capacity}</span>
              </div>

              {table._count && (
                <p className="text-xs text-gray-400">{table._count.orders} total orders</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setQrModal({ open: true, table })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" /> QR Code
                </button>
                <button
                  onClick={() => setTableModal({ open: true, editing: table })}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirmDelete(table)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {tables.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No tables yet. Add your first table to generate QR codes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Table form modal */}
      <Modal
        isOpen={tableModal.open}
        onClose={() => setTableModal({ open: false })}
        title={tableModal.editing ? 'Edit Table' : 'New Table'}
      >
        <TableForm
          initial={tableModal.editing}
          isPending={createTable.isPending || updateTable.isPending}
          onSubmit={(data) => {
            if (tableModal.editing) {
              updateTable.mutate({ id: tableModal.editing.id, data });
            } else {
              createTable.mutate(data);
            }
          }}
        />
      </Modal>

      {/* QR modal */}
      {qrModal.table && (
        <Modal
          isOpen={qrModal.open}
          onClose={() => setQrModal({ open: false })}
          title={`QR Code — ${qrModal.table.name}`}
        >
          <QrModal
            table={qrModal.table}
            isRegenerating={regenerateQr.isPending}
            onRegenerate={() => regenerateQr.mutate(qrModal.table!.id)}
          />
        </Modal>
      )}
    </Layout>
  );
}

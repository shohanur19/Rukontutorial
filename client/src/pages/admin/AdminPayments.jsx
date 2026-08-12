import { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { formatCurrency, formatDate, PAYMENT_METHODS, paymentMethodLabel } from '../../utils/constants';

const emptyForm = {
  studentId: '',
  batchId: '',
  month: '',
  payableAmount: '',
  paidAmount: '',
  paymentMethod: 'bkash',
  senderAccountNumber: '',
  centerAccountNumber: '',
  transactionId: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  note: '',
};

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [filters, setFilters] = useState({ search: '', month: '', batchId: '', status: '', provider: '' });
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchPayments = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    api.get(`/payments?${params}`).then((r) => setPayments(r.data.data));
  };

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/batches'), api.get('/payments')])
      .then(([s, b, p]) => { setStudents(s.data.data); setBatches(b.data.data); setPayments(p.data.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!loading) fetchPayments(); }, [filters]);

  const handleStudentChange = (studentId) => {
    const student = students.find((s) => s._id === studentId);
    const account = student?.batchId?.paymentAccounts?.find((item) => item.isActive);
    setForm({
      ...form,
      studentId,
      batchId: student?.batchId?._id || '',
      payableAmount: student?.batchId?.courseFee || '',
      paymentMethod: account?.provider || form.paymentMethod || 'bkash',
      centerAccountNumber: account?.accountNumber || form.centerAccountNumber,
    });
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (payment) => {
    setEditId(payment._id);
    setForm({
      studentId: payment.studentId?._id || '',
      batchId: payment.batchId?._id || '',
      month: payment.month || '',
      payableAmount: payment.payableAmount || '',
      paidAmount: payment.paidAmount || '',
      paymentMethod: PAYMENT_METHODS.some((method) => method.value === payment.paymentMethod) ? payment.paymentMethod : 'bkash',
      senderAccountNumber: payment.senderAccountNumber || '',
      centerAccountNumber: payment.centerAccountNumber || '',
      transactionId: payment.transactionId || '',
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().slice(0, 10) : '',
      note: payment.note || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, payableAmount: Number(form.payableAmount), paidAmount: Number(form.paidAmount) };
      if (editId) await api.put(`/payments/${editId}`, payload);
      else await api.post('/payments', payload);
      setAlert({ type: 'success', message: editId ? 'Payment updated' : 'Payment recorded' });
      setModalOpen(false);
      fetchPayments();
    } catch (err) { setAlert({ type: 'error', message: err.response?.data?.message || 'Failed' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment?')) return;
    try {
      await api.delete(`/payments/${id}`);
      setAlert({ type: 'success', message: 'Payment deleted' });
      fetchPayments();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete payment' });
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Payment Management</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Payment</button>
      </div>
      <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="card mb-6 grid md:grid-cols-5 gap-4">
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="input-field md:col-span-2"
          placeholder="Search student, phone, batch, TXN, sender"
        />
        <input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} className="input-field" />
        <select value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value })} className="input-field"><option value="">All Batches</option>{batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
        <select value={filters.provider} onChange={(e) => setFilters({ ...filters, provider: e.target.value })} className="input-field"><option value="">All Providers</option>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field"><option value="">All Status</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="due">Due</option><option value="not_paid">Not Paid</option><option value="payment_submitted">Payment Submitted</option></select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500"><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Batch</th><th className="pb-3 pr-4">Month</th><th className="pb-3 pr-4">Payable</th><th className="pb-3 pr-4">Paid</th><th className="pb-3 pr-4">Due</th><th className="pb-3 pr-4">Provider</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="py-3 pr-4"><p>{p.studentId?.name}</p><p className="text-xs text-gray-500">{p.studentId?.phone}</p></td>
                <td className="py-3 pr-4">{p.batchId?.name || '-'}</td>
                <td className="py-3 pr-4">{p.month}</td>
                <td className="py-3 pr-4">{formatCurrency(p.payableAmount)}</td>
                <td className="py-3 pr-4">{formatCurrency(p.paidAmount)}</td>
                <td className="py-3 pr-4">{formatCurrency(p.dueAmount)}</td>
                <td className="py-3 pr-4"><p>{paymentMethodLabel(p.paymentMethod)}</p><p className="text-xs text-gray-500">{p.transactionId || '-'}</p></td>
                <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setReceipt(p)} className="text-primary-600 hover:underline">Receipt</button>
                    <button onClick={() => openEdit(p)} className="text-primary-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-gray-500">No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Payment' : 'Add Payment'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-sm font-medium">Student</label><select value={form.studentId} onChange={(e) => handleStudentChange(e.target.value)} required className="input-field"><option value="">Select</option>{students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
          <div><label className="text-sm font-medium">Batch</label><select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required className="input-field"><option value="">Select</option>{batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div>
          <div><label className="text-sm font-medium">Month</label><input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Payable</label><input type="number" value={form.payableAmount} onChange={(e) => setForm({ ...form, payableAmount: e.target.value })} required className="input-field" /></div>
            <div><label className="text-sm font-medium">Paid</label><input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} required className="input-field" /></div>
          </div>
          <div><label className="text-sm font-medium">Provider</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Sender Account</label><input value={form.senderAccountNumber} onChange={(e) => setForm({ ...form, senderAccountNumber: e.target.value })} className="input-field" /></div>
            <div><label className="text-sm font-medium">Receiving Account</label><input value={form.centerAccountNumber} onChange={(e) => setForm({ ...form, centerAccountNumber: e.target.value })} className="input-field" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Transaction ID</label><input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} className="input-field" /></div>
            <div><label className="text-sm font-medium">Payment Date</label><input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="text-sm font-medium">Note</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-field" /></div>
          <button type="submit" className="btn-primary">{editId ? 'Update Payment' : 'Save Payment'}</button>
        </form>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt" size="md">
        {receipt && (
          <div className="text-center" id="receipt">
            <h3 className="font-bold text-lg mb-4">Rukon's Tutorial</h3>
            <p className="text-sm text-gray-500 mb-4">Payment Receipt</p>
            <div className="text-left space-y-2 text-sm border-t border-b py-4">
              <p><strong>Student:</strong> {receipt.studentId?.name}</p>
              <p><strong>Month:</strong> {receipt.month}</p>
              <p><strong>Payable:</strong> {formatCurrency(receipt.payableAmount)}</p>
              <p><strong>Paid:</strong> {formatCurrency(receipt.paidAmount)}</p>
              <p><strong>Due:</strong> {formatCurrency(receipt.dueAmount)}</p>
              <p><strong>Provider:</strong> {paymentMethodLabel(receipt.paymentMethod)}</p>
              <p><strong>Sender:</strong> {receipt.senderAccountNumber || '-'}</p>
              <p><strong>Receiving Account:</strong> {receipt.centerAccountNumber || '-'}</p>
              <p><strong>Transaction ID:</strong> {receipt.transactionId || '-'}</p>
              <p><strong>Date:</strong> {formatDate(receipt.paymentDate)}</p>
            </div>
            <button onClick={() => window.print()} className="btn-primary mt-4 no-print">Print Receipt</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPayments;

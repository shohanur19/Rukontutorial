import { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { PAYMENT_METHODS, formatCurrency, paymentMethodLabel } from '../../utils/constants';

const emptyForm = {
  name: '',
  classLevel: '',
  subject: '',
  teacherName: '',
  schedule: '',
  time: '',
  room: '',
  courseFee: '',
  paymentInstructions: '',
  paymentProvider: 'bkash',
  paymentAccountNumber: '',
  paymentAccountName: '',
  status: 'active',
};

const AdminBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [studentsModal, setStudentsModal] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchBatches = () => api.get('/batches').then((r) => setBatches(r.data.data));

  useEffect(() => { fetchBatches().finally(() => setLoading(false)); }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (batch) => {
    const account = batch.paymentAccounts?.[0] || {};
    setEditId(batch._id);
    setForm({
      ...emptyForm,
      ...batch,
      monthlyFee: batch.monthlyFee,
      paymentProvider: account.provider || 'bkash',
      paymentAccountNumber: account.accountNumber || '',
      paymentAccountName: account.accountName || '',
    });
    setModalOpen(true);
  };

  const viewStudents = async (batch) => {
    const res = await api.get(`/batches/${batch._id}/students`);
    setBatchStudents(res.data.data);
    setStudentsModal(batch);
  };

  const buildPayload = () => ({
    name: form.name,
    classLevel: form.classLevel,
    subject: form.subject,
    teacherName: form.teacherName,
    schedule: form.schedule,
    time: form.time,
    room: form.room,
    monthlyFee: Number(form.monthlyFee),
    paymentInstructions: form.paymentInstructions,
    paymentAccounts: form.paymentAccountNumber
      ? [{
          provider: form.paymentProvider,
          accountNumber: form.paymentAccountNumber,
          accountName: form.paymentAccountName,
          isActive: true,
        }]
      : [],
    status: form.status,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/batches/${editId}`, buildPayload());
        setAlert({ type: 'success', message: 'Batch updated' });
      } else {
        await api.post('/batches', buildPayload());
        setAlert({ type: 'success', message: 'Batch created' });
      }
      setModalOpen(false);
      fetchBatches();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch?')) return;
    try {
      await api.delete(`/batches/${id}`);
      setAlert({ type: 'success', message: 'Deleted' });
      fetchBatches();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed' });
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Batch Management</h1>
        <button onClick={openCreate} className="btn-primary">+ Create Batch</button>
      </div>
      <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => {
          const account = batch.paymentAccounts?.find((item) => item.isActive);
          return (
            <div key={batch._id} className="card">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">{batch.classLevel}</span>
                <StatusBadge status={batch.status} />
              </div>
              <h3 className="font-bold text-lg mb-2">{batch.name}</h3>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>{batch.subject} - {batch.teacherName}</p>
                <p>{batch.schedule} | {batch.time}</p>
                <p>Room {batch.room}</p>
                <p>{formatCurrency(batch.monthlyFee)}/month</p>
                {account && <p>Payment: <span>{paymentMethodLabel(account.provider)}</span> {account.accountNumber}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => viewStudents(batch)} className="text-sm text-primary-600 hover:underline">Students</button>
                <button onClick={() => openEdit(batch)} className="text-sm text-primary-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(batch._id)} className="text-sm text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Batch' : 'Create Batch'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {['name', 'classLevel', 'subject', 'teacherName', 'schedule', 'time', 'room'].map((field) => (
              <div key={field}>
                <label className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field !== 'room'} className="input-field" />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium">Monthly Fee</label>
              <input type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Payment Provider</label>
              <select value={form.paymentProvider} onChange={(e) => setForm({ ...form, paymentProvider: e.target.value })} className="input-field">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Receiving Account Number</label>
              <input value={form.paymentAccountNumber} onChange={(e) => setForm({ ...form, paymentAccountNumber: e.target.value })} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Receiving Account Name</label>
              <input value={form.paymentAccountName} onChange={(e) => setForm({ ...form, paymentAccountName: e.target.value })} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Payment Instructions</label>
              <textarea value={form.paymentInstructions} onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })} rows={2} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!studentsModal} onClose={() => setStudentsModal(null)} title={`Students - ${studentsModal?.name}`}>
        {batchStudents.length === 0 ? (
          <p className="text-gray-500">No students assigned</p>
        ) : (
          <ul className="space-y-2">
            {batchStudents.map((student) => (
              <li key={student._id} className="flex justify-between py-2 border-b">
                <span>{student.name}</span>
                <span className="text-sm text-gray-500">{student.studentId}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};

export default AdminBatches;

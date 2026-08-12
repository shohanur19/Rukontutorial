import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PAYMENT_METHODS, formatCurrency, paymentMethodLabel } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

const initialForm = {
  studentName: '',
  studentEmail: '',
  studentPhone: '',
  guardianPhone: '',
  batchId: '',
  schoolCollege: '',
  address: '',
  message: '',
  paymentOption: 'pay_later',
  paymentProvider: '',
  centerAccountNumber: '',
  senderAccountNumber: '',
  transactionId: '',
  paidAmount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentNote: '',
};

const AdmissionPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      const target = `/admission${window.location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    api
      .get('/batches/public')
      .then((res) => {
        const data = res.data.data || [];
        const selectedBatchId = searchParams.get('batchId') || '';
        setBatches(data);
        setForm((prev) => ({
          ...prev,
          studentName: user?.name || prev.studentName,
          studentEmail: user?.email || prev.studentEmail,
          batchId: selectedBatchId || prev.batchId || data[0]?._id || '',
        }));
      })
      .catch(() => setAlert({ type: 'error', message: 'Failed to load available batches' }))
      .finally(() => setLoading(false));
  }, [searchParams, user]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch._id === form.batchId),
    [batches, form.batchId]
  );

  const activePaymentAccounts = selectedBatch?.paymentAccounts?.filter((account) => account.isActive) || [];
  const paymentProviderOptions = activePaymentAccounts.length
    ? activePaymentAccounts.map((account) => ({
        value: account.provider,
        label: `${paymentMethodLabel(account.provider)} - ${account.accountNumber}`,
      }))
    : PAYMENT_METHODS;

  useEffect(() => {
    const firstAccount = activePaymentAccounts[0];
    setForm((prev) => ({
      ...prev,
      centerAccountNumber: firstAccount?.accountNumber || prev.centerAccountNumber,
      paymentProvider: firstAccount?.provider || '',
    }));
  }, [selectedBatch?._id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePaymentProviderChange = (e) => {
    const provider = e.target.value;
    const selectedAccount = activePaymentAccounts.find((account) => account.provider === provider);
    setForm({
      ...form,
      paymentProvider: provider,
      centerAccountNumber: selectedAccount?.accountNumber || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert({ type: '', message: '' });

    try {
      const payload = {
        ...form,
        paidAmount: form.paymentOption === 'pay_now' ? Number(form.paidAmount || 0) : 0,
      };
      await api.post('/admissions', payload);
      setAlert({ type: 'success', message: 'Admission request submitted successfully. You can track it in your student portal.' });
      setForm({ ...initialForm, studentName: user?.name || '', studentEmail: user?.email || '', batchId: form.batchId });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit admission request' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner className="py-20" />;
  if (!user) return null;

  return (
    <div>
      <section className="bg-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold">Online Admission</h1>
          <p className="text-primary-200 mt-2">Apply for an available batch using your student login</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="card">
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Student Name *</label>
                  <input name="studentName" value={form.studentName} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Student Email *</label>
                  <input type="email" name="studentEmail" value={form.studentEmail} onChange={handleChange} required className="input-field" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Student Phone *</label>
                  <input name="studentPhone" value={form.studentPhone} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guardian Phone</label>
                  <input name="guardianPhone" value={form.guardianPhone} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">School/College</label>
                  <input name="schoolCollege" value={form.schoolCollege} onChange={handleChange} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Batch *</label>
                <select name="batchId" value={form.batchId} onChange={handleChange} required className="input-field">
                  <option value="">Select batch</option>
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name} - {batch.subject} ({formatCurrency(batch.courseFee)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBatch && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{selectedBatch.name}</p>
                  <p>{selectedBatch.classLevel} | {selectedBatch.subject} | {selectedBatch.schedule} | {selectedBatch.time}</p>
                  <p>Payable amount: <strong>{formatCurrency(selectedBatch.courseFee)}</strong></p>
                  {selectedBatch.paymentInstructions && <p className="mt-2">{selectedBatch.paymentInstructions}</p>}
                  {activePaymentAccounts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activePaymentAccounts.map((account) => (
                        <p key={`${account.provider}-${account.accountNumber}`}>
                          <span className="font-medium">{paymentMethodLabel(account.provider)}</span>: {account.accountNumber}
                          {account.accountName ? ` (${account.accountName})` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows={2} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={2} className="input-field" />
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <label className="block text-sm font-semibold">Payment Option</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-lg border p-3">
                    <input type="radio" name="paymentOption" value="pay_now" checked={form.paymentOption === 'pay_now'} onChange={handleChange} />
                    Pay now using the receiving account
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border p-3">
                    <input type="radio" name="paymentOption" value="pay_later" checked={form.paymentOption === 'pay_later'} onChange={handleChange} />
                    I will pay later
                  </label>
                </div>

                {form.paymentOption === 'pay_now' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Provider *</label>
                      <select
                        name="paymentProvider"
                        value={form.paymentProvider}
                        onChange={handlePaymentProviderChange}
                        required
                        className="input-field"
                      >
                        <option value="">Select provider</option>
                        {paymentProviderOptions.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Center Receiving Account *</label>
                      <input name="centerAccountNumber" value={form.centerAccountNumber} required readOnly className="input-field bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sender Account/Mobile *</label>
                      <input name="senderAccountNumber" value={form.senderAccountNumber} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Transaction ID *</label>
                      <input name="transactionId" value={form.transactionId} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Paid Amount *</label>
                      <input type="number" min="1" name="paidAmount" value={form.paidAmount} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Date *</label>
                      <input type="date" name="paymentDate" value={form.paymentDate} onChange={handleChange} required className="input-field" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">Payment Note</label>
                      <textarea name="paymentNote" value={form.paymentNote} onChange={handleChange} rows={2} className="input-field" />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdmissionPage;

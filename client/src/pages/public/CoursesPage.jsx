import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatCurrency, paymentMethodLabel } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

const CoursesPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/batches/public').then((r) => setBatches(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApply = (batchId) => {
    const path = `/admission?batchId=${batchId}`;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
  };

  return (
    <div>
      <section className="bg-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold">Courses & Batches</h1>
          <p className="text-primary-200 mt-2">Explore our available classes and programs</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <LoadingSpinner className="py-20" />
          ) : batches.length === 0 ? (
            <EmptyState title="No batches available" message="Check back soon for new courses" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => {
                const paymentAccount = batch.paymentAccounts?.find((account) => account.isActive);
                return (
                  <div key={batch._id} className="card hover:shadow-lg transition">
                    <span className="inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-1 rounded mb-3">{batch.classLevel}</span>
                    <h3 className="text-xl font-bold mb-2">{batch.name}</h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>Subject: <strong>{batch.subject}</strong></p>
                      <p>Teacher: {batch.teacherName}</p>
                      <p>Schedule: {batch.schedule}</p>
                      <p>Time: {batch.time}</p>
                      <p>Room: {batch.room}</p>
                      <p>course Fee: <strong>{formatCurrency(batch.courseFee)}</strong></p>
                      {paymentAccount && (
                        <p>Payment: <strong>{paymentMethodLabel(paymentAccount.provider)}</strong> {paymentAccount.accountNumber}</p>
                      )}
                    </div>
                    <button onClick={() => handleApply(batch._id)} className="btn-primary w-full text-center block text-sm">Apply for This Batch</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CoursesPage;

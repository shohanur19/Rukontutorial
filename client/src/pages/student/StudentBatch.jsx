import { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/constants';

const StudentBatch = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/me').then((r) => setProfile(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!profile?.batchId) return <EmptyState title="No batch assigned" message="Contact admin to get assigned to a batch" />;

  const batch = profile.batchId;

  return (
    <div>
      <h1 className="page-title mb-6">My Batch</h1>
      <div className="card max-w-xl">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">{batch.name}</h2>
        <div className="space-y-3 text-gray-600">
          <p>📖 <strong>Subject:</strong> {batch.subject}</p>
          <p>👨‍🏫 <strong>Teacher:</strong> {batch.teacherName}</p>
          <p>📅 <strong>Schedule:</strong> {batch.schedule}</p>
          <p>🕐 <strong>Time:</strong> {batch.time}</p>
          <p>🏫 <strong>Room:</strong> {batch.room}</p>
          <p>💰 <strong>course Fee:</strong> {formatCurrency(batch.courseFee)}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentBatch;

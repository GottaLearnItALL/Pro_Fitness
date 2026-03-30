import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getTrainerAvailability } from '../api';
import Modal from './Modal';

const EMPTY_FORM = { f_name: '', l_name: '', email: '', phone: '', address: '', specialty: '' };

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function Trainers() {
  const [trainers, setTrainers]       = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEdit]         = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null); // trainer to show availability

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([getUsers(), getTrainerAvailability()])
      .then(([uRes, aRes]) => {
        const all = uRes.data?.Data || [];
        setTrainers(all.filter(u => u.role === 'trainer'));

        // Availability may return stringified data — handle gracefully
        const raw = aRes.data;
        if (Array.isArray(raw)) setAvailability(raw);
        else if (Array.isArray(raw?.Data)) setAvailability(raw.Data);
        else setAvailability([]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEdit(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEdit(t);
    setForm({
      f_name:    t.first_name || '',
      l_name:    t.last_name  || '',
      email:     t.email      || '',
      phone:     t.phone      || '',
      address:   t.address    || '',
      specialty: t.specialty  || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.f_name || !form.l_name || !form.email) {
      setError('First name, last name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        f_name:  form.f_name,
        l_name:  form.l_name,
        email:   form.email,
        phone:   form.phone,
        address: form.address,
        role:    'trainer',
      };
      if (editTarget) {
        await updateUser(editTarget.id, payload);
      } else {
        await createUser(payload);
      }
      setShowModal(false);
      fetchData();
    } catch {
      setError('Failed to save trainer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete ${t.first_name} ${t.last_name}? This cannot be undone.`)) return;
    try {
      await deleteUser(t.id);
      fetchData();
    } catch {
      alert('Failed to delete trainer.');
    }
  };

  const getInitials = (t) =>
    `${(t.first_name || '?')[0]}${(t.last_name || '?')[0]}`.toUpperCase();

  const trainerAvailability = (trainerId) =>
    availability.filter(a => a.trainer_id === trainerId);

  const clientCount = (trainerId) => {
    // We don't have assignments data, so just show 0 as placeholder
    return 0;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Trainer Management</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Trainer</button>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /> Loading trainers…</div>
      ) : trainers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◉</div>
          <p>No trainers yet. Add your first trainer!</p>
        </div>
      ) : (
        <div className="trainer-grid">
          {trainers.map(trainer => {
            const avail = trainerAvailability(trainer.id);
            const isAvailable = avail.length > 0;
            return (
              <div key={trainer.id} className="trainer-card">
                <div className="trainer-header">
                  <div className="trainer-avatar">{getInitials(trainer)}</div>
                  <div className="trainer-info">
                    <h3 className="trainer-name">{trainer.first_name} {trainer.last_name}</h3>
                    <span className="trainer-specialty">{trainer.email}</span>
                  </div>
                  <span className={`trainer-status ${isAvailable ? 'available' : 'busy'}`}>
                    {isAvailable ? 'Available' : 'No schedule'}
                  </span>
                </div>

                <div className="trainer-stats">
                  <div>
                    <div className="trainer-stat-value">{avail.length}</div>
                    <div className="trainer-stat-label">Days</div>
                  </div>
                  <div>
                    <div className="trainer-stat-value" style={{ color: '#f5f2eb' }}>
                      {trainer.phone || '–'}
                    </div>
                    <div className="trainer-stat-label">Phone</div>
                  </div>
                </div>

                {/* Availability days */}
                {avail.length > 0 && (
                  <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {avail.map((a, i) => (
                      <span key={i} style={{
                        padding: '3px 10px',
                        background: 'rgba(212,175,135,0.12)',
                        borderRadius: 20,
                        fontSize: 11,
                        color: 'var(--color-accent)',
                        textTransform: 'capitalize',
                      }}>
                        {a.day_of_week} {a.start_time}–{a.end_time}
                      </span>
                    ))}
                  </div>
                )}

                <div className="trainer-actions">
                  <button className="btn btn-primary" onClick={() => setScheduleFor(trainer)}>
                    View Schedule
                  </button>
                  <button className="btn btn-secondary" onClick={() => openEdit(trainer)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(trainer)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          title={editTarget
            ? <><span>◉</span> Edit Trainer</>
            : <><span>+</span> Add New Trainer</>}
          onClose={() => { setShowModal(false); setError(''); }}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Trainer'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            {error && <div className="error-banner">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" placeholder="Mike"
                  value={form.f_name} onChange={e => setForm({ ...form, f_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" placeholder="Chen"
                  value={form.l_name} onChange={e => setForm({ ...form, l_name: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="mike@gym.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="555-0100"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="123 Main St"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* View Schedule Modal */}
      {scheduleFor && (
        <Modal
          title={<><span>◷</span> {scheduleFor.first_name}'s Schedule</>}
          onClose={() => setScheduleFor(null)}
          actions={
            <button className="btn btn-secondary" onClick={() => setScheduleFor(null)}>Close</button>
          }
        >
          {trainerAvailability(scheduleFor.id).length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>No availability set for this trainer.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {DAYS_OF_WEEK.map(day => {
                const slots = trainerAvailability(scheduleFor.id).filter(a => a.day_of_week === day);
                return slots.map((slot, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(212,175,135,0.07)',
                    borderRadius: 10,
                    border: '1px solid rgba(212,175,135,0.15)',
                  }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{slot.day_of_week}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-accent)' }}>
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>
                ));
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default Trainers;

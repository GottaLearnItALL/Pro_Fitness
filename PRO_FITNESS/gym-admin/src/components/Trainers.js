import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  getUsers, createUser, updateUser, deleteUser,
  getTrainerAvailability, addTrainerAvailability, deleteTrainerAvailability,
} from '../api';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const EMPTY_FORM = { f_name:'', l_name:'', email:'', phone:'', address:'', password:'', role:'trainer'};
const EMPTY_SLOT = { day_of_week:'monday', start_time:'09:00', end_time:'17:00' };

/* ─── Slide-over Panel ─────────────────────────────────────── */
function TrainerPanel({ trainer, allAvailability, onClose, onSaved }) {
  const isEdit = Boolean(trainer);

  const [form, setForm] = useState(
    isEdit
      ? { f_name: trainer.first_name||'', l_name: trainer.last_name||'', email: trainer.email||'', phone: trainer.phone||'', address: trainer.address||'', password:'' }
      : EMPTY_FORM
  );
  const [slots,     setSlots]   = useState(
    isEdit ? allAvailability.filter(a => a.trainer_id === trainer.id) : []
  );
  const [newSlot,   setNewSlot] = useState(EMPTY_SLOT);
  const [toRemove,  setToRemove] = useState([]);   // slot IDs to delete on save
  const [toAdd,     setToAdd]   = useState([]);    // unsaved new slots
  const [saving,    setSaving]  = useState(false);
  const [error,     setError]   = useState('');
  const bodyRef = useRef(null);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setSlot = k => e => setNewSlot(s => ({ ...s, [k]: e.target.value }));

  const addPendingSlot = () => {
    if (newSlot.start_time >= newSlot.end_time) {
      setError('Start time must be before end time.'); return;
    }
    setToAdd(prev => [...prev, { ...newSlot }]);
    setNewSlot(EMPTY_SLOT);
    setError('');
  };

  const removeSaved = (slot) => {
    setSlots(prev => prev.filter(s => s.id !== slot.id));
    setToRemove(prev => [...prev, slot.id]);
  };

  const removePending = (i) => setToAdd(prev => prev.filter((_, j) => j !== i));

  const handleSave = async () => {
    setError('');
    if (!form.f_name.trim() || !form.l_name.trim() || !form.email.trim()) {
      setError('First name, last name and email are required.'); return;
    }
    if (!isEdit && !form.password) {
      setError('Temporary password is required.'); return;
    }
    setSaving(true);
    try {
      let trainerId = trainer?.id;

      if (isEdit) {
        await updateUser(trainer.id, {
          f_name: form.f_name, l_name: form.l_name,
          email: form.email,   phone: form.phone, address: form.address,
        });
      } else {
        // Create trainer — password is hashed server-side via register endpoint
        const res = await createUser({
          f_name: form.f_name, l_name: form.l_name,
          email: form.email,   phone: form.phone, address: form.address,
          role:  'trainer',    password: form.password,
        });
        trainerId = res.data?.id;
      }

      // Apply availability changes
      await Promise.all([
        ...toRemove.map(id => deleteTrainerAvailability(id).catch(() => {})),
        ...toAdd.map(s => addTrainerAvailability({ trainer_id: trainerId, ...s }).catch(() => {})),
      ]);

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const allSlots = [
    ...slots.map(s => ({ ...s, pending: false })),
    ...toAdd.map(s => ({ ...s, id: null, pending: true })),
  ].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week));

  return (
    <>
      <div className="ts-backdrop" onClick={onClose} />
      <div className="ts-panel">

        {/* Header */}
        <div className="ts-header">
          <div>
            <div className="ts-header-title">
              {isEdit ? `Edit Trainer` : 'Add Trainer'}
            </div>
            {isEdit && (
              <div className="ts-header-sub">
                {trainer.first_name} {trainer.last_name}
              </div>
            )}
          </div>
          <button className="ts-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="ts-body" ref={bodyRef}>
          {error && <div className="error-banner">{error}</div>}

          <div className="ts-section-label">Basic Info</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-input" placeholder="Mike" value={form.f_name} onChange={set('f_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-input" placeholder="Chen" value={form.l_name} onChange={set('l_name')} />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="mike@haachiko.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="5550001234" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" placeholder="123 Main St" value={form.address} onChange={set('address')} />
            </div>
            {!isEdit && (
              <div className="form-group full-width">
                <label className="form-label">Temporary Password *</label>
                <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} />
                <span style={{ fontSize:12, color:'var(--color-text-muted)', marginTop:4, display:'block' }}>
                  The trainer will use this to log in for the first time.
                </span>
              </div>
            )}
          </div>

          {/* Availability slots */}
          <div className="ts-section-label" style={{ marginTop: 28 }}>
            Availability Slots
            <span style={{ fontWeight:400, color:'var(--color-text-muted)', marginLeft:8 }}>
              ({allSlots.length} day{allSlots.length !== 1 ? 's' : ''})
            </span>
          </div>

          {allSlots.length === 0 ? (
            <div className="ts-avail-empty">No slots added yet</div>
          ) : (
            <div className="ts-avail-list">
              {allSlots.map((slot, i) => (
                <div key={i} className={`ts-avail-slot ${slot.pending ? 'ts-avail-slot-pending' : ''}`}>
                  <span className="ts-avail-day">{slot.day_of_week}</span>
                  <span className="ts-avail-time">
                    {slot.start_time} – {slot.end_time}
                  </span>
                  {slot.pending && <span className="ts-avail-new-badge">new</span>}
                  <button
                    className="ts-avail-remove"
                    onClick={() => slot.pending ? removePending(i - slots.length) : removeSaved(slot)}
                    title="Remove slot"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Add slot inline form */}
          <div className="ts-avail-add">
            <div className="ts-avail-add-label">+ Add slot</div>
            <div className="ts-avail-add-row">
              <select className="form-select ts-avail-select" value={newSlot.day_of_week} onChange={setSlot('day_of_week')}>
                {DAYS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
              <input type="time" className="form-input ts-avail-time-input" value={newSlot.start_time} onChange={setSlot('start_time')} />
              <span style={{ color:'var(--color-text-muted)', flexShrink:0 }}>to</span>
              <input type="time" className="form-input ts-avail-time-input" value={newSlot.end_time} onChange={setSlot('end_time')} />
              <button className="btn btn-secondary ts-avail-add-btn" onClick={addPendingSlot}>Add</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ts-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Trainer'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Delete confirmation ──────────────────────────────────── */
function DeleteConfirm({ trainer, onConfirm, onCancel }) {
  return (
    <>
      <div className="ts-backdrop" onClick={onCancel} />
      <div className="ts-confirm">
        <div className="ts-confirm-icon">⚠</div>
        <div className="ts-confirm-title">Remove Trainer</div>
        <div className="ts-confirm-msg">
          Are you sure you want to remove <strong>{trainer.first_name} {trainer.last_name}</strong>?
          This action cannot be undone.
        </div>
        <div className="ts-confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function Trainers() {
  const [trainers,     setTrainers]     = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [panelFor,     setPanelFor]     = useState(undefined); // undefined=closed, null=add, trainer=edit
  const [deleteFor,    setDeleteFor]    = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([getUsers(), getTrainerAvailability()])
      .then(([uRes, aRes]) => {
        setTrainers((uRes.data?.Data || []).filter(u => u.role === 'trainer'));
        const raw = aRes.data;
        setAvailability(Array.isArray(raw?.Data) ? raw.Data : Array.isArray(raw) ? raw : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    try { await deleteUser(deleteFor.id); setTrainers(prev => prev.filter(t => t.id !== deleteFor.id)); }
    catch { alert('Failed to remove trainer.'); }
    finally { setDeleteFor(null); }
  };

  const trainerAvail  = id => availability.filter(a => a.trainer_id === id);
  const getInitials   = t  => `${(t.first_name||'?')[0]}${(t.last_name||'?')[0]}`.toUpperCase();
  const isAvailable   = id => trainerAvail(id).length > 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Trainer Management</h2>
        <button className="btn btn-primary" onClick={() => setPanelFor(null)}>+ Add Trainer</button>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /> Loading trainers…</div>
      ) : trainers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◉</div>
          <p>No trainers yet — add your first one!</p>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="trainer-table">
            <thead>
              <tr>
                <th style={{ width:56 }}></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Days</th>
                <th style={{ width:140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map(t => {
                const avail    = trainerAvail(t.id);
                const dayCount = avail.length;
                const available = isAvailable(t.id);

                return (
                  <tr key={t.id} className="trainer-row">
                    <td>
                      <div className="tr-avatar">{getInitials(t)}</div>
                    </td>
                    <td>
                      <div className="tr-name">{t.first_name} {t.last_name}</div>
                    </td>
                    <td>
                      <div className="tr-meta">{t.email || '—'}</div>
                    </td>
                    <td>
                      <div className="tr-meta">{t.phone || '—'}</div>
                    </td>
                    <td>
                      <span className={`tr-badge ${available ? 'tr-badge-available' : 'tr-badge-unavailable'}`}>
                        {available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div className="tr-days">
                        {dayCount > 0
                          ? <><span className="tr-days-num">{dayCount}</span> day{dayCount !== 1 ? 's' : ''}</>
                          : <span style={{ color:'var(--color-text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div className="tr-actions">
                        <button className="tr-btn tr-btn-edit" onClick={() => setPanelFor(t)}>Edit</button>
                        <button className="tr-btn tr-btn-remove" onClick={() => setDeleteFor(t)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over panel */}
      {panelFor !== undefined && (
        <TrainerPanel
          trainer={panelFor}
          allAvailability={availability}
          onClose={() => setPanelFor(undefined)}
          onSaved={fetchData}
        />
      )}

      {/* Delete confirmation */}
      {deleteFor && (
        <DeleteConfirm
          trainer={deleteFor}
          onConfirm={handleDelete}
          onCancel={() => setDeleteFor(null)}
        />
      )}
    </div>
  );
}

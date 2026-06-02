import React, { useState, useMemo } from 'react';
import IC from './icons';
import SlideOver from './SlideOver';
import {
  register as apiRegister, getUsers, updateUser, deleteUser,
  addTrainerAvailability, deleteTrainerAvailability,
} from '../../api';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const PAGE_SIZE = 8;
const EMPTY_FORM = { f_name:'', l_name:'', email:'', phone:'', address:'', password:'' };
const EMPTY_SLOT = { day_of_week:'monday', start_time:'09:00', end_time:'17:00' };

/* Cryptographically-random 16-char password, guaranteed to contain
   an uppercase, lowercase, digit and symbol. */
function generatePassword(len = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const nums  = '23456789';
  const syms  = '!@#$%^&*-_=+';
  const all   = upper + lower + nums + syms;
  const rand  = (set) => set[Math.floor((window.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Math.random() * 2 ** 32) / 2 ** 32 * set.length)];
  const chars = [rand(upper), rand(lower), rand(nums), rand(syms)];
  while (chars.length < len) chars.push(rand(all));
  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor((window.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Math.random() * 2 ** 32) / 2 ** 32 * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function TrainerForm({ initial, isEdit, availability, onClose, onSaved }) {
  const [form, setForm]   = useState(initial || EMPTY_FORM);
  const [slots, setSlots] = useState(isEdit ? availability.filter(a => a.trainer_id === initial.id) : []);
  const [toAdd, setToAdd] = useState([]);
  const [toRemove, setToRemove] = useState([]);
  const [newSlot, setNewSlot]   = useState(EMPTY_SLOT);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setSlotField = k => e => setNewSlot(s => ({ ...s, [k]: e.target.value }));

  const handleGenerate = () => {
    setForm(f => ({ ...f, password: generatePassword(16) }));
    setCopied(false);
  };
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(form.password); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard unavailable */ }
  };

  const addSlot = () => {
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

  const save = async () => {
    setError('');
    if (!form.f_name.trim() || !form.l_name.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.'); return;
    }
    if (!isEdit && !form.password) {
      setError('Temporary password is required.'); return;
    }
    setSaving(true);
    try {
      let trainerId = initial?.id;
      if (isEdit) {
        await updateUser(initial.id, {
          f_name: form.f_name, l_name: form.l_name,
          email: form.email, phone: form.phone, address: form.address,
        });
      } else {
        // New trainer goes through the public /register endpoint
        await apiRegister({
          f_name: form.f_name, l_name: form.l_name,
          email: form.email, phone: form.phone, address: form.address,
          role: 'trainer', password: form.password,
        });
        // /register doesn't return the new id — look it up by email
        try {
          const res = await getUsers();
          const all = Array.isArray(res.data?.Data) ? res.data.Data : Array.isArray(res.data) ? res.data : [];
          trainerId = all.find(u => u.email === form.email)?.id;
        } catch { /* slots will be skipped if id can't be resolved */ }
      }
      await Promise.all([
        ...toRemove.map(id => deleteTrainerAvailability(id).catch(() => {})),
        ...toAdd.map(s => addTrainerAvailability({ trainer_id: trainerId, ...s }).catch(() => {})),
      ]);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const allSlots = [
    ...slots.map(s => ({ ...s, pending: false })),
    ...toAdd.map(s => ({ ...s, id: null, pending: true })),
  ].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week));

  return (
    <SlideOver
      title={isEdit ? 'Edit Trainer' : 'Add New Trainer'}
      sub={isEdit ? `${initial.f_name} ${initial.l_name}` : 'Onboard a new trainer with credentials'}
      onClose={onClose}
      footer={
        <>
          <button className="ad-btn ad-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Trainer'}
          </button>
        </>
      }
    >
      {error && <div className="ad-error">{error}</div>}

      <div className="ad-panel-section-label">Personal Details</div>
      <div className="ad-form-grid">
        <div className="ad-form-group">
          <label className="ad-form-label">First Name *</label>
          <input className="ad-form-input" placeholder="Mike" value={form.f_name} onChange={set('f_name')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Last Name *</label>
          <input className="ad-form-input" placeholder="Chen" value={form.l_name} onChange={set('l_name')} />
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Email *</label>
          <input className="ad-form-input" type="email" placeholder="mike@haachiko.com" value={form.email} onChange={set('email')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Phone</label>
          <input className="ad-form-input" placeholder="555-0100" value={form.phone || ''} onChange={set('phone')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Address</label>
          <input className="ad-form-input" placeholder="123 Main St" value={form.address || ''} onChange={set('address')} />
        </div>
        {!isEdit && (
          <div className="ad-form-group full">
            <label className="ad-form-label">Temporary Password *</label>
            <div className="ad-pw-row">
              <input
                className="ad-form-input ad-pw-input"
                type="text"
                placeholder="Click Generate or type a password"
                value={form.password}
                onChange={set('password')}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="ad-btn ad-btn-secondary ad-pw-generate" onClick={handleGenerate}>
                <IC.Refresh /> Generate
              </button>
            </div>
            <div className="ad-pw-meta">
              <span className="ad-form-hint"><IC.Lock /> Secure 16-character password for the trainer's first login.</span>
              {form.password && (
                <button type="button" className="ad-pw-copy" onClick={handleCopy}>
                  <IC.Copy /> {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ad-panel-section-label">
        Availability Slots <span style={{ color:'#a0aab8', fontWeight: 400 }}>({allSlots.length} {allSlots.length === 1 ? 'day' : 'days'})</span>
      </div>

      {allSlots.length > 0 ? (
        <div className="ad-slot-list">
          {allSlots.map((slot, i) => (
            <div key={i} className="ad-slot">
              <span className="ad-slot-day">{slot.day_of_week}</span>
              <span className="ad-slot-time"><IC.Clock /> {slot.start_time} – {slot.end_time}</span>
              {slot.pending && <span className="ad-slot-new">new</span>}
              <button
                className="ad-slot-remove"
                onClick={() => slot.pending ? removePending(i - slots.length) : removeSaved(slot)}
                title="Remove slot"
              ><IC.X /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="ad-slot-empty">No availability slots yet — add one below.</div>
      )}

      <div className="ad-slot-add">
        <div className="ad-slot-add-title"><IC.Plus /> Add a working slot</div>
        <div className="ad-slot-add-row">
          <div className="ad-form-group">
            <label className="ad-form-label">Day</label>
            <select className="ad-form-select" value={newSlot.day_of_week} onChange={setSlotField('day_of_week')}>
              {DAYS.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div className="ad-form-group">
            <label className="ad-form-label">From</label>
            <input className="ad-form-input" type="time" value={newSlot.start_time} onChange={setSlotField('start_time')} />
          </div>
          <div className="ad-form-group">
            <label className="ad-form-label">To</label>
            <input className="ad-form-input" type="time" value={newSlot.end_time} onChange={setSlotField('end_time')} />
          </div>
          <button className="ad-btn ad-btn-primary ad-slot-add-btn" onClick={addSlot} title="Add slot"><IC.Plus /></button>
        </div>
      </div>
    </SlideOver>
  );
}

export default function AdminTrainers({ users, sessions, availability, loading, refresh }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]   = useState(1);
  const [panel, setPanel] = useState(null);   // null | 'add' | trainer object

  const trainers = useMemo(() => users.filter(u => u.role === 'trainer'), [users]);

  const enriched = useMemo(() => trainers.map(t => {
    const slots = availability.filter(a => a.trainer_id === t.id);
    const upcoming = sessions.filter(s => s.trainer_id === t.id && new Date(s.scheduled_at) >= new Date() && s.status === 'scheduled').length;
    return {
      ...t,
      name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || '—',
      daysCount: slots.length,
      upcoming,
      isAvailable: slots.length > 0,
    };
  }), [trainers, availability, sessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(t => {
      const matchSearch = !q || `${t.name} ${t.email}`.toLowerCase().includes(q);
      const matchStatus = status === 'all' ||
        (status === 'available' && t.isAvailable) ||
        (status === 'unavailable' && !t.isAvailable);
      return matchSearch && matchStatus;
    });
  }, [enriched, search, status]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showingFrom = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo   = Math.min(page * PAGE_SIZE, sorted.length);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '↕';

  const handleDelete = async (t) => {
    if (!window.confirm(`Remove ${t.name}? This cannot be undone.`)) return;
    try { await deleteUser(t.id); refresh(); }
    catch { alert('Failed to remove trainer.'); }
  };

  const initials = (t) => `${(t.first_name||'?')[0]}${(t.last_name||'?')[0]}`.toUpperCase();

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Trainers</div>
          <div className="ad-page-sub">{enriched.length} trainers on staff · {enriched.filter(t => t.isAvailable).length} available</div>
        </div>
        <div className="ad-page-actions">
          <div className="ad-search">
            <IC.Search />
            <input placeholder="Search trainers…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="ad-filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All trainers</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <button className="ad-btn ad-btn-primary" onClick={() => setPanel('add')}>
            <IC.Plus /> Add Trainer
          </button>
        </div>
      </div>

      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading"><span className="ad-spinner" /> Loading trainers…</div>
        ) : pageItems.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon"><IC.Trainer /></div>
            <div className="ad-empty-text">No trainers yet — add your first one!</div>
          </div>
        ) : (
          <>
            <table className="ad-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')}      className={sortKey === 'name'      ? 'sorted' : ''}>Trainer    <span className="ad-sort-arrow">{sortIcon('name')}</span></th>
                  <th onClick={() => toggleSort('email')}     className={sortKey === 'email'     ? 'sorted' : ''}>Email      <span className="ad-sort-arrow">{sortIcon('email')}</span></th>
                  <th className="no-sort">Phone</th>
                  <th onClick={() => toggleSort('daysCount')} className={sortKey === 'daysCount' ? 'sorted' : ''}>Working Days <span className="ad-sort-arrow">{sortIcon('daysCount')}</span></th>
                  <th onClick={() => toggleSort('upcoming')}  className={sortKey === 'upcoming'  ? 'sorted' : ''}>Upcoming   <span className="ad-sort-arrow">{sortIcon('upcoming')}</span></th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(t => (
                  <tr key={t.id} onClick={() => setPanel(t)}>
                    <td>
                      <div className="ad-row-user">
                        <div className="ad-row-avatar">{initials(t)}</div>
                        <div className="ad-row-name">{t.name}</div>
                      </div>
                    </td>
                    <td style={{ color: '#6c757d' }}>{t.email || '—'}</td>
                    <td style={{ color: '#6c757d' }}>{t.phone || '—'}</td>
                    <td><strong style={{ color: '#001427' }}>{t.daysCount}</strong> {t.daysCount === 1 ? 'day' : 'days'}</td>
                    <td><strong style={{ color: '#001427' }}>{t.upcoming}</strong> sessions</td>
                    <td>
                      <span className={`ad-badge ad-badge-${t.isAvailable ? 'active' : 'inactive'}`}>
                        {t.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="ad-row-actions">
                        <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setPanel(t)}>
                          <IC.Edit /> Edit
                        </button>
                        <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ color: '#BF0603' }} onClick={() => handleDelete(t)}>
                          <IC.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ad-pagination">
              <div>Showing {showingFrom}–{showingTo} of {sorted.length}</div>
              <div className="ad-pagination-controls">
                <button className="ad-pagination-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                <button className="ad-pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                  <button key={i} className={`ad-pagination-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </button>
                ))}
                <button className="ad-pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                <button className="ad-pagination-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {panel && (
        <TrainerForm
          initial={panel === 'add' ? null : { ...EMPTY_FORM, ...panel, f_name: panel.first_name, l_name: panel.last_name, id: panel.id }}
          isEdit={panel !== 'add'}
          availability={availability}
          onClose={() => setPanel(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import IC from './icons';
import SlideOver from './SlideOver';
import { createUser, updateUser, deleteUser } from '../../api';

const COUNTRY_CODES = [
  { code: '+1',  flag: 'US', label: 'US +1' },
  { code: '+44', flag: 'GB', label: 'UK +44' },
  { code: '+91', flag: 'IN', label: 'IN +91' },
  { code: '+61', flag: 'AU', label: 'AU +61' },
  { code: '+81', flag: 'JP', label: 'JP +81' },
  { code: '+49', flag: 'DE', label: 'DE +49' },
  { code: '+33', flag: 'FR', label: 'FR +33' },
  { code: '+86', flag: 'CN', label: 'CN +86' },
  { code: '+55', flag: 'BR', label: 'BR +55' },
  { code: '+971',flag: 'AE', label: 'AE +971' },
  { code: '+65', flag: 'SG', label: 'SG +65' },
  { code: '+82', flag: 'KR', label: 'KR +82' },
  { code: '+39', flag: 'IT', label: 'IT +39' },
  { code: '+34', flag: 'ES', label: 'ES +34' },
  { code: '+52', flag: 'MX', label: 'MX +52' },
  { code: '+7',  flag: 'RU', label: 'RU +7' },
  { code: '+27', flag: 'ZA', label: 'ZA +27' },
  { code: '+64', flag: 'NZ', label: 'NZ +64' },
  { code: '+46', flag: 'SE', label: 'SE +46' },
  { code: '+41', flag: 'CH', label: 'CH +41' },
];

const COUNTRIES = [
  'United States','United Kingdom','India','Australia','Japan','Germany','France',
  'China','Brazil','United Arab Emirates','Singapore','South Korea','Italy','Spain',
  'Mexico','Russia','South Africa','New Zealand','Sweden','Switzerland','Canada',
  'Netherlands','Belgium','Austria','Norway','Denmark','Finland','Ireland','Portugal',
  'Poland','Turkey','Saudi Arabia','Thailand','Indonesia','Philippines','Malaysia',
  'Vietnam','Argentina','Colombia','Chile','Egypt','Nigeria','Kenya','Pakistan',
];

const EMPTY = { f_name: '', l_name: '', email: '', phone: '', phone_code: '+1', country: '', city: '', street: '' };
const PAGE_SIZE = 8;

function ClientForm({ initial, isEdit, onClose, onSaved }) {
  const [form, setForm]     = useState(initial || EMPTY);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.f_name || !form.l_name || !form.email) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updateUser(initial.id, form);
      else        await createUser({ ...form, role: 'client' });
      onSaved(); onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <SlideOver
      title={isEdit ? 'Edit Client' : 'Add New Client'}
      sub={isEdit ? `${initial.first_name || ''} ${initial.last_name || ''}` : 'Register a new member'}
      onClose={onClose}
      footer={
        <>
          <button className="ad-btn ad-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Client'}
          </button>
        </>
      }
    >
      {error && <div className="ad-error">{error}</div>}

      <div className="ad-panel-section-label">Personal Details</div>
      <div className="ad-form-grid">
        <div className="ad-form-group">
          <label className="ad-form-label">First Name *</label>
          <input className="ad-form-input" placeholder="Jane" value={form.f_name} onChange={set('f_name')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Last Name *</label>
          <input className="ad-form-input" placeholder="Doe" value={form.l_name} onChange={set('l_name')} />
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Email *</label>
          <input className="ad-form-input" type="email" placeholder="jane@example.com" value={form.email} onChange={set('email')} />
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Phone</label>
          <div className="ad-phone-group">
            <select className="ad-form-select ad-phone-code" value={form.phone_code || '+1'} onChange={set('phone_code')}>
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input className="ad-form-input ad-phone-number" placeholder="555-0100" value={form.phone || ''} onChange={set('phone')} />
          </div>
        </div>
      </div>

      <div className="ad-panel-section-label">Address</div>
      <div className="ad-form-grid">
        <div className="ad-form-group">
          <label className="ad-form-label">Country</label>
          <select className="ad-form-select" value={form.country || ''} onChange={set('country')}>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">City</label>
          <input className="ad-form-input" placeholder="New York" value={form.city || ''} onChange={set('city')} />
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Street Address</label>
          <input className="ad-form-input" placeholder="123 Main St, Apt 4B" value={form.street || ''} onChange={set('street')} />
        </div>
      </div>
    </SlideOver>
  );
}

export default function AdminClients({ users, memberships, plans, sessions, loading, refresh }) {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);
  const [panel, setPanel]     = useState(null);   // null | 'add' | client object
  const [expanded, setExpanded] = useState(null);  // client id

  const clients = useMemo(() => users.filter(u => u.role === 'client'), [users]);

  const enriched = useMemo(() => clients.map(c => {
    const mem = memberships.find(m => m.client_id === c.id);
    const plan = mem ? plans.find(p => p.id === mem.plan_id) : null;
    const userSessions = sessions.filter(s => s.client_id === c.id);
    return {
      ...c,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—',
      planName: plan?.name || '—',
      sessionsRemaining: mem?.sessions_remaining ?? null,
      membershipStatus: mem?.status || (c.is_active ? 'active' : 'inactive'),
      totalSessions: userSessions.length,
      completedSessions: userSessions.filter(s => s.status === 'completed').length,
    };
  }), [clients, memberships, plans, sessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(c => {
      const matchSearch = !q || `${c.name} ${c.email}`.toLowerCase().includes(q);
      const matchStatus = status === 'all' || c.membershipStatus === status;
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

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    console.log(typeof(c.id));
    try { 
      await deleteUser(c.id);
      refresh();
    }catch { alert('Failed to delete client.'); }
  };

  const initials = (c) => `${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}`.toUpperCase();

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Clients</div>
          <div className="ad-page-sub">{enriched.length} total members · {filtered.length} shown</div>
        </div>
        <div className="ad-page-actions">
          <div className="ad-search">
            <IC.Search />
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="ad-filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="ad-btn ad-btn-primary" onClick={() => setPanel('add')}>
            <IC.Plus /> Add Client
          </button>
        </div>
      </div>

      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading"><span className="ad-spinner" /> Loading clients…</div>
        ) : pageItems.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon"><IC.Users /></div>
            <div className="ad-empty-text">
              {search || status !== 'all' ? 'No clients match your filters.' : 'No clients yet — add your first member!'}
            </div>
          </div>
        ) : (
          <>
            <table className="ad-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')}              className={sortKey === 'name' ? 'sorted' : ''}>Client <span className="ad-sort-arrow">{sortIcon('name')}</span></th>
                  <th onClick={() => toggleSort('email')}             className={sortKey === 'email' ? 'sorted' : ''}>Email <span className="ad-sort-arrow">{sortIcon('email')}</span></th>
                  <th className="no-sort">Phone</th>
                  <th onClick={() => toggleSort('planName')}          className={sortKey === 'planName' ? 'sorted' : ''}>Plan <span className="ad-sort-arrow">{sortIcon('planName')}</span></th>
                  <th onClick={() => toggleSort('sessionsRemaining')} className={sortKey === 'sessionsRemaining' ? 'sorted' : ''}>Sessions <span className="ad-sort-arrow">{sortIcon('sessionsRemaining')}</span></th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(c => (
                  <React.Fragment key={c.id}>
                    <tr
                      className={expanded === c.id ? 'expanded' : ''}
                      onClick={() => setExpanded(prev => prev === c.id ? null : c.id)}
                    >
                      <td>
                        <div className="ad-row-user">
                          <div className="ad-row-avatar amber">{initials(c)}</div>
                          <div className="ad-row-name">{c.name}</div>
                        </div>
                      </td>
                      <td style={{ color: '#6c757d' }}>{c.email || '—'}</td>
                      <td style={{ color: '#6c757d' }}>{c.phone || '—'}</td>
                      <td>
                        {c.planName !== '—'
                          ? <span className="ad-badge ad-badge-amber plain">{c.planName}</span>
                          : <span style={{ color: '#a0aab8' }}>—</span>}
                      </td>
                      <td>{c.sessionsRemaining ?? '—'}</td>
                      <td>
                        <span className={`ad-badge ad-badge-${c.membershipStatus === 'active' ? 'active' : 'inactive'}`}>
                          {c.membershipStatus === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="ad-row-actions">
                          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setExpanded(prev => prev === c.id ? null : c.id)}>
                            <IC.Eye />
                          </button>
                          <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setPanel(c)}>
                            <IC.Edit />
                          </button>
                          <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ color: '#BF0603' }} onClick={() => handleDelete(c)}>
                            <IC.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr className="expand-row">
                        <td colSpan={7} className="ad-row-expanded">
                          <div className="ad-row-expanded-grid">
                            <div>
                              <div className="ad-row-detail-label">Member ID</div>
                              <div className="ad-row-detail-value">#{c.id}</div>
                            </div>
                            <div>
                              <div className="ad-row-detail-label">Location</div>
                              <div className="ad-row-detail-value">
                                {[c.street, c.city, c.country].filter(Boolean).join(', ') || c.address || '—'}
                              </div>
                            </div>
                            <div>
                              <div className="ad-row-detail-label">Plan</div>
                              <div className="ad-row-detail-value">{c.planName}</div>
                            </div>
                            <div>
                              <div className="ad-row-detail-label">Sessions Completed</div>
                              <div className="ad-row-detail-value">{c.completedSessions}</div>
                            </div>
                            <div>
                              <div className="ad-row-detail-label">Total Sessions</div>
                              <div className="ad-row-detail-value">{c.totalSessions}</div>
                            </div>
                            <div>
                              <div className="ad-row-detail-label">Sessions Remaining</div>
                              <div className="ad-row-detail-value">{c.sessionsRemaining ?? 'Unlimited'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        <ClientForm
          initial={panel === 'add' ? null : { ...EMPTY, ...panel, f_name: panel.first_name, l_name: panel.last_name, id: panel.id, country: panel.country || '', city: panel.city || '', street: panel.street || '' }}
          isEdit={panel !== 'add'}
          onClose={() => setPanel(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

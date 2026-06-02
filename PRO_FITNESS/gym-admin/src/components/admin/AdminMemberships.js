import React, { useState, useMemo } from 'react';
import IC from './icons';
import SlideOver from './SlideOver';
import { fmtDate as fmtDateTz } from '../../timezone';
import {
  createMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
} from '../../api';

const EMPTY_PLAN = { name: '', duration_days: 30, session_limit: '', price: '' };

function PlanForm({ initial, isEdit, onClose, onSaved }) {
  const [form, setForm]   = useState(initial || EMPTY_PLAN);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.name || !form.duration_days || !form.price) {
      setError('Name, duration, and price are required.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        name:           form.name,
        duration_days:  parseInt(form.duration_days),
        session_limit:  form.session_limit ? parseInt(form.session_limit) : null,
        price:          parseFloat(form.price),
      };
      if (isEdit) await updateMembershipPlan(initial.id, payload);
      else        await createMembershipPlan(payload);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save plan. (Backend may not support plan editing.)');
    } finally { setSaving(false); }
  };

  return (
    <SlideOver
      title={isEdit ? 'Edit Membership Plan' : 'Add Membership Plan'}
      sub={isEdit ? initial.name : 'Define a new plan offering'}
      onClose={onClose}
      footer={
        <>
          <button className="ad-btn ad-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Plan'}
          </button>
        </>
      }
    >
      {error && <div className="ad-error">{error}</div>}
      <div className="ad-panel-section-label">Plan Details</div>
      <div className="ad-form-grid">
        <div className="ad-form-group full">
          <label className="ad-form-label">Plan Name *</label>
          <input className="ad-form-input" placeholder="e.g. Monthly Premium" value={form.name} onChange={set('name')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Duration (days) *</label>
          <input className="ad-form-input" type="number" min="1" value={form.duration_days} onChange={set('duration_days')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Sessions Included</label>
          <input className="ad-form-input" type="number" min="0" placeholder="Leave empty for unlimited" value={form.session_limit || ''} onChange={set('session_limit')} />
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Price (USD) *</label>
          <input className="ad-form-input" type="number" step="0.01" min="0" placeholder="99.00" value={form.price} onChange={set('price')} />
        </div>
      </div>
    </SlideOver>
  );
}

export default function AdminMemberships({ users, memberships, plans, loading, refresh }) {
  const [planPanel, setPlanPanel]     = useState(null);  // null | 'add' | plan
  const [planSearch, setPlanSearch]   = useState('');
  const [memSearch, setMemSearch]     = useState('');
  const [memStatus, setMemStatus]     = useState('all');

  const enrichedPlans = useMemo(() => plans.map(p => ({
    ...p,
    activeCount: memberships.filter(m => m.plan_id === p.id && (m.status === 'active' || !m.status)).length,
  })), [plans, memberships]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.toLowerCase();
    return enrichedPlans.filter(p => !q || p.name.toLowerCase().includes(q));
  }, [enrichedPlans, planSearch]);

  const enrichedMems = useMemo(() => memberships.map(m => {
    const c = users.find(u => u.id === m.client_id);
    const p = plans.find(pl => pl.id === m.plan_id);
    return {
      ...m,
      clientName: c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : `Client #${m.client_id}`,
      clientInitials: c ? `${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}`.toUpperCase() : '?',
      planName: p?.name || '—',
    };
  }), [memberships, users, plans]);

  const filteredMems = useMemo(() => {
    const q = memSearch.toLowerCase();
    return enrichedMems.filter(m => {
      const matchSearch = !q || `${m.clientName} ${m.planName}`.toLowerCase().includes(q);
      const matchStatus = memStatus === 'all' || (m.status || 'active') === memStatus;
      return matchSearch && matchStatus;
    });
  }, [enrichedMems, memSearch, memStatus]);

  const fmtDate = (iso) => fmtDateTz(iso, { month: 'short', day: 'numeric', year: 'numeric' });

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? Active memberships will not be removed.`)) return;
    try { await deleteMembershipPlan(plan.id); refresh(); }
    catch { alert('Failed to delete plan. (Backend may not support plan deletion.)'); }
  };

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Memberships</div>
          <div className="ad-page-sub">Manage plans and view all active memberships</div>
        </div>
      </div>

      {/* ── Plans table ─────────────────────────────────────── */}
      <div className="ad-card ad-card-flush" style={{ marginBottom: 28, overflow: 'hidden' }}>
        <div className="ad-card-header" style={{ padding: '24px 28px 0', marginBottom: 14 }}>
          <div>
            <div className="ad-section-title">Membership Plans</div>
            <div className="ad-section-sub">{enrichedPlans.length} plans available</div>
          </div>
          <div className="ad-page-actions">
            <div className="ad-search" style={{ marginRight: 8 }}>
              <IC.Search />
              <input placeholder="Search plans…" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
            </div>
            <button className="ad-btn ad-btn-primary" onClick={() => setPlanPanel('add')}>
              <IC.Plus /> Add Plan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ad-loading"><span className="ad-spinner" /> Loading plans…</div>
        ) : filteredPlans.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon"><IC.Membership /></div>
            <div className="ad-empty-text">{planSearch ? 'No plans match your search.' : 'No plans yet — add your first one!'}</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th className="no-sort">Plan Name</th>
                <th className="no-sort">Duration</th>
                <th className="no-sort">Sessions</th>
                <th className="no-sort">Price</th>
                <th className="no-sort">Active Members</th>
                <th className="no-sort" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map(p => (
                <tr key={p.id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="ad-row-user">
                      <div className="ad-row-avatar amber"><IC.Membership /></div>
                      <div className="ad-row-name">{p.name}</div>
                    </div>
                  </td>
                  <td>{p.duration_days} days</td>
                  <td>{p.session_limit ?? 'Unlimited'}</td>
                  <td><strong style={{ color: '#001427' }}>${p.price}</strong></td>
                  <td><span className="ad-badge ad-badge-amber plain">{p.activeCount} members</span></td>
                  <td>
                    <div className="ad-row-actions">
                      <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setPlanPanel(p)}>
                        <IC.Edit /> Edit
                      </button>
                      <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ color: '#BF0603' }} onClick={() => handleDeletePlan(p)}>
                        <IC.Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Active Memberships table ─────────────────────────── */}
      <div className="ad-card ad-card-flush" style={{ overflow: 'hidden' }}>
        <div className="ad-card-header" style={{ padding: '24px 28px 0', marginBottom: 14 }}>
          <div>
            <div className="ad-section-title">Active Memberships</div>
            <div className="ad-section-sub">{enrichedMems.length} total · {filteredMems.length} shown</div>
          </div>
          <div className="ad-page-actions">
            <div className="ad-search" style={{ marginRight: 8 }}>
              <IC.Search />
              <input placeholder="Search by client or plan…" value={memSearch} onChange={e => setMemSearch(e.target.value)} />
            </div>
            <select className="ad-filter-select" value={memStatus} onChange={e => setMemStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ad-loading"><span className="ad-spinner" /> Loading memberships…</div>
        ) : filteredMems.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon"><IC.CreditCard /></div>
            <div className="ad-empty-text">No memberships found</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th className="no-sort">Client</th>
                <th className="no-sort">Plan</th>
                <th className="no-sort">Start Date</th>
                <th className="no-sort">End Date</th>
                <th className="no-sort">Sessions Remaining</th>
                <th className="no-sort">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMems.map(m => (
                <tr key={m.id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="ad-row-user">
                      <div className="ad-row-avatar">{m.clientInitials}</div>
                      <div className="ad-row-name">{m.clientName}</div>
                    </div>
                  </td>
                  <td><span className="ad-badge ad-badge-amber plain">{m.planName}</span></td>
                  <td>{fmtDate(m.start_date)}</td>
                  <td>{fmtDate(m.end_date)}</td>
                  <td><strong style={{ color: '#001427' }}>{m.sessions_remaining ?? '∞'}</strong></td>
                  <td>
                    <span className={`ad-badge ad-badge-${m.status === 'cancelled' ? 'cancelled' : m.status === 'expired' ? 'inactive' : 'active'}`}>
                      {m.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {planPanel && (
        <PlanForm
          initial={planPanel === 'add' ? null : planPanel}
          isEdit={planPanel !== 'add'}
          onClose={() => setPlanPanel(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

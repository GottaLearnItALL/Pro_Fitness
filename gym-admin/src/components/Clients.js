import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import Modal from './Modal';

const EMPTY_FORM = { f_name: '', l_name: '', email: '', phone: '', address: '' };

function Clients() {
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEdit]     = useState(null); // null = add, object = edit
  const [form, setForm]           = useState(EMPTY_FORM);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchClients = useCallback(() => {
    setLoading(true);
    getUsers()
      .then(res => {
        const all = res.data?.Data || [];
        setClients(all.filter(u => u.role === 'client'));
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => {
    setEdit(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEdit(client);
    setForm({
      f_name:  client.first_name || '',
      l_name:  client.last_name  || '',
      email:   client.email      || '',
      phone:   client.phone      || '',
      address: client.address    || '',
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
      if (editTarget) {
        await updateUser(editTarget.id, form);
      } else {
        await createUser({ ...form, role: 'client' });
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      setError('Failed to save client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete ${client.first_name} ${client.last_name}? This cannot be undone.`)) return;
    try {
      await deleteUser(client.id);
      fetchClients();
    } catch {
      alert('Failed to delete client.');
    }
  };

  const getInitials = (c) =>
    `${(c.first_name || '?')[0]}${(c.last_name || '?')[0]}`.toUpperCase();

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Client Management</h2>
        <div className="page-actions">
          <div className="search-input-wrapper">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search clients…"
              className="search-input"
              value={searchTerm}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Client</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state"><div className="spinner" /> Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◎</div>
            <p>{searchTerm ? 'No clients match your search.' : 'No clients yet. Add your first client!'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div className="table-user">
                        <div className="table-avatar">{getInitials(client)}</div>
                        <span className="table-user-name">
                          {client.first_name} {client.last_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#888' }}>{client.email || '–'}</td>
                    <td style={{ color: '#888' }}>{client.phone || '–'}</td>
                    <td style={{ color: '#888', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.address || '–'}
                    </td>
                    <td>
                      <span className={`status ${client.is_active ? 'status-active' : 'status-inactive'}`}>
                        <span className="status-dot" />
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(client)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(client)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          title={editTarget
            ? <><span>◎</span> Edit Client</>
            : <><span>+</span> Add New Client</>}
          onClose={() => { setShowModal(false); setError(''); }}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Client'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            {error && <div className="error-banner">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" placeholder="Jane"
                  value={form.f_name} onChange={e => setForm({ ...form, f_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" placeholder="Doe"
                  value={form.l_name} onChange={e => setForm({ ...form, l_name: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="jane@example.com"
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
    </div>
  );
}

export default Clients;

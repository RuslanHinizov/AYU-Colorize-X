import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Shield, User, GraduationCap, Star, Ban, CheckCircle,
    Edit2, Trash2, X, Activity, Clock, Key, Bell, BellOff,
    Calendar, Zap, Image, Eye, Users as UsersIcon, Plus, Check,
    UserPlus, Lock, Mail, CreditCard, ChevronDown
} from 'lucide-react';
import axios from '../../lib/axios';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const { t } = useLanguage();

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/admin/users');
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await axios.put(`/admin/users/${userId}`, { role: newRole });
            fetchUsers();
        } catch {
            alert(t('common.error'));
        }
    };

    const handleStatusUpdate = async (userId, isActive) => {
        if (!confirm(isActive ? t('admin.confirm.activate') : t('admin.confirm.ban'))) return;
        try {
            await axios.put(`/admin/users/${userId}`, { is_active: isActive });
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, is_active: isActive } : null);
            }
        } catch {
            alert(t('common.error'));
        }
    };

    const handleCreditUpdate = async (userId, currentCredits) => {
        const newCredits = prompt(t('admin.confirm.creditUpdate'), currentCredits);
        if (newCredits === null) return;
        const credits = parseInt(newCredits);
        if (isNaN(credits) || credits < 0) {
            alert(t('admin.confirm.invalidNumber'));
            return;
        }
        try {
            await axios.put(`/admin/users/${userId}`, { credits });
            fetchUsers();
        } catch {
            alert(t('common.error'));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm(t('admin.confirm.delete'))) return;
        try {
            await axios.delete(`/admin/users/${userId}`);
            fetchUsers();
            setSelectedUser(null);
            setSelectedIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.detail || t('common.error'));
        }
    };

    // Bulk actions
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const handleBulkAction = async (action, role = null) => {
        if (selectedIds.size === 0) return;
        const labels = { ban: 'yasaklamak', activate: 'aktifleştirmek', delete: 'silmek', change_role: 'rol değiştirmek' };
        if (!confirm(`${selectedIds.size} kullanıcıyı ${labels[action]} istediğinize emin misiniz?`)) return;

        setBulkLoading(true);
        try {
            await axios.post('/admin/users/bulk', {
                user_ids: Array.from(selectedIds),
                action,
                role
            });
            setSelectedIds(new Set());
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.detail || t('common.error'));
        } finally {
            setBulkLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search);
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && u.is_active) ||
            (filterStatus === 'banned' && !u.is_active);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleConfig = (role) => {
        switch (role) {
            case 'ADMIN': return { icon: Shield, color: 'text-[rgb(var(--color-danger))]', bg: 'bg-[rgb(var(--color-danger)/0.1)]', border: 'border-[rgb(var(--color-danger)/0.2)]' };
            case 'PRO': return { icon: Star, color: 'text-[rgb(var(--color-accent))]', bg: 'bg-[rgb(var(--color-accent)/0.1)]', border: 'border-[rgb(var(--color-accent)/0.2)]' };
            case 'STUDENT': return { icon: GraduationCap, color: 'text-[rgb(var(--color-primary))]', bg: 'bg-[rgb(var(--color-primary)/0.1)]', border: 'border-[rgb(var(--color-primary)/0.2)]' };
            default: return { icon: User, color: 'text-[rgb(var(--color-text-muted))]', bg: 'bg-[rgb(var(--color-surface-elevated)/0.4)]', border: 'border-[rgb(var(--color-border))]' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatProcessingTime = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const proUsers = users.filter(u => u.role === 'PRO').length;
    const studentUsers = users.filter(u => u.role === 'STUDENT').length;

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="spinner w-12 h-12" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="font-display text-3xl lg:text-4xl font-bold text-gradient">
                        {t('admin.userManagement')}
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted))] mt-1 text-sm">Toplam {totalUsers} kullanıcı</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary !py-2.5 !px-4 !text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Yeni Kullanıcı
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-muted)/0.5)]" />
                        <input
                            type="text"
                            placeholder={t('admin.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field !pl-10 !pr-4 w-64 !text-sm !py-2.5"
                        />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Toplam', value: totalUsers, icon: UsersIcon, color: 'primary' },
                    { label: 'Aktif', value: activeUsers, icon: CheckCircle, color: 'success' },
                    { label: 'Pro', value: proUsers, icon: Star, color: 'accent' },
                    { label: 'Öğrenci', value: studentUsers, icon: GraduationCap, color: 'secondary' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card !p-4">
                        <div className="relative flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl bg-[rgb(var(--color-${stat.color})/0.15)]`}>
                                <stat.icon className={`w-4 h-4 text-[rgb(var(--color-${stat.color}))]`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-[10px] text-[rgb(var(--color-text-muted))]">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters + Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="input-field !w-auto !py-2 !text-sm">
                    <option value="all" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Tüm Roller</option>
                    <option value="USER" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">User</option>
                    <option value="STUDENT" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Student</option>
                    <option value="PRO" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Pro</option>
                    <option value="ADMIN" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Admin</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field !w-auto !py-2 !text-sm">
                    <option value="all" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Tüm Durumlar</option>
                    <option value="active" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Aktif</option>
                    <option value="banned" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Yasaklı</option>
                </select>

                {/* Bulk Action Bar */}
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-2 ml-auto"
                        >
                            <span className="text-xs text-[rgb(var(--color-text-muted))] font-medium">
                                {selectedIds.size} seçili
                            </span>
                            <button
                                onClick={() => handleBulkAction('ban')}
                                disabled={bulkLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))] border border-[rgb(var(--color-danger)/0.2)] hover:bg-[rgb(var(--color-danger)/0.2)] transition-all"
                            >
                                <Ban className="w-3 h-3 inline mr-1" />Yasakla
                            </button>
                            <button
                                onClick={() => handleBulkAction('activate')}
                                disabled={bulkLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--color-success)/0.1)] text-[rgb(var(--color-success))] border border-[rgb(var(--color-success)/0.2)] hover:bg-[rgb(var(--color-success)/0.2)] transition-all"
                            >
                                <CheckCircle className="w-3 h-3 inline mr-1" />Aktifleştir
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={bulkLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--color-danger)/0.15)] text-[rgb(var(--color-danger))] border border-[rgb(var(--color-danger)/0.3)] hover:bg-[rgb(var(--color-danger)/0.25)] transition-all"
                            >
                                <Trash2 className="w-3 h-3 inline mr-1" />Sil
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="p-1.5 rounded-lg text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-elevated)/0.5)] transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[rgb(var(--color-border))]">
                                <th className="p-4 w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.size === filteredUsers.length && filteredUsers.length > 0
                                            ? 'bg-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]'
                                            : 'border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary)/0.5)]'
                                        }`}
                                    >
                                        {selectedIds.size === filteredUsers.length && filteredUsers.length > 0 && (
                                            <Check className="w-3 h-3 text-white" />
                                        )}
                                    </button>
                                </th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">{t('admin.table.user')}</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">{t('admin.table.role')}</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">{t('admin.table.credits')}</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider hidden lg:table-cell">İşlemler</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">{t('admin.table.status')}</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider hidden xl:table-cell">Son Aktivite</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">{t('admin.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => {
                                const roleConfig = getRoleConfig(user.role);
                                const RoleIcon = roleConfig.icon;
                                const isSelected = selectedIds.has(user.id);
                                return (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`border-b border-[rgb(var(--color-border)/0.5)] hover:bg-[rgb(var(--color-surface-elevated)/0.3)] transition-colors group ${isSelected ? 'bg-[rgb(var(--color-primary)/0.05)]' : ''}`}
                                    >
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleSelect(user.id)}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]'
                                                    : 'border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary)/0.5)]'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary)/0.2)] to-[rgb(var(--color-secondary)/0.2)] flex items-center justify-center font-bold text-sm text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary)/0.15)]">
                                                    {user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{user.email}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)] font-mono">{user.id.slice(0, 8)}...</p>
                                                        {user.has_api_key && <Key className="w-2.5 h-2.5 text-[rgb(var(--color-accent))]" title="API Key" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1 rounded-md ${roleConfig.bg}`}>
                                                    <RoleIcon className={`w-3.5 h-3.5 ${roleConfig.color}`} />
                                                </div>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                    className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] border-none focus:ring-0 text-xs font-medium cursor-pointer rounded-lg"
                                                >
                                                    <option value="USER" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">User</option>
                                                    <option value="STUDENT" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Student</option>
                                                    <option value="PRO" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Pro</option>
                                                    <option value="ADMIN" className="bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]">Admin</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-sm text-[rgb(var(--color-accent))]">{user.credits}</span>
                                                <button onClick={() => handleCreditUpdate(user.id, user.credits)} className="p-1 hover:bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-md transition-colors text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-text))]">
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="text-center">
                                                    <p className="font-bold">{user.total_jobs || 0}</p>
                                                    <p className="text-[9px] text-[rgb(var(--color-text-muted)/0.5)]">Toplam</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-[rgb(var(--color-success))]">{user.completed_jobs || 0}</p>
                                                    <p className="text-[9px] text-[rgb(var(--color-text-muted)/0.5)]">Başarılı</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-[rgb(var(--color-primary))]">{formatProcessingTime(user.total_processing_time)}</p>
                                                    <p className="text-[9px] text-[rgb(var(--color-text-muted)/0.5)]">Süre</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-[rgb(var(--color-success))]' : 'bg-[rgb(var(--color-danger))]'}`} />
                                                {user.is_active ? 'Aktif' : 'Yasaklı'}
                                            </span>
                                        </td>
                                        <td className="p-4 hidden xl:table-cell">
                                            <div className="text-xs">
                                                <p className="text-[rgb(var(--color-text-muted))]">{user.last_activity ? formatDateTime(user.last_activity) : 'Hiç'}</p>
                                                <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.5)] mt-0.5">Kayıt: {formatDate(user.created_at)}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setSelectedUser(user)} className="p-1.5 rounded-lg text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary)/0.1)] transition-all" title="Detay">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleStatusUpdate(user.id, !user.is_active)} className={`p-1.5 rounded-lg transition-all ${user.is_active ? 'text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.1)]' : 'text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-success))] hover:bg-[rgb(var(--color-success)/0.1)]'}`} title={user.is_active ? 'Yasakla' : 'Aktifleştir'}>
                                                    {user.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-lg text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.1)] transition-all" title="Sil">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                        <UsersIcon className="w-10 h-10 text-[rgb(var(--color-text-muted)/0.3)] mx-auto mb-3" />
                        <p className="text-sm text-[rgb(var(--color-text-muted))]">Kullanıcı bulunamadı</p>
                    </div>
                )}
            </motion.div>

            {/* User Detail Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card !rounded-2xl !p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="relative flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary)/0.2)] to-[rgb(var(--color-secondary)/0.2)] flex items-center justify-center font-bold text-2xl text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary)/0.15)]">
                                        {selectedUser.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-display text-xl font-bold">{selectedUser.email}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getRoleConfig(selectedUser.role).bg} ${getRoleConfig(selectedUser.role).color} border ${getRoleConfig(selectedUser.role).border}`}>{selectedUser.role}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${selectedUser.is_active ? 'badge-success' : 'badge-danger'}`}>{selectedUser.is_active ? 'Aktif' : 'Yasaklı'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                                </button>
                            </div>

                            <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-elevated)/0.4)] border border-[rgb(var(--color-border))] mb-5">
                                <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)] mb-0.5">User ID</p>
                                <p className="font-mono text-xs text-[rgb(var(--color-text-muted))] break-all">{selectedUser.id}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="p-4 rounded-xl bg-[rgb(var(--color-accent)/0.08)] border border-[rgb(var(--color-accent)/0.15)]">
                                    <div className="flex items-center gap-1.5 mb-1"><Zap className="w-3.5 h-3.5 text-[rgb(var(--color-accent))]" /><span className="text-[10px] text-[rgb(var(--color-text-muted))]">Krediler</span></div>
                                    <p className="text-2xl font-bold text-[rgb(var(--color-accent))]">{selectedUser.credits}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgb(var(--color-primary)/0.08)] border border-[rgb(var(--color-primary)/0.15)]">
                                    <div className="flex items-center gap-1.5 mb-1"><Image className="w-3.5 h-3.5 text-[rgb(var(--color-primary))]" /><span className="text-[10px] text-[rgb(var(--color-text-muted))]">Toplam İşlem</span></div>
                                    <p className="text-2xl font-bold">{selectedUser.total_jobs || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgb(var(--color-success)/0.08)] border border-[rgb(var(--color-success)/0.15)]">
                                    <div className="flex items-center gap-1.5 mb-1"><CheckCircle className="w-3.5 h-3.5 text-[rgb(var(--color-success))]" /><span className="text-[10px] text-[rgb(var(--color-text-muted))]">Başarılı</span></div>
                                    <p className="text-2xl font-bold text-[rgb(var(--color-success))]">{selectedUser.completed_jobs || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgb(var(--color-secondary)/0.08)] border border-[rgb(var(--color-secondary)/0.15)]">
                                    <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-[rgb(var(--color-secondary))]" /><span className="text-[10px] text-[rgb(var(--color-text-muted))]">İşlem Süresi</span></div>
                                    <p className="text-2xl font-bold">{formatProcessingTime(selectedUser.total_processing_time)}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                {[
                                    { icon: Calendar, label: 'Kayıt Tarihi', value: formatDateTime(selectedUser.created_at) },
                                    { icon: Activity, label: 'Son Aktivite', value: selectedUser.last_activity ? formatDateTime(selectedUser.last_activity) : 'Hiç' },
                                    { icon: Key, label: 'API Key', value: selectedUser.has_api_key ? 'Aktif' : 'Yok', badge: true, active: selectedUser.has_api_key },
                                    { icon: Bell, label: 'E-posta Bildirimleri', value: selectedUser.email_notifications ? 'Açık' : 'Kapalı', badge: true, active: selectedUser.email_notifications },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--color-surface-elevated)/0.3)] border border-[rgb(var(--color-border)/0.5)]">
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-3.5 h-3.5 text-[rgb(var(--color-text-muted)/0.5)]" />
                                            <span className="text-xs text-[rgb(var(--color-text-muted))]">{item.label}</span>
                                        </div>
                                        {item.badge ? (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${item.active ? 'badge-success' : 'bg-[rgb(var(--color-surface-elevated)/0.5)] text-[rgb(var(--color-text-muted))]'}`}>{item.value}</span>
                                        ) : (
                                            <span className="text-xs font-medium">{item.value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStatusUpdate(selectedUser.id, !selectedUser.is_active)}
                                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border ${selectedUser.is_active
                                        ? 'bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))] border-[rgb(var(--color-danger)/0.2)] hover:bg-[rgb(var(--color-danger)/0.15)]'
                                        : 'bg-[rgb(var(--color-success)/0.1)] text-[rgb(var(--color-success))] border-[rgb(var(--color-success)/0.2)] hover:bg-[rgb(var(--color-success)/0.15)]'
                                    }`}
                                >
                                    {selectedUser.is_active ? <><Ban className="w-4 h-4" />Yasakla</> : <><CheckCircle className="w-4 h-4" />Aktifleştir</>}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(selectedUser.id)}
                                    className="btn-primary !py-3 !px-6 !text-sm"
                                    style={{ background: 'linear-gradient(135deg, rgb(var(--color-danger)), rgb(248, 150, 113))' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Sil
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateUserModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ email: '', password: '', role: 'USER', credits: 10 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const creditDefaults = { USER: 10, STUDENT: 100, PRO: 500, ADMIN: 9999 };

    const handleRoleChange = (role) => {
        setForm(prev => ({ ...prev, role, credits: creditDefaults[role] || 10 }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.password) {
            setError('E-posta ve şifre zorunludur');
            return;
        }
        if (form.password.length < 8) {
            setError('Şifre en az 8 karakter olmalı');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/admin/users', form);
            onCreated();
        } catch (err) {
            setError(err.response?.data?.detail || 'Kullanıcı oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="card !rounded-2xl !p-6 max-w-md w-full"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-bold">Yeni Kullanıcı</h3>
                            <p className="text-xs text-[rgb(var(--color-text-muted))]">Yeni bir hesap oluşturun</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-1.5 block">
                            <Mail className="w-3.5 h-3.5 inline mr-1.5" />E-posta
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="kullanici@ornek.com"
                            className="input-field !text-sm"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-1.5 block">
                            <Lock className="w-3.5 h-3.5 inline mr-1.5" />Şifre
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="En az 8 karakter"
                            className="input-field !text-sm"
                            minLength={6}
                            required
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-1.5 block">
                            <Shield className="w-3.5 h-3.5 inline mr-1.5" />Rol
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'USER', label: 'User', icon: User, color: 'text-muted' },
                                { value: 'STUDENT', label: 'Student', icon: GraduationCap, color: 'primary' },
                                { value: 'PRO', label: 'Pro', icon: Star, color: 'accent' },
                                { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'danger' },
                            ].map(r => (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => handleRoleChange(r.value)}
                                    className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${form.role === r.value
                                        ? `bg-[rgb(var(--color-${r.color})/0.15)] border-[rgb(var(--color-${r.color})/0.3)] text-[rgb(var(--color-${r.color}))]`
                                        : 'border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border)/.8)]'
                                    }`}
                                >
                                    <r.icon className="w-4 h-4 mx-auto mb-1" />
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Credits */}
                    <div>
                        <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-1.5 block">
                            <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />Kredi
                        </label>
                        <input
                            type="number"
                            value={form.credits}
                            onChange={(e) => setForm(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                            min={0}
                            className="input-field !text-sm"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-[rgb(var(--color-danger)/0.1)] border border-[rgb(var(--color-danger)/0.2)] text-[rgb(var(--color-danger))] text-xs"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full !py-3 !text-sm"
                    >
                        {loading ? (
                            <div className="spinner w-4 h-4" />
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Kullanıcı Oluştur
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

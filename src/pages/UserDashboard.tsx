import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, LogOut, PlusCircle } from 'lucide-react';
import { useUserAuth } from '../hooks/user/useUserAuth';
import { getMyProfile } from '../services/user/profileService';
import { listPayslips } from '../services/user/payslipService';
import { UserProfile } from '../types/user';

export default function UserDashboard() {
  const { user, signOut } = useUserAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => null);
    listPayslips({ page: 1, pageSize: 1 }).then((res) => setCount(res.count)).catch(() => null);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-h3 font-bold text-neutral-900 dark:text-neutral-100">Minha Área</h1>
            <p className="text-neutral-500 dark:text-neutral-300 text-body mt-1">
              {profile?.full_name || user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-body-xs font-semibold"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
          <p className="text-label uppercase tracking-widest text-neutral-500">Holerites salvos</p>
          <p className="text-h2 font-black mt-2 text-neutral-900 dark:text-neutral-100">{count}</p>
          <Link to="/minha-area/holerites" className="inline-flex items-center gap-2 mt-4 text-secondary-600 font-semibold">
            <FileText size={16} /> Ver meus holerites
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
          <p className="text-label uppercase tracking-widest text-neutral-500">Nova simulação</p>
          <p className="text-body text-neutral-600 dark:text-neutral-300 mt-2">Abra a calculadora para salvar novos snapshots.</p>
          <Link
            to="/simulador/jmu"
            state={{ startBlank: true }}
            className="inline-flex items-center gap-2 mt-4 text-secondary-600 font-semibold"
          >
            <PlusCircle size={16} /> Abrir calculadora
          </Link>
        </div>
      </div>
    </div>
  );
}

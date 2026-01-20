
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Building2, CheckCircle, XCircle } from 'lucide-react';

interface Agency {
    id: string;
    name: string;
    slug: string;
    type: string;
    is_active: boolean;
}

export default function AgencyList() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('agencies')
                .select('*')
                .order('name');

            if (error) throw error;
            setAgencies(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando órgãos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar: {error}</div>;

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    Órgãos Cadastrados
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificador (Slug)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {agencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{agency.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-mono bg-gray-100 text-gray-700 rounded">
                                        {agency.slug}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                        {agency.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {agency.is_active ? (
                                        <span className="flex items-center text-green-600 text-xs font-bold">
                                            <CheckCircle className="h-4 w-4 mr-1" /> Ativo
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-gray-400 text-xs">
                                            <XCircle className="h-4 w-4 mr-1" /> Inativo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-400 font-mono">
                                    {agency.id.slice(0, 8)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {agencies.length === 0 && (
                    <div className="p-8 text-center text-gray-500">Nenhum órgão encontrado.</div>
                )}
            </div>
        </div>
    );
}

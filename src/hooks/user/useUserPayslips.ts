import { useCallback, useEffect, useState } from 'react';
import {
  createPayslip,
  deletePayslip,
  getPayslipById,
  listPayslips,
  updatePayslip,
} from '../../services/user/payslipService';
import {
  CreatePayslipDTO,
  PayslipListFilters,
  PayslipListResult,
  UpdatePayslipDTO,
  UserPayslip,
} from '../../types/user';

export const useUserPayslips = (initialFilters: PayslipListFilters = {}) => {
  const [filters, setFilters] = useState<PayslipListFilters>(initialFilters);
  const [result, setResult] = useState<PayslipListResult>({
    data: [],
    count: 0,
    page: initialFilters.page || 1,
    pageSize: initialFilters.pageSize || 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (nextFilters?: PayslipListFilters) => {
    const merged = { ...filters, ...(nextFilters || {}) };
    setLoading(true);
    setError(null);
    try {
      const data = await listPayslips(merged);
      setResult(data);
      setFilters(merged);
      return data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    reload(initialFilters).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(async (payload: CreatePayslipDTO) => {
    const created = await createPayslip(payload);
    await reload();
    return created;
  }, [reload]);

  const update = useCallback(async (id: string, payload: UpdatePayslipDTO) => {
    const updated = await updatePayslip(id, payload);
    await reload();
    return updated;
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await deletePayslip(id);
    await reload();
  }, [reload]);

  const getById = useCallback(async (id: string): Promise<UserPayslip | null> => {
    return getPayslipById(id);
  }, []);

  return {
    filters,
    setFilters,
    result,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    getById,
  };
};

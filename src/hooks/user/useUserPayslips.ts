import { useCallback, useEffect, useRef, useState } from 'react';
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
  const filtersRef = useRef(initialFilters);
  const requestIdRef = useRef(0);
  const [result, setResult] = useState<PayslipListResult>({
    data: [],
    count: 0,
    page: initialFilters.page || 1,
    pageSize: initialFilters.pageSize || 10,
  });
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (nextFilters?: PayslipListFilters) => {
    const merged = { ...filtersRef.current, ...(nextFilters || {}) };
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      let data = await listPayslips(merged);
      const lastPage = Math.max(1, Math.ceil(data.count / data.pageSize));
      if (data.page > lastPage) {
        merged.page = lastPage;
        data = await listPayslips(merged);
      }
      if (requestId === requestIdRef.current) {
        filtersRef.current = merged;
        setResult(data);
        setFilters(merged);
      }
      return data;
    } catch (err) {
      if (requestId === requestIdRef.current) setError((err as Error).message);
      throw err;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(initialFilters).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(async (payload: CreatePayslipDTO) => {
    setMutating(true);
    setError(null);
    try {
      const created = await createPayslip(payload);
      await reload();
      return created;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, [reload]);

  const update = useCallback(async (id: string, payload: UpdatePayslipDTO) => {
    const updated = await updatePayslip(id, payload);
    await reload();
    return updated;
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    setMutating(true);
    setError(null);
    try {
      await deletePayslip(id);
      await reload();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, [reload]);

  const getById = useCallback(async (id: string): Promise<UserPayslip | null> => {
    return getPayslipById(id);
  }, []);

  return {
    filters,
    result,
    loading: loading || mutating,
    error,
    reload,
    create,
    update,
    remove,
    getById,
  };
};

-- Apply before deploying the sortable payslip list frontend.
-- Generated metadata preserves snapshots and existing user-level RLS.
alter table public.user_payslips
  add column month_ref_order smallint generated always as (
    case upper(trim(month_ref))
      when 'JANEIRO' then 1
      when 'FEVEREIRO' then 2
      when 'MARÇO' then 3
      when 'MARCO' then 3
      when 'ABRIL' then 4
      when 'MAIO' then 5
      when 'JUNHO' then 6
      when 'JULHO' then 7
      when 'AGOSTO' then 8
      when 'SETEMBRO' then 9
      when 'OUTUBRO' then 10
      when 'NOVEMBRO' then 11
      when 'DEZEMBRO' then 12
      else null
    end
  ) stored;

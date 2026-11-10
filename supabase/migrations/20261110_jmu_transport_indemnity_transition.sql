-- JMU transport indemnity: explicit simulation convention for transition months.
-- The statutory publication dates and historical versions remain unchanged.
-- At the user's request, a transition month uses the rate in force at month end
-- and displays an alert that the legal change occurred during the month.
-- This is a simulation convention, not a statement of retroactive legal effects.
-- Only notes and transitionPolicy are updated; no amount, divisor or incidence changes.
DO $transport_indemnity_transition$
DECLARE
  old_note text := 'O valor vigente desde 13/02/2026 não é aplicado automaticamente a competências anteriores ou ao mês de transição sem dados suficientes.';
  new_note text := 'Nos meses em que houver mudança de vigência, a simulação utiliza o valor atualizado vigente ao final do mês e exibe alerta sobre a data da alteração. Essa convenção de simulação não altera a vigência legal nem substitui a conferência do pagamento devido.';
  current_rule jsonb;
  proposed_rule jsonb;
  next_notes jsonb;
  target_org text;
  old_count integer;
  new_count integer;
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'jmu') THEN
    RAISE EXCEPTION 'Missing JMU org_config: register organ before transition convention';
  END IF;
  FOR target_org IN
    SELECT org_slug FROM public.org_config WHERE org_slug IN ('jmu', 'stm')
  LOOP
    SELECT configuration -> 'transport_indemnity' INTO current_rule
      FROM public.org_config WHERE org_slug = target_org;
    IF current_rule IS NULL OR jsonb_typeof(current_rule -> 'notes') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Missing transport indemnity notes for %; preserve and review configuration', target_org;
    END IF;
    IF current_rule ? 'transitionPolicy' AND current_rule ->> 'transitionPolicy' IS DISTINCT FROM 'latest_in_month' THEN
      RAISE EXCEPTION 'Unexpected transport transition policy for %; preserve and review configuration', target_org;
    END IF;
    SELECT count(*) FILTER (WHERE value = to_jsonb(old_note)),
           count(*) FILTER (WHERE value = to_jsonb(new_note))
      INTO old_count, new_count
      FROM jsonb_array_elements(current_rule -> 'notes');
    IF NOT ((old_count = 1 AND new_count = 0) OR (old_count = 0 AND new_count = 1)) THEN
      RAISE EXCEPTION 'Unexpected transport transition note for %; preserve and review configuration', target_org;
    END IF;
    SELECT jsonb_agg(CASE WHEN value = to_jsonb(old_note) THEN to_jsonb(new_note) ELSE value END ORDER BY ordinal)
      INTO next_notes
      FROM jsonb_array_elements(current_rule -> 'notes') WITH ORDINALITY AS notes(value, ordinal);
    proposed_rule := jsonb_set(current_rule, '{notes}', next_notes, false)
      || '{"transitionPolicy":"latest_in_month"}'::jsonb;
    IF proposed_rule IS DISTINCT FROM current_rule THEN
      UPDATE public.org_config
        SET configuration = jsonb_set(configuration, '{transport_indemnity}', proposed_rule, false)
        WHERE org_slug = target_org;
    END IF;
  END LOOP;
END
$transport_indemnity_transition$;

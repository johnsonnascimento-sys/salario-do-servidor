-- =====================================================
-- Migration: Rename JMU agency display name
-- =====================================================
-- Date: 2026-02-24
-- Description:
--   Atualiza o nome exibido da agencia jmu para
--   "Justica Militar da Uniao".
-- =====================================================

UPDATE agencies
SET name = 'Justiça Militar da União'
WHERE slug = 'jmu';

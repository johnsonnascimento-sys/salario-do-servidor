import type { PensionRubricRule } from '../../src/types';

// Test-only classification. This is deliberately not an official legal catalog.
export const syntheticPensionCatalog: PensionRubricRule[] = [{ id: 'fixture_optional', label: 'Parcela sintética',
    classification: 'facultativa', validFrom: '1900-01', source: 'https://example.test/synthetic-rule' }];
export const syntheticPensionOption = { pensionRubricId: 'fixture_optional', pensionOptionDate: '1970-01-01',
    pensionOptionReference: 'Protocolo sintético para testes' };

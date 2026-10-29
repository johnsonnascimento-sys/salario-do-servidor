export const configurationToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export const validateConfigVersionDate = (
  previous: { valid_from: string; valid_to: string | null },
  nextDate: string,
  today = configurationToday(),
): string | null => {
  if (previous.valid_to !== null) return 'Somente a versão ativa pode originar uma nova versão.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) ||
      !Number.isFinite(Date.parse(`${nextDate}T12:00:00Z`)) ||
      new Date(`${nextDate}T12:00:00Z`).toISOString().slice(0, 10) !== nextDate) {
    return 'Informe uma data válida para o início da nova versão.';
  }
  if (nextDate > today) return 'O agendamento de versões futuras não está disponível.';
  if (nextDate <= previous.valid_from) return 'A nova versão deve iniciar após a data da versão atual; não são permitidas duas versões no mesmo dia.';
  return null;
};

import { CourtConfig } from '../../../../../types';

const requireAgencyConfig = (config?: CourtConfig): CourtConfig => {
  if (!config) {
    throw new Error('agencyConfig is required for JMU calculations.');
  }
  return config;
};

export const getPayrollRules = (config?: CourtConfig) => {
  const agencyConfig = requireAgencyConfig(config);
  const rules = agencyConfig.payrollRules;
  if (!rules) {
    throw new Error('payrollRules is required in agencyConfig.');
  }
  return rules;
};

export const getNoFunctionCode = (config?: CourtConfig) => {
  const agencyConfig = requireAgencyConfig(config);
  const noFunctionCode = agencyConfig.careerCatalog?.noFunctionCode;
  if (!noFunctionCode) {
    throw new Error('careerCatalog.noFunctionCode is required in agencyConfig.');
  }
  return noFunctionCode;
};

export const isNoFunction = (funcao: string, config?: CourtConfig) => {
  return funcao === getNoFunctionCode(config);
};

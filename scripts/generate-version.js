#!/usr/bin/env node

/**
 * Script para gerar version.json automaticamente no build
 *
 * Extrai informações do Git e package.json para criar um arquivo
 * com metadados da versão atual do sistema.
 *
 * Informações geradas:
 * - version: Versão do package.json
 * - commit: Hash curto do último commit (7 chars)
 * - commitFull: Hash completo do último commit
 * - branch: Branch atual
 * - buildDate: Data/hora do build (ISO 8601)
 * - buildTimestamp: Timestamp unix do build
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function exec(command) {
    try {
        return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.warn(`Warning: Failed to execute "${command}":`, error.message);
        return null;
    }
}

function generateVersion() {
    // Ler package.json para pegar a versão
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Extrair informações do Git
    const commit = exec('git rev-parse --short=7 HEAD') || 'unknown';
    const commitFull = exec('git rev-parse HEAD') || 'unknown';
    const branch = exec('git rev-parse --abbrev-ref HEAD') || 'unknown';
    const isVercelBuild = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
    const isDirty = isVercelBuild ? false : !!exec('git status --porcelain');

    // Data/hora do build
    const buildDate = new Date().toISOString();
    const buildTimestamp = Date.now();

    const versionInfo = {
        version: packageJson.version || '1.0.0',
        commit,
        commitFull,
        branch,
        isDirty,
        buildDate,
        buildTimestamp,
    };

    // Escrever arquivo version.json na pasta public
    const publicDir = join(__dirname, '../public');
    mkdirSync(publicDir, { recursive: true });
    const outputPath = join(publicDir, 'version.json');
    writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2), 'utf-8');

    console.log('✅ version.json generated successfully:');
    console.log(JSON.stringify(versionInfo, null, 2));
}

generateVersion();

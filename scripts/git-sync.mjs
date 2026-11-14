#!/usr/bin/env node

/**
 * scripts/git-sync.mjs
 * Ferramenta oficial de commit e push automáticos para o GitHub
 * Compatível com a Seção 15 do PROJECT_RULES.md
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (err) {
    if (options.ignoreError) return null;
    throw err;
  }
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function getCurrentBranch() {
  const branch = runCapture('git rev-parse --abbrev-ref HEAD');
  return branch || 'main';
}

function getStatusLines() {
  const output = runCapture('git status --porcelain');
  if (!output) return [];
  return output.split('\n').map(l => l.trim()).filter(Boolean);
}

function inferSemanticCommitMessage(statusLines) {
  const files = statusLines.map(line => line.replace(/^[A-Z?MADRCU\s]+\s+/, '').trim());

  const hasTest = files.some(f => f.startsWith('tests/') || f.includes('test-') || f.includes('.test.'));
  const hasEngine = files.some(f => f.startsWith('src/services/agency') || f.includes('calculations.ts'));
  const hasUi = files.some(f => f.startsWith('src/components/') || f.startsWith('src/pages/'));
  const hasDb = files.some(f => f.startsWith('supabase/'));
  const hasDocs = files.some(f => f.endsWith('.md') || f.startsWith('docs/'));
  const hasConfig = files.some(f => f.includes('config') || f.includes('vite.config') || f.includes('package.json'));

  const timestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (hasEngine && hasUi) return `feat(calc/ui): sincronização e refinamento de cálculos e interface [${timestamp}]`;
  if (hasEngine) return `fix(engine): atualização das regras e motores de cálculo [${timestamp}]`;
  if (hasTest && !hasUi && !hasEngine) return `test: atualização de suítes de teste automatizadas [${timestamp}]`;
  if (hasUi) return `ui: atualização e melhorias de componentes visuais [${timestamp}]`;
  if (hasDb) return `feat(db): migrações e configurações de banco de dados [${timestamp}]`;
  if (hasDocs && !hasUi && !hasEngine) return `docs: atualização de documentação e regras [${timestamp}]`;
  if (hasConfig) return `chore(config): atualização de dependências e configurações [${timestamp}]`;

  return `chore: sincronização automática do projeto [${timestamp}]`;
}

export async function syncProject(customMessage = null, options = {}) {
  const branch = getCurrentBranch();
  console.log(`\n\x1b[36m🚀 [git-sync] Iniciando sincronização no branch '${branch}'...\x1b[0m`);

  const initialStatus = getStatusLines();
  const hadChanges = initialStatus.length > 0;

  // 1. Sincronização prévia com o remoto (git pull --rebase)
  console.log('\x1b[34m📥 Verificando atualizações no repositório remoto...\x1b[0m');
  let stashed = false;
  if (hadChanges) {
    const stashOut = runCapture('git stash create');
    if (stashOut) {
      run('git stash push -m "git-sync-temp"', { silent: true, ignoreError: true });
      stashed = true;
    }
  }

  try {
    run(`git pull --rebase origin ${branch}`, { silent: false });
  } catch (err) {
    console.error('\x1b[31m❌ Falha ao realizar git pull --rebase origin', branch, '\x1b[0m');
    if (stashed) run('git stash pop', { silent: true, ignoreError: true });
    throw err;
  }

  if (stashed) {
    try {
      run('git stash pop', { silent: true });
    } catch {
      console.warn('\x1b[33m⚠️ Conflito ao restaurar stash local. Verifique os arquivos em conflito.\x1b[0m');
    }
  }

  // 2. Verificar se há alterações locais após pull
  const currentStatus = getStatusLines();
  if (currentStatus.length > 0) {
    console.log(`\x1b[33m📝 Detectadas ${currentStatus.length} alteração(ões) para commit.\x1b[0m`);
    
    // git add -A
    run('git add -A');

    // Definir mensagem do commit
    const commitMessage = customMessage && customMessage.trim().length > 0
      ? customMessage.trim()
      : inferSemanticCommitMessage(currentStatus);

    console.log(`\x1b[32m💾 Criando commit:\x1b[0m "${commitMessage}"`);
    run(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
  } else {
    console.log('\x1b[32m✨ Nenhuma alteração pendente de staging.\x1b[0m');
  }

  // 3. Verificar se há commits para envio
  const unpushed = runCapture(`git log origin/${branch}..${branch} --oneline`);
  if (unpushed) {
    const count = unpushed.split('\n').filter(Boolean).length;
    console.log(`\x1b[35m📤 Enviando ${count} commit(s) para origin/${branch}...\x1b[0m`);
    run(`git push origin ${branch}`);
    console.log('\x1b[32m✅ Push realizado com sucesso no GitHub!\x1b[0m\n');
  } else {
    console.log('\x1b[32m✅ Repositório local já está 100% alinhado com o GitHub!\x1b[0m\n');
  }
}

function startWatcher(debounceMs = 15000) {
  console.log('\x1b[36m👀 [git-sync] Modo de monitoramento contínuo ativado (watcher).\x1b[0m');
  console.log(`\x1b[33m⏱️  Alterações serão consolidadas, comitadas e enviadas após ${debounceMs / 1000}s sem novas edições.\x1b[0m`);
  console.log('\x1b[90mPressione Ctrl+C para encerrar o monitoramento a qualquer momento.\x1b[0m\n');

  let debounceTimer = null;
  let isSyncing = false;

  const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', '.gemini']);

  const watcher = fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const parts = filename.split(/[/\\]/);
    if (parts.some(p => ignoredDirs.has(p) || p.startsWith('.env'))) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        console.log(`\n\x1b[90m[${new Date().toLocaleTimeString('pt-BR')}] Alteração detectada em: ${filename}\x1b[0m`);
        await syncProject(null, { autoTriggered: true });
      } catch (err) {
        console.error('\x1b[31m[watcher] Erro ao sincronizar automaticamente:\x1b[0m', err.message);
      } finally {
        isSyncing = false;
      }
    }, debounceMs);
  });

  process.on('SIGINT', () => {
    console.log('\n\x1b[33m🛑 Encerrando monitoramento git-sync.\x1b[0m');
    watcher.close();
    process.exit(0);
  });
}

// Execução CLI
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const messageArg = args.filter(a => !a.startsWith('-')).join(' ');

if (isWatch) {
  startWatcher();
} else {
  syncProject(messageArg).catch(err => {
    console.error('\x1b[31m❌ Falha na sincronização:\x1b[0m', err.message);
    process.exit(1);
  });
}

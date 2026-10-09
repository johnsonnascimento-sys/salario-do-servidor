"""Prepare -> browser verification -> promote -> browser verification -> finalize.

Requires Python + paramiko. Credentials are read from the environment or getpass.
Only public production variables from the VPS shared/production.env enter the build.
"""
import argparse
import getpass
import hashlib
import io
import json
import os
from pathlib import Path
import select
import shlex
import socketserver
import subprocess
import tarfile
import threading
import time
import urllib.request

import paramiko

BASE = '/opt/salario-do-servidor'
CONTAINER = 'salario-do-servidor'


def source_archive(root):
    allowed = ['src', 'public', 'scripts', 'tests']
    files = [p for name in allowed for p in (root / name).rglob('*') if p.is_file()]
    files += [root / name for name in ['package.json', 'package-lock.json', 'index.html',
              'vite.config.ts', 'tsconfig.json', 'tailwind.config.js', 'postcss.config.js',
              'CHANGELOG.md', 'README.md', 'PROJECT_RULES.md', 'AGENTS.md']]
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as archive:
        for p in sorted(files):
            rel = p.relative_to(root).as_posix()
            if p.name.startswith('.env') or rel == 'public/version.json' or '__pycache__' in p.parts:
                continue
            archive.add(p, arcname=rel, recursive=False)
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True)
    parser.add_argument('--user', default='root')
    parser.add_argument('--local-port', type=int, default=8093)
    parser.add_argument('--remote-port', type=int, default=8093)
    parser.add_argument('--trust-new-host', action='store_true', help='Explicitly trust the first SSH host key')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    source = source_archive(root)
    digest = hashlib.sha256(source).hexdigest()
    release_id = time.strftime('%Y%m%d-%H%M%S', time.gmtime()) + '-' + digest[:12]
    release = BASE + '/releases/' + release_id
    candidate = 'salario-candidate-' + digest[:12]
    ssh = paramiko.SSHClient()
    ssh.load_system_host_keys()
    if args.trust_new_host:
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    password = os.environ.get('DEPLOY_SSH_PASSWORD') or getpass.getpass('SSH password: ')
    ssh.connect(args.host, username=args.user, password=password, timeout=20)

    def run(command):
        _, out, err = ssh.exec_command('set -eu\n' + command)
        output = out.read().decode('utf-8', errors='replace')
        error = err.read().decode('utf-8', errors='replace')
        if out.channel.recv_exit_status():
            raise RuntimeError('Remote operation failed: ' + output[-3000:] + error[-3000:])
        if output.strip():
            print(output.strip(), flush=True)
        return output

    class Tunnel(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    class Forward(socketserver.BaseRequestHandler):
        def handle(self):
            channel = ssh.get_transport().open_channel('direct-tcpip', ('127.0.0.1', args.remote_port), self.client_address)
            try:
                while True:
                    readable, _, _ = select.select([self.request, channel], [], [], 30)
                    for origin in readable:
                        data = origin.recv(65536)
                        if not data:
                            return
                        (channel if origin is self.request else self.request).sendall(data)
            finally:
                channel.close()

    tunnel = None
    finalized = False
    backup = BASE + '/dist_backup_' + release_id
    pending = BASE + '/pending-' + release_id
    timer = 'salario-rollback-' + release_id
    try:
        # Refuse to build without the independently managed production environment.
        run(f'test -s {BASE}/shared/production.env\nmkdir -p {release}')
        with ssh.open_sftp() as sftp:
            with sftp.file(release + '/source.tar.gz', 'wb') as f:
                f.write(source)
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=root, text=True).strip()
        dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root))
        run(f'''cd {release}
tar -xzf source.tar.gz
cp {BASE}/shared/production.env .env.production.local
chmod 600 .env.production.local
npm ci --no-audit --no-fund > install.log 2>&1
npm run test:payslip
npm run test:loading
npm run typecheck
npm run validate:deploy
DEPLOY_COMMIT={shlex.quote(commit)} DEPLOY_BRANCH={shlex.quote(branch)} DEPLOY_DIRTY={int(dirty)} DEPLOY_SOURCE_SHA={digest} npm run build > build.log 2>&1
docker run -d --name {candidate} -p 127.0.0.1:{args.remote_port}:80 -v {release}/dist:/usr/share/nginx/html:ro -v {BASE}/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine
''')
        tunnel = Tunnel(('127.0.0.1', args.local_port), Forward)
        threading.Thread(target=tunnel.serve_forever, daemon=True).start()
        local_url = f'http://127.0.0.1:{args.local_port}'
        print(f'CANDIDATE {local_url}\nRELEASE {release_id}\nSOURCE {digest}', flush=True)
        print('Verify candidate in browser (simulator, login, saved payslip, exports, console). Type promote after success.', flush=True)
        if input().strip() != 'promote':
            raise RuntimeError('Candidate was not verified; active version unchanged.')
        expected = json.loads(run(f'cat {release}/dist/version.json'))
        # A server-side watchdog survives loss of this SSH session or local process.
        rollback = f'''#!/bin/sh
set -eu
if [ -f {pending} ]; then
    mv {BASE}/dist {BASE}/dist_failed_{release_id}
    mv {backup} {BASE}/dist
    docker restart {CONTAINER}
    rm -f {pending}
fi
'''
        with ssh.open_sftp() as sftp:
            with sftp.file(release + '/rollback.sh', 'w') as f:
                f.write(rollback)
        # Arm the watchdog before the first mutation of the active release.
        run(f'''test ! -e {backup}
cp -a {BASE}/dist {backup}
touch {pending}
systemd-run --unit={timer} --on-active=300s /bin/sh {release}/rollback.sh
cp -a {release}/dist {BASE}/dist_next_{release_id}
mv {BASE}/dist {BASE}/dist_previous_{release_id}
mv {BASE}/dist_next_{release_id} {BASE}/dist
docker restart {CONTAINER}
''')
        run(f'cd {release}\nnpm run validate:deploy')
        # Check the actual published release and every JS/CSS referenced by its HTML.
        import re
        public_url = f'http://{args.host}:8092'
        for attempt in range(10):
            try:
                with urllib.request.urlopen(public_url + '/version.json', timeout=10) as response:
                    version = json.load(response)
                if version.get('sourceHash') != expected.get('sourceHash'):
                    raise RuntimeError('Published source fingerprint mismatch')
                with urllib.request.urlopen(public_url, timeout=10) as response:
                    html = response.read().decode()
                for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html):
                    with urllib.request.urlopen(public_url + asset, timeout=10) as response:
                        if not response.read(1):
                            raise RuntimeError('Empty static asset')
                break
            except Exception:
                if attempt == 9:
                    raise
                time.sleep(1)
        print(f'PUBLISHED {public_url}\nVerify published release in browser. Type finalize within 5 minutes; otherwise automatic rollback.', flush=True)
        if input().strip() != 'finalize':
            raise RuntimeError('Final browser validation failed')
        run(f'test -f {pending}\nrm {pending}\nsystemctl stop {timer}.timer\nprintf "Release finalized; backup: {backup}\\n"')
        finalized = True
    finally:
        if not finalized:
            # If promotion failed midway, pending still triggers rollback.
            try:
                run(f'test ! -f {pending} || /bin/sh {release}/rollback.sh')
            except Exception:
                print('Check the VPS; the armed watchdog will attempt rollback.', flush=True)
        try:
            run(f'docker rm -f {candidate} >/dev/null 2>&1 || true')
        finally:
            if tunnel:
                tunnel.shutdown()
                tunnel.server_close()
            ssh.close()


if __name__ == '__main__':
    main()

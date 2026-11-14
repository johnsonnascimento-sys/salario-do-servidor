<#
.SYNOPSIS
    Sincronização, commit e push automáticos para o GitHub (salario-do-servidor).
    Em conformidade com a Seção 15 do PROJECT_RULES.md.

.PARAMETER Message
    Mensagem opcional de commit. Se omitida, uma mensagem semântica será gerada automaticamente.

.PARAMETER Watch
    Ativa o monitoramento contínuo em segundo plano (auto-commit & push após edições).

.EXAMPLE
    .\git-sync.ps1
    .\git-sync.ps1 "feat: novo cálculo de gratificação"
    .\git-sync.ps1 -Watch
#>
[CmdletBinding()]
param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [switch]$Watch
)

$scriptPath = Join-Path $PSScriptRoot "scripts\git-sync.mjs"

if ($Watch) {
    node $scriptPath --watch
} elseif ($Message) {
    node $scriptPath $Message
} else {
    node $scriptPath
}

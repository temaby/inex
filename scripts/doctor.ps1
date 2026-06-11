param(
    [switch]$Ui,
    [switch]$Backend,
    [switch]$Db,
    [switch]$GitHub,
    [switch]$All
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Checks = [System.Collections.Generic.List[object]]::new()
$script:RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

function Write-Check {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Area,

        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [ValidateSet('PASS', 'FAIL', 'WARN', 'INFO')]
        [string]$Status,

        [Parameter(Mandatory = $true)]
        [string]$Hint
    )

    $script:Checks.Add([pscustomobject]@{
        Area = $Area
        Check = $Name
        State = $Status
        Remediation = $Hint
    })
}

function Test-CommandExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PortListening {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        if (Test-CommandExists 'Get-NetTCPConnection') {
            $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -First 1
            return $null -ne $connection
        }
    }
    catch {
        # Fall back below when Get-NetTCPConnection is unavailable or restricted.
    }

    try {
        $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+"
        $connection = netstat -ano -p tcp 2>$null | Select-String -Pattern $pattern | Select-Object -First 1
        return $null -ne $connection
    }
    catch {
        Write-Check 'Port' "Port $Port listener check" 'WARN' 'Unable to inspect TCP listeners in this shell.'
        return $false
    }
}

function Write-PortCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Area,

        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    if (Test-PortListening $Port) {
        Write-Check $Area "Port $Port listening" 'WARN' 'Port is occupied; confirm it is the expected local dev process before starting another server.'
    }
    else {
        Write-Check $Area "Port $Port listening" 'INFO' 'Not listening.'
    }
}

function Test-Ui {
    $clientRoot = Join-Path $script:RepoRoot 'inex\ClientApp'
    $packagePath = Join-Path $clientRoot 'package.json'
    $viteShimPath = Join-Path $clientRoot 'node_modules\.bin\vite.cmd'

    if (Test-Path -LiteralPath $packagePath -PathType Leaf) {
        Write-Check 'UI' 'package.json exists' 'PASS' 'OK.'
    }
    else {
        Write-Check 'UI' 'package.json exists' 'FAIL' 'Restore inex/ClientApp/package.json before frontend work.'
    }

    if (Test-CommandExists 'npm') {
        Write-Check 'UI' 'npm command available' 'PASS' 'OK.'
    }
    else {
        Write-Check 'UI' 'npm command available' 'FAIL' 'Install Node.js/npm and reopen the shell.'
    }

    if (Test-Path -LiteralPath $viteShimPath -PathType Leaf) {
        Write-Check 'UI' 'Vite Windows command shim exists' 'PASS' 'OK.'
    }
    else {
        Write-Check 'UI' 'Vite Windows command shim exists' 'FAIL' 'Run npm install from inex/ClientApp before npm start.'
    }

    if (Test-Path -LiteralPath $packagePath -PathType Leaf) {
        try {
            $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
            $scriptNames = @()

            if (($package.PSObject.Properties.Name -contains 'scripts') -and $null -ne $package.scripts) {
                $scriptNames = @($package.scripts.PSObject.Properties.Name)
            }

            $requiredScripts = @('start', 'build', 'lint')
            $missingScripts = @($requiredScripts | Where-Object { $scriptNames -notcontains $_ })

            if ($missingScripts.Count -eq 0) {
                Write-Check 'UI' 'frontend scripts start/build/lint' 'PASS' 'OK.'
            }
            else {
                Write-Check 'UI' 'frontend scripts start/build/lint' 'FAIL' ("Add missing scripts: {0}." -f ($missingScripts -join ', '))
            }
        }
        catch {
            Write-Check 'UI' 'frontend scripts start/build/lint' 'FAIL' 'package.json could not be parsed as JSON.'
        }
    }

    foreach ($port in @(3000, 5173, 5177)) {
        Write-PortCheck 'UI' $port
    }
}

function Test-Backend {
    if (Test-CommandExists 'dotnet') {
        Write-Check 'Backend' 'dotnet command available' 'PASS' 'OK.'
    }
    else {
        Write-Check 'Backend' 'dotnet command available' 'FAIL' 'Install the .NET SDK and reopen the shell.'
    }

    $solutions = @(Get-ChildItem -LiteralPath $script:RepoRoot -Filter '*.sln' -File -ErrorAction SilentlyContinue)
    if ($solutions.Count -gt 0) {
        Write-Check 'Backend' 'solution file exists' 'PASS' ("Found {0}." -f ($solutions[0].Name))
    }
    else {
        Write-Check 'Backend' 'solution file exists' 'FAIL' 'Restore the solution file at the repository root.'
    }

    Write-PortCheck 'Backend' 5000

    $processes = @(Get-Process -Name 'inex' -ErrorAction SilentlyContinue)
    if ($processes.Count -gt 0) {
        $processIds = ($processes | Select-Object -ExpandProperty Id) -join ', '
        Write-Check 'Backend' 'running inex processes' 'WARN' ("Detected process id(s) {0}; stop manually only if build outputs are locked." -f $processIds)
    }
    else {
        Write-Check 'Backend' 'running inex processes' 'PASS' 'No likely app process locks detected.'
    }
}

function Test-Db {
    $mcpConfigPath = Join-Path $script:RepoRoot '.codex\config.toml'
    $mysqlMcpEntryPoint = Join-Path $script:RepoRoot '.mcp-local\mysql\node_modules\@benborla29\mcp-server-mysql\dist\index.js'

    if (Test-Path -LiteralPath $mcpConfigPath -PathType Leaf) {
        Write-Check 'DB' 'project Codex MCP config exists' 'PASS' 'OK. Contents were not read.'
    }
    else {
        Write-Check 'DB' 'project Codex MCP config exists' 'FAIL' 'Create .codex/config.toml from docs/operations/codex-mcp.md; do not commit it.'
    }

    if (Test-Path -LiteralPath $mysqlMcpEntryPoint -PathType Leaf) {
        Write-Check 'DB' 'MySQL MCP package entry point exists' 'PASS' 'OK.'
    }
    else {
        Write-Check 'DB' 'MySQL MCP package entry point exists' 'FAIL' 'Install @benborla29/mcp-server-mysql as described in docs/operations/codex-mcp.md.'
    }

    Write-Check 'DB' 'MCP query verification' 'WARN' 'PowerShell cannot call Codex MCP tools directly; Codex agents must run SELECT 1 AS ok through mysql_query before DB work.'
}

function Test-GitHub {
    if (Test-CommandExists 'gh') {
        Write-Check 'GitHub' 'gh command available' 'PASS' 'OK.'
    }
    else {
        Write-Check 'GitHub' 'gh command available' 'FAIL' 'Install GitHub CLI and reopen the shell.'
        return
    }

    $authStatusExitCode = 1
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        & gh auth status 1>$null 2>$null
        $authStatusExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($authStatusExitCode -eq 0) {
        Write-Check 'GitHub' 'gh auth status succeeds' 'PASS' 'OK.'
    }
    else {
        Write-Check 'GitHub' 'gh auth status succeeds' 'FAIL' 'Run gh auth login -h github.com, then rerun this check.'
    }
}

function Show-Results {
    $header = "{0,-8} {1,-38} {2,-5} {3}" -f 'Area', 'Check', 'State', 'Remediation'
    $divider = "{0,-8} {1,-38} {2,-5} {3}" -f '----', '-----', '-----', '-----------'

    Write-Host $header
    Write-Host $divider

    foreach ($check in $script:Checks) {
        Write-Host ("{0,-8} {1,-38} {2,-5} {3}" -f $check.Area, $check.Check, $check.State, $check.Remediation)
    }

    $failed = @($script:Checks | Where-Object { $_.State -eq 'FAIL' })
    $warnings = @($script:Checks | Where-Object { $_.State -eq 'WARN' })

    Write-Host ''
    Write-Host ("Summary: {0} failed, {1} warning(s), {2} total check(s)." -f $failed.Count, $warnings.Count, $script:Checks.Count)

    if ($failed.Count -gt 0) {
        exit 1
    }

    exit 0
}

$runEverything = $All -or (-not $Ui -and -not $Backend -and -not $Db -and -not $GitHub)

if ($runEverything -or $Ui) {
    Test-Ui
}

if ($runEverything -or $Backend) {
    Test-Backend
}

if ($runEverything -or $Db) {
    Test-Db
}

if ($runEverything -or $GitHub) {
    Test-GitHub
}

Show-Results

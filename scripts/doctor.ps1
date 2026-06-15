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
$script:LastPortInspectionError = $null

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

    $script:LastPortInspectionError = $null

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
        $script:LastPortInspectionError = 'Unable to inspect TCP listeners in this shell.'
        return $null
    }
}

function Write-PortCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Area,

        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $isListening = Test-PortListening $Port

    if ($null -eq $isListening) {
        Write-Check $Area "Port $Port listener check" 'WARN' $script:LastPortInspectionError
    }
    elseif ($isListening) {
        Write-Check $Area "Port $Port listening" 'WARN' 'Port is occupied; confirm it is the expected local dev process before starting another server.'
    }
    else {
        Write-Check $Area "Port $Port listening" 'INFO' 'Not listening.'
    }
}

function Write-PortAvailabilityCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Area,

        [Parameter(Mandatory = $true)]
        [int]$Port,

        [Parameter(Mandatory = $true)]
        [string]$Purpose
    )

    $isListening = Test-PortListening $Port

    if ($null -eq $isListening) {
        Write-Check $Area "Port $Port available" 'WARN' $script:LastPortInspectionError
    }
    elseif ($isListening) {
        Write-Check $Area "Port $Port available" 'WARN' ("Port is occupied; confirm it is the expected {0} process or choose another port before starting visual QA." -f $Purpose)
    }
    else {
        Write-Check $Area "Port $Port available" 'PASS' ("Available for {0}." -f $Purpose)
    }
}

function Test-ViteChildProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ClientRoot,

        [Parameter(Mandatory = $true)]
        [string]$ViteShimPath
    )

    if (-not (Test-Path -LiteralPath $ViteShimPath -PathType Leaf)) {
        return
    }

    $previousLocation = Get-Location
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        Set-Location -LiteralPath $ClientRoot
        $ErrorActionPreference = 'SilentlyContinue'
        & $ViteShimPath --version 1>$null 2>$null
        $exitCode = $LASTEXITCODE
    }
    catch {
        $message = $_.Exception.Message
        if ($message -match 'EPERM|access.*denied|operation.*permitted|sandbox') {
            Write-Check 'UI' 'Vite child-process startup viable' 'FAIL' 'Vite could not be spawned from this shell. In Codex, approve sandbox escalation for npm/Node/Vite startup, then rerun the doctor; outside Codex, check endpoint protection or AppLocker rules.'
        }
        else {
            Write-Check 'UI' 'Vite child-process startup viable' 'FAIL' 'Vite could not be spawned from node_modules/.bin; run npm install from inex/ClientApp and verify Node.js can start local package binaries.'
        }
        return
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        Set-Location -LiteralPath $previousLocation
    }

    if ($exitCode -eq 0) {
        Write-Check 'UI' 'Vite child-process startup viable' 'PASS' 'Local vite --version process starts successfully.'
    }
    else {
        Write-Check 'UI' 'Vite child-process startup viable' 'FAIL' 'Local vite --version exited non-zero; run npm install from inex/ClientApp and verify the Vite package is usable.'
    }
}

function Test-VisualQaBrowser {
    $envCandidates = @(
        @{ Name = 'CHROME_PATH'; Path = $env:CHROME_PATH },
        @{ Name = 'EDGE_PATH'; Path = $env:EDGE_PATH }
    )

    $validEnvCandidate = $false
    $detectedBrowserPath = $null
    $invalidEnvNames = @()
    foreach ($candidate in $envCandidates) {
        $pathValue = [string]$candidate.Path
        if ([string]::IsNullOrWhiteSpace($pathValue)) {
            continue
        }

        if (Test-Path -LiteralPath $pathValue -PathType Leaf) {
            $validEnvCandidate = $true
            if ($null -eq $detectedBrowserPath) {
                $detectedBrowserPath = $pathValue
            }
        }
        else {
            $invalidEnvNames += $candidate.Name
        }
    }

    if ($validEnvCandidate) {
        Write-Check 'UI' 'CHROME_PATH/EDGE_PATH override' 'PASS' 'A configured browser override points to an existing file.'
    }
    elseif ($invalidEnvNames.Count -gt 0) {
        Write-Check 'UI' 'CHROME_PATH/EDGE_PATH override' 'WARN' ("Configured {0} value does not point to an existing file; update it or unset it." -f ($invalidEnvNames -join '/'))
    }
    else {
        Write-Check 'UI' 'CHROME_PATH/EDGE_PATH override' 'INFO' 'No override configured; default Chrome/Edge install paths will be checked.'
    }

    $defaultCandidates = @(
        'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        'C:\Program Files\Google\Chrome\Application\chrome.exe',
        'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
    )

    $hasDefaultBrowser = $false
    foreach ($pathValue in $defaultCandidates) {
        if (Test-Path -LiteralPath $pathValue -PathType Leaf) {
            $hasDefaultBrowser = $true
            if ($null -eq $detectedBrowserPath) {
                $detectedBrowserPath = $pathValue
            }
            break
        }
    }

    if ($validEnvCandidate -or $hasDefaultBrowser) {
        Write-Check 'UI' 'Chrome/Edge executable detected' 'PASS' 'Visual QA can resolve a local Chromium browser. If launch still fails under Codex, rerun visual QA with sandbox escalation.'
        Test-VisualQaBrowserProcess -BrowserPath $detectedBrowserPath
    }
    else {
        Write-Check 'UI' 'Chrome/Edge executable detected' 'FAIL' 'Install Chrome or Edge, or set CHROME_PATH/EDGE_PATH to the browser executable. In Codex, approve sandbox escalation if the browser exists but process launch is blocked.'
    }
}

function Test-VisualQaBrowserProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BrowserPath
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        & $BrowserPath --version 1>$null 2>$null
        $exitCode = $LASTEXITCODE
    }
    catch {
        $message = $_.Exception.Message
        if ($message -match 'EPERM|access.*denied|operation.*permitted|sandbox') {
            Write-Check 'UI' 'Chrome/Edge process startup viable' 'FAIL' 'The detected browser could not be spawned from this shell. In Codex, approve sandbox escalation for browser startup, then rerun visual QA.'
        }
        else {
            Write-Check 'UI' 'Chrome/Edge process startup viable' 'FAIL' 'The detected browser could not be spawned. Set CHROME_PATH/EDGE_PATH to a working Chrome or Edge executable.'
        }
        return
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -eq 0) {
        Write-Check 'UI' 'Chrome/Edge process startup viable' 'PASS' 'Detected browser starts for a version probe.'
    }
    else {
        Write-Check 'UI' 'Chrome/Edge process startup viable' 'FAIL' 'Detected browser version probe exited non-zero. Set CHROME_PATH/EDGE_PATH to a working Chrome or Edge executable, or approve sandbox escalation if process launch is blocked.'
    }
}

function Test-VisualQaOutputWriteAccess {
    $visualQaRoot = Join-Path $script:RepoRoot 'docs\implementation\visual-qa'

    if (-not (Test-Path -LiteralPath $visualQaRoot -PathType Container)) {
        Write-Check 'UI' 'visual QA output directory writable' 'FAIL' 'Create docs/implementation/visual-qa before running visual QA.'
        return
    }

    $testFile = Join-Path $visualQaRoot ('.doctor-write-test-{0}.tmp' -f [guid]::NewGuid().ToString('N'))
    try {
        Set-Content -LiteralPath $testFile -Value 'doctor write test' -NoNewline
        Remove-Item -LiteralPath $testFile -Force
        Write-Check 'UI' 'visual QA output directory writable' 'PASS' 'Doctor-owned temp file write/delete succeeded.'
    }
    catch {
        Write-Check 'UI' 'visual QA output directory writable' 'FAIL' 'Cannot write visual QA output. Fix filesystem permissions for docs/implementation/visual-qa or run with an approved workspace that can write there.'
    }
    finally {
        if (Test-Path -LiteralPath $testFile -PathType Leaf) {
            Remove-Item -LiteralPath $testFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-VisualQaPorts {
    $visualQaScriptRoot = Join-Path $script:RepoRoot 'inex\ClientApp\visual-qa'
    if (-not (Test-Path -LiteralPath $visualQaScriptRoot -PathType Container)) {
        return @()
    }

    $ports = [System.Collections.Generic.List[int]]::new()
    $scripts = @(Get-ChildItem -LiteralPath $visualQaScriptRoot -Filter '*.mjs' -File -ErrorAction SilentlyContinue)
    foreach ($script in $scripts) {
        $content = Get-Content -LiteralPath $script.FullName -Raw
        $matches = [regex]::Matches($content, 'defaultPort:\s*(\d+)')
        foreach ($match in $matches) {
            [void]$ports.Add([int]$match.Groups[1].Value)
        }
    }

    return @($ports | Sort-Object -Unique)
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

    if (Test-CommandExists 'node') {
        Write-Check 'UI' 'node command available' 'PASS' 'OK.'
    }
    else {
        Write-Check 'UI' 'node command available' 'FAIL' 'Install Node.js and reopen the shell.'
    }

    if (Test-Path -LiteralPath $viteShimPath -PathType Leaf) {
        Write-Check 'UI' 'Vite Windows command shim exists' 'PASS' 'OK.'
    }
    else {
        Write-Check 'UI' 'Vite Windows command shim exists' 'FAIL' 'Run npm install from inex/ClientApp before npm start.'
    }

    Test-ViteChildProcess -ClientRoot $clientRoot -ViteShimPath $viteShimPath
    Test-VisualQaBrowser
    Test-VisualQaOutputWriteAccess

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

    Write-PortAvailabilityCheck 'UI' 3000 'Vite dev server'

    foreach ($port in (Get-VisualQaPorts)) {
        Write-PortAvailabilityCheck 'UI' $port 'visual QA harness'
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

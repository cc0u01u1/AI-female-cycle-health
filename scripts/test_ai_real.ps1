# 她周期 — DeepSeek 真实 Key 一键实测
#
# 前提：backend\.env 已配置 DEEPSEEK_API_KEY（脚本绝不打印 Key 内容）
# 用法：powershell -ExecutionPolicy Bypass -File scripts\test_ai_real.ps1
#
# 覆盖用例：
#   1) 环境检查（.env 存在、Key 格式正确、不打印内容）
#   2) GET /api/health、GET /api/health/ai（真实模式 mock=false）
#   3) POST /api/ai/analyze 正常用例（校验真实 JSON 四字段）
#   4) 空数据用例（仅周期上下文，应正常返回并说明数据不足）
#   5) 参数校验用例（cycleLength=5 → 422 {"message":...}）
#   6) 错误 Key 用例（401 → 503 友好提示，不泄漏上游信息）
#   7) 超时用例（不可达地址 + 2s 超时 → 503 友好提示）
#   8) Key 泄漏扫描（src / dist / backend / README / DEPLOY / Git tracked）

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$envFile = Join-Path $backend ".env"
$py      = Join-Path $backend ".venv\Scripts\python.exe"
$pass = 0; $fail = 0
$jobs = @()

function Ok([string]$msg)  { $script:pass++; Write-Host ("[PASS] " + $msg) -ForegroundColor Green }
function Bad([string]$msg) { $script:fail++; Write-Host ("[FAIL] " + $msg) -ForegroundColor Red }

# 统一请求：返回 @{ status=[int]; body=[string] }（PS 5.1 兼容，错误响应也能读 body）
function Invoke-Api([string]$Method, [string]$Url, [string]$Json, [int]$TimeoutSec) {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method = $Method
    $req.Timeout = $TimeoutSec * 1000
    $req.ContentType = "application/json"
    if ($Json) {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Json)
        $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
    }
    try {
        $resp = $req.GetResponse()
        $sr = New-Object IO.StreamReader($resp.GetResponseStream())
        return @{ status = [int]$resp.StatusCode; body = $sr.ReadToEnd() }
    } catch [System.Net.WebException] {
        $r = $_.Exception.Response
        if ($null -eq $r) { throw }
        $sr = New-Object IO.StreamReader($r.GetResponseStream())
        return @{ status = [int]$r.StatusCode; body = $sr.ReadToEnd() }
    }
}

# 启动一个后端实例（可注入环境变量覆盖 .env，pydantic-settings 中真实环境变量优先）
function Start-Api([int]$Port, [hashtable]$EnvVars) {
    $job = Start-Job -ScriptBlock {
        param($dir, $python, $p, $ev)
        Set-Location $dir
        foreach ($k in $ev.Keys) { Set-Item -Path ("Env:" + $k) -Value $ev[$k] }
        & $python -m uvicorn app.main:app --host 127.0.0.1 --port $p
    } -ArgumentList $backend, $py, $Port, $EnvVars
    $script:jobs += $job
    foreach ($i in 1..40) {
        Start-Sleep -Milliseconds 500
        try {
            $r = Invoke-Api "GET" ("http://127.0.0.1:{0}/api/health" -f $Port) $null 2
            if ($r.status -eq 200) { return $job }
        } catch {}
    }
    throw ("后端实例(:{0})未就绪" -f $Port)
}

try {
    Write-Host "===== 1. 环境检查 ====="
    if (-not (Test-Path $envFile)) { Bad "未找到 backend\.env"; exit 1 }
    if (-not (Test-Path $py))      { Bad "未找到 backend\.venv，请先创建虚拟环境"; exit 1 }
    $raw = Get-Content $envFile -Raw
    if ($raw -notmatch "DEEPSEEK_API_KEY\s*=\s*sk-\S+") { Bad "backend\.env 未配置 sk- 开头的 DEEPSEEK_API_KEY"; exit 1 }
    if ($raw -match "(?m)^\s*ENABLE_MOCK\s*=\s*true") { Write-Host "[WARN] ENABLE_MOCK=true：本次不是真实 Key 请求" -ForegroundColor Yellow }
    Ok "backend\.env 存在且包含 DEEPSEEK_API_KEY（内容未打印）"

    Write-Host "`n===== 2. 健康检查（真实模式） ====="
    $null = Start-Api 8100 @{}
    $r = Invoke-Api "GET" "http://127.0.0.1:8100/api/health/ai" $null 5
    if ($r.status -eq 200 -and $r.body -match '"enabled":\s*true' -and $r.body -match '"mock":\s*false' -and $r.body -notmatch "sk-") {
        Ok ("/api/health/ai -> " + $r.body)
    } else { Bad ("/api/health/ai 异常: " + $r.body) }

    Write-Host "`n===== 3. 正常分析（真实 DeepSeek） ====="
    $payload = @{
        cycle         = @{ cycleDay = 12; cycleLength = 29; phase = "follicular" }
        recentRecords = @(
            @{ date = "2026-09-14"; painLevel = 2; mood = "normal"; sleepHours = 7.5; bodyStatus = @("bloating"); note = "轻微腹胀" }
            @{ date = "2026-09-15"; painLevel = 1; mood = "great";  sleepHours = 8.0; bodyStatus = @();            note = "" }
            @{ date = "2026-09-16"; painLevel = 0; mood = "normal"; sleepHours = 7.0; bodyStatus = @();            note = "" }
        )
        recentPeriods = @(
            @{ startDate = "2026-08-13"; endDate = "2026-08-17" }
            @{ startDate = "2026-09-10"; endDate = "2026-09-14" }
        )
    } | ConvertTo-Json -Depth 5
    $r = Invoke-Api "POST" "http://127.0.0.1:8100/api/ai/analyze" $payload 60
    $ok = $false
    if ($r.status -eq 200) {
        try {
            $data = $r.body | ConvertFrom-Json
            $ok = $data.summary -and $data.disclaimer -and ($null -ne $data.observations) -and ($null -ne $data.suggestions)
            if ($ok) {
                Ok "analyze -> 200，JSON 四字段齐全"
                Write-Host ("  summary: " + $data.summary)
                Write-Host ("  observations: " + ($data.observations -join " | "))
                Write-Host ("  suggestions: "  + ($data.suggestions  -join " | "))
                Write-Host ("  disclaimer: " + $data.disclaimer)
            }
        } catch {}
    }
    if (-not $ok) { Bad ("analyze 异常 status={0} body={1}" -f $r.status, $r.body) }

    Write-Host "`n===== 4. 空数据用例（仅周期上下文） ====="
    $emptyPayload = @{
        cycle         = @{ cycleDay = 5; cycleLength = 28; phase = "menstrual" }
        recentRecords = @()
        recentPeriods = @()
    } | ConvertTo-Json -Depth 5
    $r = Invoke-Api "POST" "http://127.0.0.1:8100/api/ai/analyze" $emptyPayload 60
    $ok = $false
    if ($r.status -eq 200) {
        try {
            $data = $r.body | ConvertFrom-Json
            $ok = $data.summary -and $data.disclaimer
            if ($ok) { Ok ("空数据仍返回结构化结果，summary: " + $data.summary) }
        } catch {}
    }
    if (-not $ok) { Bad ("空数据用例异常 status={0} body={1}" -f $r.status, $r.body) }

    Write-Host "`n===== 5. 参数校验用例（cycleLength=5，应 422） ====="
    $badPayload = @{
        cycle         = @{ cycleDay = 5; cycleLength = 5; phase = "menstrual" }
        recentRecords = @()
        recentPeriods = @()
    } | ConvertTo-Json -Depth 5
    $r = Invoke-Api "POST" "http://127.0.0.1:8100/api/ai/analyze" $badPayload 15
    if ($r.status -eq 422 -and $r.body -match '"message"' -and $r.body -notmatch "Traceback|pydantic|validation") {
        Ok ("422 统一错误格式: " + $r.body)
    } else { Bad ("期望 422，实际 status={0} body={1}" -f $r.status, $r.body) }

    Write-Host "`n===== 6. 错误 Key 用例（应 503 友好提示） ====="
    $null = Start-Api 8101 @{ DEEPSEEK_API_KEY = "sk-invalid-0000000000000000000000000000" }
    $r = Invoke-Api "POST" "http://127.0.0.1:8101/api/ai/analyze" $payload 60
    if ($r.status -eq 503 -and $r.body -match "认证失败" -and $r.body -notmatch "sk-|Bearer|deepseek|httpx") {
        Ok ("503 统一错误格式: " + $r.body)
    } else { Bad ("期望 503 认证失败，实际 status={0} body={1}" -f $r.status, $r.body) }

    Write-Host "`n===== 7. 超时用例（不可达上游 + 2s 超时，应 503） ====="
    $null = Start-Api 8102 @{ DEEPSEEK_BASE_URL = "http://10.255.255.1"; REQUEST_TIMEOUT = "2" }
    $r = Invoke-Api "POST" "http://127.0.0.1:8102/api/ai/analyze" $payload 30
    if ($r.status -eq 503 -and $r.body -match "超时" -and $r.body -notmatch "10\.255|httpx|Traceback") {
        Ok ("503 统一错误格式: " + $r.body)
    } else { Bad ("期望 503 超时，实际 status={0} body={1}" -f $r.status, $r.body) }

    Write-Host "`n===== 8. Key 泄漏扫描 ====="
    $scanDirs = @((Join-Path $root "src"), (Join-Path $root "dist"), (Join-Path $root "backend"), (Join-Path $root "docs"))
    $scanFiles = @((Join-Path $root "README.md"), (Join-Path $root "DEPLOY.md"))
    $files = @()
    foreach ($d in $scanDirs) {
        if (Test-Path $d) {
            $files += Get-ChildItem $d -Recurse -File |
                Where-Object { $_.FullName -notmatch "\\.venv\\|__pycache__|node_modules" }
        }
    }
    foreach ($f in $scanFiles) { if (Test-Path $f) { $files += Get-Item $f } }
    # backend\.env 是 Key 唯一合法存放地（已被 gitignore，不进 Git），
    # 其安全性由下方"Git 未跟踪"检查保证，此处扫描合法存放地以外的所有文件
    $files = @($files | Where-Object { $_.Name -ne ".env" })
    $leaks = @()
    foreach ($f in $files) {
        $hit = Select-String -Path $f.FullName -Pattern "sk-[A-Za-z0-9]{16,}" -ErrorAction SilentlyContinue
        if ($hit) { $leaks += $f.FullName }
    }
    if ($leaks.Count -eq 0) { Ok "src / dist / backend / docs / README / DEPLOY 未发现 sk- Key 泄漏" }
    else { $leaks | ForEach-Object { Bad ("疑似泄漏: " + $_) } }

    if (Test-Path (Join-Path $root ".git")) {
        $tracked = git -C $root ls-files | Select-String -Pattern "\.env$|\.env\.local|\.venv"
        if ($tracked) { $tracked | ForEach-Object { Bad ("Git 跟踪了敏感文件: " + $_) } }
        else { Ok "Git 未跟踪任何 .env / .env.local / .venv 文件" }
    } else {
        Write-Host "[SKIP] 尚未 git init"
    }
}
finally {
    foreach ($j in $jobs) { Stop-Job $j -ErrorAction SilentlyContinue; Remove-Job $j -Force -ErrorAction SilentlyContinue }
}

Write-Host ("`n===== 结果：{0} 通过 / {1} 失败 =====" -f $pass, $fail)
if ($fail -gt 0) { exit 1 }

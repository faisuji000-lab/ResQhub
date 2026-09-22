# ResQHub Local Wi-Fi Crisis Server (Zero-Dependency PowerShell HTTP Server)
param (
    [int]$Port = 8080
)

$Host.UI.RawUI.WindowTitle = "ResQHub Crisis Command Server - Port $Port"

# Define CRLF safely
$crlf = "`r`n"
$crlf2 = "$crlf$crlf"

# Determine local IP address
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" 
} | Select-Object -First 1).IPAddress

if (-not $localIp) { $localIp = "127.0.0.1" }

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$stateFile = Join-Path $scriptDir "data-state.json"

# Initialize state file if not exists
if (-not (Test-Path $stateFile)) {
    $initialJson = @{
        sosAlerts = @(
            @{
                id = "sos-101"
                timestamp = "10 mins ago"
                name = "Ramesh Sharma"
                phone = "+91 98210 99881"
                priority = "CRITICAL"
                peopleTrapped = 5
                hasInjuries = $true
                lat = 19.0680
                lng = 72.8420
                address = "Plot 42, Riverbank Society, Sector 3"
                needs = @("Boat Rescue", "Medical Attention", "Infant Care")
                status = "Dispatched"
                assignedUnit = "NDRF Boat Squad Alpha"
                notes = "Ground floor completely submerged. Family on rooftop."
            }
        )
        serverInfo = @{
            ip = $localIp
            port = $Port
            status = "Online"
        }
    } | ConvertTo-Json -Depth 6
    Set-Content -Path $stateFile -Value $initialJson -Encoding UTF8
}

# Attempt to unblock firewall rule if running as Admin
try {
    $existingRule = Get-NetFirewallRule -DisplayName "ResQHub Crisis Server 8080" -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName "ResQHub Crisis Server 8080" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
    }
} catch {}

# Start TCP Listener on all interfaces (no Admin rights required)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try {
    $listener.Start()
} catch {
    Write-Host "Port $Port is busy. Retrying with port 8081..." -ForegroundColor Yellow
    $Port = 8081
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
}

$wifiProfile = (Get-NetConnectionProfile -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue).NetworkCategory

Clear-Host
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  ResQHub Disaster Management: Local Wi-Fi Crisis Server" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Laptop (EOC Command):   http://localhost:$Port" -ForegroundColor White
Write-Host "  Phone / Other Devices:  http://${localIp}:$Port" -ForegroundColor Yellow
Write-Host ""
if ($wifiProfile -eq "Public") {
    Write-Host "    NOTE: Windows has set your Wi-Fi/Hotspot to 'Public'." -ForegroundColor Yellow
    Write-Host "  If phone cannot connect, change Wi-Fi to 'Private' in Windows Settings" -ForegroundColor Yellow
    Write-Host "  (or Right-click start-server.bat -> 'Run as administrator' once)." -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------------" -ForegroundColor DarkGray
}
Write-Host "  Connect your phone to the same Wi-Fi and open the link above!" -ForegroundColor Green
Write-Host "  Any SOS sent from your phone will instantly sync to this laptop." -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "Server listening for incoming connections..." -ForegroundColor Gray
Write-Host ""

$buffer = New-Object byte[] 65536

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) {
            $client.Close()
            continue
        }

        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        $firstLine = ($requestText -split "`r`n")[0]
        $parts = $firstLine -split " "
        $method = $parts[0]
        $rawUrl = $parts[1]
        $urlPath = ($rawUrl -split "\?")[0]

        # Handle CORS preflight
        if ($method -eq "OPTIONS") {
            $headers = "HTTP/1.1 200 OK${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Access-Control-Allow-Methods: GET, POST, OPTIONS${crlf}Access-Control-Allow-Headers: Content-Type${crlf}Content-Length: 0$crlf2"
            $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $client.Close()
            continue
        }

        # Route: GET /api/data
        if ($urlPath -eq "/api/data" -and $method -eq "GET") {
            $jsonContent = Get-Content -Path $stateFile -Raw -Encoding UTF8
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
            $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($respBytes, 0, $respBytes.Length)
            $client.Close()
            continue
        }

        # Route: GET /api/info
        if ($urlPath -eq "/api/info" -and $method -eq "GET") {
            $activeIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
                $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" 
            } | Select-Object -First 1).IPAddress
            if (-not $activeIp) { $activeIp = $localIp }
            $info = @{ ip = $activeIp; port = $Port; url = "http://${activeIp}:$Port" } | ConvertTo-Json
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($info)
            $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
            $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($respBytes, 0, $respBytes.Length)
            $client.Close()
            continue
        }

        # Route: POST /api/sos
        if ($urlPath -eq "/api/sos" -and $method -eq "POST") {
            $splitParts = $requestText -split "`r`n`r`n", 2
            $body = if ($splitParts.Length -gt 1) { $splitParts[1] } else { "{}" }
            
            try {
                $newSos = $body | ConvertFrom-Json
                $currentState = (Get-Content -Path $stateFile -Raw -Encoding UTF8) | ConvertFrom-Json
                
                $alertList = [System.Collections.ArrayList]@($currentState.sosAlerts)
                $alertList.Insert(0, $newSos)
                $currentState.sosAlerts = $alertList

                $updatedJson = $currentState | ConvertTo-Json -Depth 6
                Set-Content -Path $stateFile -Value $updatedJson -Encoding UTF8
                
                Write-Host " [INCOMING SOS RECEIVED] From: $($newSos.name) | Loc: $($newSos.address) | Priority: $($newSos.priority)" -ForegroundColor Red

                $respMsg = @{ success = $true; message = "SOS registered on central EOC server"; id = $newSos.id } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respMsg)
                $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $errMsg = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                $headers = "HTTP/1.1 500 Internal Error${crlf}Connection: close${crlf}Content-Type: application/json${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            }
            $client.Close()
            continue
        }

        # Route: POST /api/checkin
        if ($urlPath -eq "/api/checkin" -and $method -eq "POST") {
            $splitParts = $requestText -split "`r`n`r`n", 2
            $body = if ($splitParts.Length -gt 1) { $splitParts[1] } else { "{}" }
            
            try {
                $newCheckin = $body | ConvertFrom-Json
                $currentState = (Get-Content -Path $stateFile -Raw -Encoding UTF8) | ConvertFrom-Json
                
                if (-not $currentState.survivorCheckins) {
                    $currentState | Add-Member -NotePropertyName "survivorCheckins" -NotePropertyValue @() -Force
                }
                $checkinList = [System.Collections.ArrayList]@($currentState.survivorCheckins)
                $checkinList.Insert(0, $newCheckin)
                $currentState.survivorCheckins = $checkinList

                $updatedJson = $currentState | ConvertTo-Json -Depth 6
                Set-Content -Path $stateFile -Value $updatedJson -Encoding UTF8
                
                Write-Host " [SURVIVOR CHECK-IN] $($newCheckin.name) | Status: $($newCheckin.status) | Loc: $($newCheckin.location)" -ForegroundColor Green

                $respMsg = @{ success = $true; message = "Survivor safe check-in recorded"; id = $newCheckin.id } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respMsg)
                $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $errMsg = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                $headers = "HTTP/1.1 500 Internal Error${crlf}Connection: close${crlf}Content-Type: application/json${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            }
            $client.Close()
            continue
        }

        # Route: POST /api/relief
        if ($urlPath -eq "/api/relief" -and $method -eq "POST") {
            $splitParts = $requestText -split "`r`n`r`n", 2
            $body = if ($splitParts.Length -gt 1) { $splitParts[1] } else { "{}" }
            
            try {
                $newRelief = $body | ConvertFrom-Json
                $currentState = (Get-Content -Path $stateFile -Raw -Encoding UTF8) | ConvertFrom-Json
                
                if (-not $currentState.reliefRequests) {
                    $currentState | Add-Member -NotePropertyName "reliefRequests" -NotePropertyValue @() -Force
                }
                $reliefList = [System.Collections.ArrayList]@($currentState.reliefRequests)
                $reliefList.Insert(0, $newRelief)
                $currentState.reliefRequests = $reliefList

                $updatedJson = $currentState | ConvertTo-Json -Depth 6
                Set-Content -Path $stateFile -Value $updatedJson -Encoding UTF8
                
                Write-Host " [RELIEF REQUEST] From: $($newRelief.name) | Items: $($newRelief.items -join ', ')" -ForegroundColor Cyan

                $respMsg = @{ success = $true; message = "Relief supplies request logged"; id = $newRelief.id } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respMsg)
                $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $errMsg = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                $headers = "HTTP/1.1 500 Internal Error${crlf}Connection: close${crlf}Content-Type: application/json${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            }
            $client.Close()
            continue
        }

        # Route: POST /api/update-sos
        if ($urlPath -eq "/api/update-sos" -and $method -eq "POST") {
            $splitParts = $requestText -split "`r`n`r`n", 2
            $body = if ($splitParts.Length -gt 1) { $splitParts[1] } else { "{}" }
            
            try {
                $updateReq = $body | ConvertFrom-Json
                $currentState = (Get-Content -Path $stateFile -Raw -Encoding UTF8) | ConvertFrom-Json
                
                if ($currentState.sosAlerts) {
                    foreach ($sos in $currentState.sosAlerts) {
                        if ($sos -and $sos.id -eq $updateReq.id) {
                            if ($updateReq.status) { $sos.status = $updateReq.status }
                            if ($updateReq.assignedUnit) { $sos.assignedUnit = $updateReq.assignedUnit }
                        }
                    }
                    $updatedJson = $currentState | ConvertTo-Json -Depth 6
                    Set-Content -Path $stateFile -Value $updatedJson -Encoding UTF8
                    Write-Host " [ADMIN UPDATE SOS] $($updateReq.id) -> Status: $($updateReq.status) | Unit: $($updateReq.assignedUnit)" -ForegroundColor Green
                }

                $respMsg = @{ success = $true; message = "SOS updated by Admin" } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respMsg)
                $headers = "HTTP/1.1 200 OK${crlf}Content-Type: application/json; charset=utf-8${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $errMsg = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                $headers = "HTTP/1.1 500 Internal Error${crlf}Connection: close${crlf}Content-Type: application/json${crlf}Content-Length: $($respBytes.Length)$crlf2"
                $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                $stream.Write($hdrBytes, 0, $hdrBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
            }
            $client.Close()
            continue
        }

        # Static File Serving
        $relPath = $urlPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath)) {
            $relPath = "index.html"
        }
        $relPath = $relPath.Replace('/', '\')
        $filePath = Join-Path $scriptDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $headers = "HTTP/1.1 200 OK${crlf}Content-Type: $mime${crlf}Connection: close${crlf}Access-Control-Allow-Origin: *${crlf}Content-Length: $($fileBytes.Length)$crlf2"
            $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $notFound = "<h1>404 Not Found</h1>"
            $nfBytes = [System.Text.Encoding]::UTF8.GetBytes($notFound)
            $headers = "HTTP/1.1 404 Not Found${crlf}Connection: close${crlf}Content-Type: text/html${crlf}Content-Length: $($nfBytes.Length)$crlf2"
            $hdrBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($nfBytes, 0, $nfBytes.Length)
        }

        $client.Close()
    } catch {
        # Catch individual connection errors and keep running
    }
}



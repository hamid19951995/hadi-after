param(
    [string]$Destination = "$env:APPDATA\Adobe\CEP\extensions\com.cepresources.aechat"
)

if (Test-Path $Destination) {
    Remove-Item -Path $Destination -Recurse -Force
    Write-Host "AE Studio Chat removed from $Destination"
} else {
    Write-Host "AE Studio Chat is not installed at $Destination"
}

$text = [System.IO.File]::ReadAllText("C:\Users\ASUS\OneDrive\Desktop\Yoddha\admin-app.js")
$open = 0
$close = 0
foreach ($char in $text.ToCharArray()) {
    if ($char -eq '{') { $open++ }
    if ($char -eq '}') { $close++ }
}
Write-Host "Open: $open, Close: $close"

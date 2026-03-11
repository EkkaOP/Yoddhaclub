$lines = [System.IO.File]::ReadAllLines("C:\Users\ASUS\OneDrive\Desktop\Yoddha\admin-app.js")
$stack = New-Object System.Collections.Generic.Stack[int]

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $chars = $line.ToCharArray()
    foreach ($char in $chars) {
        if ($char -eq '{') {
            $stack.Push($i + 1)
        }
        elseif ($char -eq '}') {
            if ($stack.Count -gt 0) {
                $stack.Pop() | Out-Null
            } else {
                Write-Host "Unmatched close on line $($i + 1)"
            }
        }
    }
}

while ($stack.Count -gt 0) {
    Write-Host "Unclosed open brace starting from line: $($stack.Pop())"
}

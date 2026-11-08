# Local interactive setup. Never prints a key or sends it anywhere.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$atelierRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$atelierTarget = Join-Path $atelierRoot '.env.local'
if (Test-Path -LiteralPath $atelierTarget) {
  if ((Get-Item -LiteralPath $atelierTarget).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing linked env file.' }
}
$atelierTracked = & git -C $atelierRoot ls-files -- .env.local
if ($atelierTracked) { throw 'Refusing tracked env file.' }
$atelierForm = New-Object Windows.Forms.Form
$atelierForm.Text = 'ATELIER HOME - Gemini API'
$atelierForm.ClientSize = New-Object Drawing.Size(540,240)
$atelierForm.StartPosition = 'CenterScreen'
$atelierForm.TopMost = $true
$atelierForm.FormBorderStyle = 'FixedDialog'
$atelierForm.MaximizeBox = $false
$atelierForm.MinimizeBox = $false
$atelierLabel = New-Object Windows.Forms.Label
$atelierLabel.Text = "Dan Gemini API key vao o ben duoi. Khong gui khoa vao chat.`r`nChi luu tren may vao .env.local; chua gui len may chu."
$atelierLabel.SetBounds(20,20,500,48)
$atelierInput = New-Object Windows.Forms.TextBox
$atelierInput.SetBounds(20,85,500,28)
$atelierInput.UseSystemPasswordChar = $true
$atelierInput.MaxLength = 2000
$atelierSave = New-Object Windows.Forms.Button
$atelierSave.Text = 'Luu khoa'
$atelierSave.SetBounds(300,145,105,34)
$atelierCancel = New-Object Windows.Forms.Button
$atelierCancel.Text = 'Huy'
$atelierCancel.SetBounds(415,145,105,34)
$atelierCancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
$atelierForm.CancelButton = $atelierCancel
$atelierForm.AcceptButton = $atelierSave
$atelierSave.Add_Click({
  $atelierValue = $atelierInput.Text.Trim()
  $atelierValue = [regex]::Replace($atelierValue,'^(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*','')
  $atelierValue = $atelierValue.Trim().Trim([char]34,[char]39).Trim()
  if ($atelierValue.StartsWith('sk-')) {
    [Windows.Forms.MessageBox]::Show('Day co ve la khoa OpenAI. Hay lay khoa Gemini tu Google AI Studio; khong gui khoa vao chat.','Dung nha cung cap') | Out-Null
    return
  }
  if ($atelierValue.Length -lt 20 -or $atelierValue.Length -gt 512 -or $atelierValue -match '[\s"''=]' -or $atelierValue -notmatch '^[A-Za-z0-9_.-]+$') {
    [Windows.Forms.MessageBox]::Show('Hay dan gia tri API key, khong dan ma lenh curl, URL hoac ten du an. Neu da sao chep dung, tao lai khoa trong Google AI Studio.','Kiem tra noi dung sao chep') | Out-Null
    return
  }
  try {
    $atelierText = if ([IO.File]::Exists($atelierTarget)) { [IO.File]::ReadAllText($atelierTarget) } else { '' }
    $atelierLine = 'GEMINI_API_KEY=' + $atelierValue
    if ($atelierText -match '(?m)^GEMINI_API_KEY=.*$') { $atelierText = [regex]::Replace($atelierText,'(?m)^GEMINI_API_KEY=.*$',{ param($match) $atelierLine }) }
    else { $atelierText = $atelierText.TrimEnd() + "`n" + $atelierLine + "`n" }
    [IO.File]::WriteAllText($atelierTarget,$atelierText,(New-Object Text.UTF8Encoding($false)))
    $atelierOwner = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls $atelierTarget /inheritance:r /grant:r "$($atelierOwner):(F)" 'SYSTEM:(F)' | Out-Null
    $atelierInput.Clear()
    $atelierValue = $null
    $atelierText = $null
    $atelierForm.DialogResult = [Windows.Forms.DialogResult]::OK
    $atelierForm.Close()
  } catch {
    [Windows.Forms.MessageBox]::Show('Khong luu duoc khoa. Kiem tra quyen ghi tep .env.local.','Loi luu') | Out-Null
  }
})
$atelierForm.Controls.AddRange(@($atelierLabel,$atelierInput,$atelierSave,$atelierCancel))
$atelierResult = $atelierForm.ShowDialog()
$atelierForm.Dispose()
if ($atelierResult -eq [Windows.Forms.DialogResult]::OK) { Write-Output 'Gemini key saved locally. No secret printed.'; exit 0 }
Write-Output 'Gemini setup cancelled. No key written.'
exit 2

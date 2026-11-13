Add-Type -AssemblyName System.Drawing

function New-AmgIcon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear([System.Drawing.Color]::Black)

  $em = [int]($size * 0.20)
  $style = [System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic
  $font = New-Object System.Drawing.Font("Arial Black", $em, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = [System.Drawing.StringFormat]::GenericTypographic

  $s1 = "amg"; $s2 = "777"
  $w1 = $g.MeasureString($s1, $font, [System.Drawing.PointF]::Empty, $fmt).Width
  $w2 = $g.MeasureString($s2, $font, [System.Drawing.PointF]::Empty, $fmt).Width
  $h  = $g.MeasureString($s1, $font, [System.Drawing.PointF]::Empty, $fmt).Height
  $x = ($size - ($w1 + $w2)) / 2
  $y = ($size - $h) / 2 - ($size * 0.02)

  $orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 94, 0))
  $g.DrawString($s1, $font, [System.Drawing.Brushes]::White, [single]$x, [single]$y, $fmt)
  $g.DrawString($s2, $font, $orange, [single]($x + $w1), [single]$y, $fmt)

  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $orange.Dispose(); $g.Dispose(); $bmp.Dispose()
  Write-Output "wrote $out"
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
New-AmgIcon 192 (Join-Path $root "public\app\icon-192.png")
New-AmgIcon 512 (Join-Path $root "public\app\icon-512.png")

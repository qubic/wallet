# Set the source and destination directories
$SourceDirectory = "dist\qubic-wallet\*"
$DestinationDirectory = "cordova\www\app"

Remove-Item .\$SourceDirectory -Recurse -Force  

# Copy files and subdirectories
Copy-Item -Path $SourceDirectory -Destination $DestinationDirectory -Recurse -Force

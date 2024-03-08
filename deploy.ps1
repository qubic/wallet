# Set the source and destination directories
$SourceDirectory = "dist\qubic-wallet\*"
$DestinationDirectory = "cordova\www"


# Copy files and subdirectories
Copy-Item -Path $SourceDirectory -Destination $DestinationDirectory -Recurse -Force
# Remove-Item .\$SourceDirectory -Recurse -Force  

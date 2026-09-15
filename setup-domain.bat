@echo off
title ScriptCraft - Domain Setup
echo ========================================================
echo   Setting up http://scriptcraft.com on your computer...
echo ========================================================

:: Check for administrative rights
net session >nul 2>&1
if %errorlevel% == 0 (
    echo [Administrator privileges confirmed]
) else (
    echo Requesting Administrator privileges to update hosts file...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Add entry to hosts file if not already present
findstr /i "scriptcraft.com" "%SystemRoot%\System32\drivers\etc\hosts" >nul 2>&1
if %errorlevel% neq 0 (
    echo. >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 127.0.0.1 scriptcraft.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 127.0.0.1 www.scriptcraft.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo [OK] Added scriptcraft.com to Windows hosts file!
) else (
    echo [OK] scriptcraft.com is already mapped in your hosts file.
)

:: Flush DNS
ipconfig /flushdns >nul
echo [OK] DNS cache flushed.
echo.
echo ========================================================
echo   Success! http://scriptcraft.com is now configured.
echo ========================================================
echo You can now double-click start.bat to run ScriptCraft!
echo.
pause

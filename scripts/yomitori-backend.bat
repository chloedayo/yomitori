@echo off
REM Sidecar launcher for the Spring Boot backend on Windows.
REM Tauri sets RESOURCE_DIR to the directory containing bundled resources.

set "SCRIPT_DIR=%~dp0"

if "%RESOURCE_DIR%"=="" set "RESOURCE_DIR=%SCRIPT_DIR%"

set "JRE=%RESOURCE_DIR%jre"
set "JAR=%RESOURCE_DIR%yomitori.jar"

if not exist "%JRE%" (
    echo ERROR: bundled JRE not found at %JRE% 1>&2
    exit /b 1
)

if not exist "%JAR%" (
    echo ERROR: yomitori.jar not found at %JAR% 1>&2
    exit /b 1
)

"%JRE%\bin\java.exe" -XX:+UseSerialGC -Xmx512m -jar "%JAR%" %*

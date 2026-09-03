@echo off
REM BACKROOMS レベル管理コマンド  ---  例: level add 2 --danger 25 --push
python "%~dp0tools\level.py" %*

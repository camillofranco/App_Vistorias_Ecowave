#!/bin/bash
clear
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "--------------------------------------------------------"
echo "        ECOWAVE VISTORIA - SERVIDOR E TÚNEL             "
echo "--------------------------------------------------------"
echo "1. Iniciando servidor local na porta 8080..."

# Matar processos anteriores se existirem (limpeza)
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Iniciar o servidor em background
npx -y http-server . -p 8080 > /dev/null 2>&1 &
SERVER_PID=$!

echo "✅ Servidor OK (PID: $SERVER_PID)"
echo "--------------------------------------------------------"
echo "2. Criando link público para celular..."
echo "Aguarde o link aparecer abaixo..."
echo "--------------------------------------------------------"

# Iniciar o túnel
ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run

# Quando o usuário fechar o SSH, matar o servidor
kill $SERVER_PID

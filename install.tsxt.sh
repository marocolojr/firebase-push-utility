#!/bin/bash
# Script para instalar o Firebase Push Utility em um novo projeto

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Firebase Push Utility - Script de Instalação${NC}"
echo "======================================="

# Verificar diretório de destino
if [ -z "$1" ]; then
  TARGET_DIR="."
  echo -e "Instalando no diretório atual: $(pwd)"
else
  TARGET_DIR="$1"
  echo -e "Instalando no diretório: $TARGET_DIR"
  
  # Criar diretório se não existir
  if [ ! -d "$TARGET_DIR" ]; then
    echo -e "Criando diretório $TARGET_DIR..."
    mkdir -p "$TARGET_DIR"
  fi
fi

# Criar estrutura de diretórios
echo -e "\n${BLUE}Criando estrutura de diretórios...${NC}"
mkdir -p "$TARGET_DIR/src"

# Compilar o código TypeScript se ainda não estiver compilado
if [ ! -d "dist" ]; then
  echo -e "\n${BLUE}Compilando código TypeScript...${NC}"
  npm run build
fi

# Copiar arquivos
echo -e "\n${BLUE}Copiando arquivos...${NC}"

# Para projetos JavaScript
if [ -d "dist" ]; then
  cp dist/firebaseMessaging.js "$TARGET_DIR/src/"
  cp dist/index.js "$TARGET_DIR/src/"
  echo -e "${GREEN}✓${NC} Arquivos JavaScript copiados"
fi

# Para projetos TypeScript
cp src/firebaseMessaging.ts "$TARGET_DIR/src/"
cp src/index.ts "$TARGET_DIR/src/"
echo -e "${GREEN}✓${NC} Arquivos TypeScript copiados"

# Copiar exemplos
mkdir -p "$TARGET_DIR/examples"
cp examples/test.js "$TARGET_DIR/examples/"
cp examples/test.ts "$TARGET_DIR/examples/"
echo -e "${GREEN}✓${NC} Exemplos copiados"

# Copiar arquivo de exemplo de ambiente
cp env.example "$TARGET_DIR/.env.example"
echo -e "${GREEN}✓${NC} Arquivo .env.example copiado"

# Copiar README
cp README.md "$TARGET_DIR/README_FIREBASE_PUSH.md"
echo -e "${GREEN}✓${NC} Documentação copiada"

echo -e "\n${GREEN}Instalação concluída!${NC}"
echo -e "\nPara usar o Firebase Push Utility:"
echo -e "1. Configure seu arquivo .env com base no .env.example"
echo -e "2. Importe as funções em seu código conforme mostrado no README_FIREBASE_PUSH.md"
echo -e "3. Execute o exemplo para testar: node examples/test.js"

# Tornar o script executável 
chmod +x "$TARGET_DIR/examples/test.js" 
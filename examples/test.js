/**
 * Exemplo de uso do utilitário de Firebase Cloud Messaging
 */

// Carregar as variáveis de ambiente do .env
require('dotenv').config();

// Importar as funções do nosso pacote
const { createFCMService, createServiceAccountFromJson } = require('../dist');

// Função principal de teste
async function main() {
  try {
    console.log('Iniciando teste de Firebase Cloud Messaging...');

    // Obter JSON da conta de serviço do Firebase das variáveis de ambiente
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('Variável de ambiente FIREBASE_SERVICE_ACCOUNT não configurada');
    }
    
    // Criar o objeto da conta de serviço a partir do JSON
    const serviceAccount = createServiceAccountFromJson(serviceAccountJson);
    
    // Inicializar o serviço FCM
    const fcmService = createFCMService(serviceAccount);
    
    // Obter token de acesso (apenas como teste)
    const accessToken = await fcmService.getAccessToken();
    console.log(`Token de acesso obtido: ${accessToken.substring(0, 10)}...`);
    
    // Token FCM do dispositivo ou usuário para quem você deseja enviar a notificação
    // Isso deve ser um token FCM válido para um dispositivo registrado
    const deviceToken = process.env.TEST_DEVICE_TOKEN;
    if (!deviceToken) {
      console.log('Variável TEST_DEVICE_TOKEN não configurada. Pulando envio de notificação.');
      return;
    }

    // Enviar uma notificação de teste
    console.log(`Enviando notificação para o token: ${deviceToken.substring(0, 10)}...`);
    const result = await fcmService.sendNotification(
      deviceToken,
      {
        title: 'Teste de Notificação',
        body: 'Esta é uma notificação de teste enviada pelo utilitário FCM'
      },
      {
        // Dados adicionais opcionais
        type: 'test',
        timestamp: Date.now().toString()
      }
    );
    
    console.log('Notificação enviada com sucesso!');
    console.log('Resposta da API FCM:', result);
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

// Executar a função principal
main(); 
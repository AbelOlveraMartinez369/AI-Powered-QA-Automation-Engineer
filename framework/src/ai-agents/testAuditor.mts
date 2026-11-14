// Importa el módulo fs para leer archivos del sistema
import fs from 'fs';
// Importa path para construir rutas de archivos de forma segura
import path from 'path';
// Importa el SDK de OpenAI (compatible con DeepSeek)
import OpenAI from 'openai';

// Inicializa el cliente de DeepSeek
const client = new OpenAI({
  // URL base de la API de DeepSeek
  baseURL: 'https://api.deepseek.com',
  // Lee la API Key de las variables de entorno
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Función que lee un archivo de test y lo envía a DeepSeek para auditarlo
async function auditTestFile(filePath: string): Promise<void> {
  // Lee el contenido del archivo de test
  const testContent = fs.readFileSync(filePath, 'utf-8');
  // Extrae solo el nombre del archivo para mostrarlo en el reporte
  const fileName = path.basename(filePath);

  // Construye el prompt para DeepSeek
  const prompt = `Eres un Senior SDET experto en calidad de tests. Analiza el siguiente archivo de test de Playwright.

Criterios para clasificar un test como DÉBIL:
1. No tiene aserciones (expect) después de las acciones principales.
2. Usa aserciones que siempre pasan (ej. expect(true).toBe(true)).
3. Solo prueba el "happy path" y no casos negativos o de error.
4. Las aserciones no verifican el estado real de la aplicación (solo que no hubo excepción).

Criterios para clasificar un test como FUERTE:
1. Tiene aserciones después de cada acción crítica.
2. Verifica el estado real (ej. que un elemento aparezca, que una API devuelva el código correcto).
3. Cubre al menos un caso negativo (ej. error, campo vacío, 404).

Responde en este formato exacto:
- Archivo: ${fileName}
- Clasificación: [DÉBIL o FUERTE]
- Razón: [una línea explicando por qué]
- Sugerencia: [una línea con qué aserción agregar, si es débil]`;

  // Envía el prompt a DeepSeek
  const response = await client.chat.completions.create({
    // Modelo económico de DeepSeek
    model: 'deepseek-chat',
    // Mensajes del sistema y del usuario
    messages: [
      { role: 'system', content: 'Eres un auditor de tests de Playwright.' },
      { role: 'user', content: prompt + '\n\n' + testContent },
    ],
    // Temperatura baja para respuestas deterministas
    temperature: 0.2,
  });

  // Imprime el resultado en consola
  console.log('\n' + '='.repeat(60));
  console.log(response.choices[0].message.content);
  console.log('='.repeat(60) + '\n');
}

// Función principal que audita todos los archivos de una carpeta
async function runAudit() {
  // Define la carpeta donde están los tests a auditar
  const testsDir = process.argv[2] || './tests/ui';
  // Lee todos los archivos .spec.ts de la carpeta
  const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));

  // Si no hay archivos, avisa y termina
  if (files.length === 0) {
    console.log('❌ No se encontraron archivos .spec.ts en:', testsDir);
    return;
  }

  // Avisa cuántos archivos se van a auditar
  console.log(`🔍 Auditando ${files.length} archivo(s) en ${testsDir}...\n`);

  // Itera sobre cada archivo y lo audita
  for (const file of files) {
    // Construye la ruta completa del archivo
    const filePath = path.join(testsDir, file);
    // Llama a la función de auditoría
    await auditTestFile(filePath);
  }
}

// Ejecuta el auditor
runAudit();
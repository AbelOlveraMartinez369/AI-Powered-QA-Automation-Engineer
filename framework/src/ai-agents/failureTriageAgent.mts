// Importa el módulo fs para leer archivos del sistema
import fs from 'fs';
// Importa path para construir rutas de archivos de forma segura
import path from 'path';
// Importa el SDK de OpenAI (compatible con DeepSeek)
import OpenAI from 'openai';

// Inicializa el cliente de DeepSeek usando el SDK de OpenAI
const client = new OpenAI({
  // URL base de la API de DeepSeek
  baseURL: 'https://api.deepseek.com',
  // API Key de DeepSeek (la que configuraste en OpenCode)
  apiKey: 'sk-a1d205a5f2d0450c86427d15696596e8',
});

// Define el tipo de un resultado de Allure
type AllureResult = {
  name: string;
  status: string;
  statusMessage?: string;
  statusTrace?: string;
};

// Función que carga solo los tests fallidos de la carpeta de resultados
function loadFailedTests(resultsDir: string): AllureResult[] {
  // Lee todos los archivos de la carpeta
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));

  // Parsea cada archivo y filtra solo los fallidos o rotos
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf-8')))
    .filter((r: AllureResult) => r.status === 'failed' || r.status === 'broken');
}

// Función que clasifica un fallo usando DeepSeek
async function classifyFailure(test: AllureResult): Promise<string> {
  // Construye el prompt con el nombre, mensaje y trace del test
  const prompt = `Eres un Senior SDET. Analiza este fallo de test y clasifícalo
en una de estas categorías: "BUG_REAL", "TEST_FLAKY", "SELECTOR_ROTO",
"PROBLEMA_DE_AMBIENTE". Da una razón breve.

Test: ${test.name}
Mensaje: ${test.statusMessage}
Trace: ${test.statusTrace}

Responde en formato: CATEGORÍA - razón en una línea.`;

  // Envía el prompt a DeepSeek
  const response = await client.chat.completions.create({
    // Modelo de DeepSeek (el económico)
    model: 'deepseek-chat',
    // Mensaje del sistema para dar contexto
    messages: [
      { role: 'system', content: 'Eres un experto en QA que clasifica fallos de tests.' },
      { role: 'user', content: prompt },
    ],
    // Temperatura baja para respuestas más deterministas
    temperature: 0.2,
  });

  // Retorna la respuesta de DeepSeek
  return response.choices[0].message.content ?? 'Sin clasificación';
}

// Función principal que ejecuta el triage
async function runTriage() {
  // Carga los tests fallidos
  const failedTests = loadFailedTests('./allure-results');

  // Si no hay fallos, avisa y termina
  if (failedTests.length === 0) {
    console.log('✅ No hay fallos que triage.');
    return;
  }

  // Muestra cuántos fallos se van a analizar
  console.log(`🔍 Analizando ${failedTests.length} fallo(s)...\n`);

  // Itera sobre cada fallo y lo clasifica
  for (const test of failedTests) {
    // Llama a la función de clasificación
    const classification = await classifyFailure(test);
    // Imprime el nombre del test y su clasificación
    console.log(`❌ ${test.name}`);
    console.log(`   → ${classification}\n`);
  }
}

// Ejecuta el agente
runTriage();
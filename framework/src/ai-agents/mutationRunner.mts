// Importa el módulo fs para leer y escribir archivos del sistema
import fs from 'fs';
// Importa path para construir rutas de archivos de forma segura
import path from 'path';

// Define un tipo para un mutante
type Mutant = {
  // ID único del mutante
  id: string;
  // Archivo donde se aplica la mutación
  file: string;
  // Descripción legible de la mutación
  description: string;
  // Patrón original a buscar en el código
  original: string;
  // Patrón mutado a reemplazar
  mutant: string;
};

// Lista de mutantes predefinidos para PetClinic (simulación didáctica)
const mutants: Mutant[] = [
  {
    // ID del mutante
    id: 'owner-count-001',
    // Archivo del test de búsqueda donde se aplica
    file: './tests/ui/find-owners.spec.ts',
    // Descripción legible
    description: 'Cambiar la aserción de conteo de 2 filas a "al menos 2"',
    // Patrón original (verifica que haya exactamente 2 filas)
    original: 'await expect(ownersListPage.rows).toHaveCount(2);',
    // Patrón mutado (verifica que haya al menos 2, lo cual siempre pasa si hay 2 o más)
    mutant: 'await expect(ownersListPage.rows.count()).resolves.toBeGreaterThanOrEqual(2);',
  },
  {
    // ID del mutante
    id: 'owner-name-001',
    // Archivo del test de búsqueda donde se aplica
    file: './tests/ui/find-owners.spec.ts',
    // Descripción legible
    description: 'Comentar la aserción de visibilidad de Betty Davis',
    // Patrón original (verifica que Betty Davis sea visible)
    original: "await expect(ownersListPage.rowByName('Betty Davis')).toBeVisible();",
    // Patrón mutado (comentado, el test seguiría pasando si no se verifica)
    mutant: "// await expect(ownersListPage.rowByName('Betty Davis')).toBeVisible();",
  },
];

// Función que aplica un mutante a un archivo y verifica si el test lo detecta
async function runMutation(mutant: Mutant): Promise<void> {
  // Resuelve la ruta absoluta del archivo
  const filePath = path.resolve(mutant.file);
  // Lee el contenido original del archivo
  const originalContent = fs.readFileSync(filePath, 'utf-8');

  // Verifica si el patrón original existe en el archivo
  if (!originalContent.includes(mutant.original)) {
    // Si no existe, avisa y salta este mutante
    console.log(`⚠️  [${mutant.id}] Patrón no encontrado en ${mutant.file}. Saltando.`);
    return;
  }

  // Aplica la mutación (reemplaza el patrón original por el mutado)
  const mutatedContent = originalContent.replace(mutant.original, mutant.mutant);
  // Escribe el archivo mutado en disco
  fs.writeFileSync(filePath, mutatedContent, 'utf-8');

  // Muestra en consola qué mutación se aplicó
  console.log(`\n🧬 [${mutant.id}] Mutación aplicada: ${mutant.description}`);
  console.log(`   Archivo: ${mutant.file}`);

  // Aquí, en un escenario real, correrías los tests y verificarías si fallan.
  // Para esta demo, solo mostramos el concepto.
  console.log(`   ⏳ Ejecuta "npm run test:ui" y observa si el test FALLA (mutante KILLED) o PASA (mutante SURVIVED).`);

  // Restaura el archivo original (para no dejar el código mutado)
  fs.writeFileSync(filePath, originalContent, 'utf-8');
  console.log(`   ✅ Archivo restaurado.\n`);
}

// Función principal que ejecuta todas las mutaciones
async function runMutations() {
  // Avisa que empieza la simulación
  console.log('🧬 Iniciando Mutation Testing (simulación didáctica)...\n');
  // Itera sobre cada mutante
  for (const mutant of mutants) {
    // Aplica el mutante
    await runMutation(mutant);
  }
  // Avisa que terminó
  console.log('📊 Análisis completado. Revisa la salida de los tests para determinar el Mutation Score.');
}

// Ejecuta el runner
runMutations();
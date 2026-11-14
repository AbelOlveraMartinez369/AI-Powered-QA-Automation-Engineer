// Importa test y expect desde el archivo de fixtures de páginas
import { test, expect } from '@fixtures/pageFixtures';

// Inicia un bloque describe para agrupar los tests de búsqueda de owners con tag @ui
test.describe('Busqueda de owners - escenarios generados', { tag: '@ui' }, () => {
  // Declara un test para el escenario OWNER-SEARCH-001 (camino feliz con "Davis")
  test('OWNER-SEARCH-001: buscar el apellido existente "Davis" devuelve los owners que coinciden', async ({
    // Recibe la fixture homePage del contexto del test
    homePage,
    // Recibe la fixture navbar del contexto del test
    navbar,
    // Recibe la fixture findOwnersPage del contexto del test
    findOwnersPage,
    // Recibe la fixture ownersListPage del contexto del test
    ownersListPage,
    // Recibe la fixture page del contexto del test
    page,
  }) => {
    // Paso 1: navega a la raíz y abre el menú OWNERS -> Search
    await test.step('Abrir la pantalla de búsqueda desde OWNERS -> Search', async () => {
      // Abre la página principal usando el método open de homePage
      await homePage.open();
      // Usa el navbar para navegar a la opción Search de Owners
      await navbar.goToOwnersSearch();
      // Espera a que la página de búsqueda esté cargada (input y primera fila presentes)
      await findOwnersPage.waitUntilLoaded();
    });

    // Paso 2: rellena el apellido y hace clic en Find Owner esperando la respuesta del API
    await test.step('Buscar el apellido "Davis"', async () => {
      // Realiza la búsqueda del apellido Davis usando el Page Object
      await findOwnersPage.searchByLastName('Davis');
    });

    // Paso 3: valida la tabla de resultados (filas de owners y links con href)
    await test.step('Verificar las filas y los links de los owners encontrados', async () => {
      // En los datos originales de PetClinic hay 2 Davis: Betty y Harold
      // Verifica que la lista de owners tenga exactamente 2 filas (excluye sub-filas de mascotas)
      await expect(ownersListPage.rows).toHaveCount(2);
      // Usa el selector de hijos directos del tbody para contar solo filas de owners
      await expect(page.locator('table tbody > tr')).toHaveCount(2);
      // Verifica que el link del owner Betty Davis sea visible
      await expect(page.getByRole('link', { name: 'Betty Davis' })).toBeVisible();
      // Verifica que el link del owner Harold Davis sea visible
      await expect(page.getByRole('link', { name: 'Harold Davis' })).toBeVisible();
      // Localiza los links de nombre de owner para validar sus href
      const nameLinks = page.locator('td.ownerFullName > a');
      // Verifica el texto de los links en el orden en que los devuelve el API
      await expect(nameLinks).toHaveText(['Betty Davis', 'Harold Davis']);
      // Verifica que el link de Betty Davis apunte al owner con id 2
      await expect(page.getByRole('link', { name: 'Betty Davis' })).toHaveAttribute('href', '/petclinic/owners/2');
      // Verifica que el link de Harold Davis apunte al owner con id 4
      await expect(page.getByRole('link', { name: 'Harold Davis' })).toHaveAttribute('href', '/petclinic/owners/4');
      // Verifica que no se muestre un owner que no coincide con Davis
      await expect(page.getByRole('link', { name: 'George Franklin' })).toHaveCount(0);
    });

    // Paso 4: valida el valor del input y la URL después de la búsqueda
    await test.step('Verificar el valor del input y la URL tras la búsqueda', async () => {
      // Verifica que el input de búsqueda (selector exacto #lastName) conserva el apellido buscado
      await expect(page.locator('#lastName')).toHaveValue('Davis');
      // Verifica que la URL permanece en la pantalla de owners
      await expect(page).toHaveURL(/\/owners$/);
    });
  });

  // Declara un test para el escenario OWNER-SEARCH-002 (sin resultados)
  test('OWNER-SEARCH-002: buscar un apellido inexistente muestra el mensaje de "no owners" sin filas', async ({
    // Recibe la fixture findOwnersPage del contexto del test
    findOwnersPage,
    // Recibe la fixture ownersListPage del contexto del test
    ownersListPage,
    // Recibe la fixture page del contexto del test
    page,
  }) => {
    // Paso 1: abre la pantalla de búsqueda desde la raíz (OWNERS -> Search)
    await test.step('Abrir la pantalla de búsqueda de owners', async () => {
      // Abre la página de búsqueda usando el método open del Page Object
      await findOwnersPage.open();
    });

    // Paso 2: busca un apellido que no existe
    await test.step('Buscar el apellido inexistente "Zzznosuchname"', async () => {
      // Realiza la búsqueda usando el Page Object para esperar la respuesta del API
      await findOwnersPage.searchByLastName('Zzznosuchname');
    });

    // Paso 3: valida el área de resultados y el mensaje mostrado
    await test.step('Verificar que no hay tabla y que aparece el mensaje con el término buscado', async () => {
      // Verifica que la lista de owners tenga cero filas
      await expect(ownersListPage.rows).toHaveCount(0);
      // Verifica que la tabla se elimina por completo del DOM
      await expect(page.locator('table')).toHaveCount(0);
      // Verifica que se muestre el mensaje genérico de "no encontrado"
      await expect(
        page.getByText(/No owners with LastName starting with/i),
      ).toBeVisible();
      // Verifica que el mensaje cite exactamente el término buscado
      await expect(
        page.getByText(/No owners with LastName starting with "Zzznosuchname"/i),
      ).toBeVisible();
    });

    // Paso 4: valida que se mantiene en la pantalla y el input conserva el término
    await test.step('Verificar que el input conserva el término y la página sigue interactiva', async () => {
      // Verifica que el input conserva el apellido buscado
      await expect(page.locator('#lastName')).toHaveValue('Zzznosuchname');
      // Verifica que la URL permanece en la pantalla de owners
      await expect(page).toHaveURL(/\/owners$/);
      // Verifica que el botón Find Owner sigue presente (la página no quedó rota)
      await expect(page.getByRole('button', { name: 'Find Owner' })).toBeVisible();
    });
  });

  // Declara un test para el escenario OWNER-SEARCH-003 (campo vacío)
  test('OWNER-SEARCH-003: enviar el campo vacío mantiene la lista completa de owners', async ({
    // Recibe la fixture findOwnersPage del contexto del test
    findOwnersPage,
    // Recibe la fixture ownersListPage del contexto del test
    ownersListPage,
    // Recibe la fixture page del contexto del test
    page,
  }) => {
    // Paso 1: abre la pantalla de búsqueda (la lista completa se carga primero)
    await test.step('Abrir la pantalla de búsqueda de owners', async () => {
      // Abre la página de búsqueda usando el método open del Page Object
      await findOwnersPage.open();
    });

    // Paso 2: captura la primera fila y confirma que el campo está vacío
    // Declara la variable que guardará el texto de la primera fila antes de buscar
    let firstRowText: string | null = null;
    await test.step('Confirmar que el campo está vacío y guardar la primera fila', async () => {
      // Verifica que el input de apellido esté vacío antes de enviar
      await expect(page.locator('#lastName')).toHaveValue('');
      // Verifica que la primera fila de la lista completa sea visible
      await expect(ownersListPage.rows.first()).toBeVisible();
      // Guarda el texto de la primera fila para compararlo después de la búsqueda
      firstRowText = await ownersListPage.rows.first().textContent();
      // Verifica que la lista completa tenga más de un owner
      expect(await ownersListPage.rows.count()).toBeGreaterThan(1);
    });

    // Paso 3: envía el formulario sin escribir nada esperando la llamada sin filtro
    await test.step('Enviar la búsqueda con el campo vacío', async () => {
      // Espera la respuesta del API sin el parámetro lastName y hace clic en Find Owner
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/owners') && !r.url().includes('lastName=')),
        page.getByRole('button', { name: 'Find Owner' }).click(),
      ]);
    });

    // Paso 4: valida que la lista completa se mantiene y no hay mensaje de error
    await test.step('Verificar que se mantiene la lista completa sin mensajes de error', async () => {
      // Verifica que la primera fila siga visible tras la búsqueda vacía
      await expect(ownersListPage.rows.first()).toBeVisible();
      // Verifica que la primera fila sea la misma que antes (no se aplicó filtro)
      await expect(ownersListPage.rows.first()).toHaveText(firstRowText ?? '');
      // Verifica que la lista siga teniendo más de un owner (no se filtró)
      expect(await ownersListPage.rows.count()).toBeGreaterThan(1);
      // Verifica que no aparezca el mensaje de "no owners"
      await expect(page.getByText(/No owners with LastName starting with/i)).toHaveCount(0);
    });

    // Paso 5: valida la URL y que el input permanece vacío
    await test.step('Verificar la URL y el input tras la búsqueda vacía', async () => {
      // Verifica que la URL permanece en la pantalla de owners
      await expect(page).toHaveURL(/\/owners$/);
      // Verifica que el input sigue vacío después de la búsqueda
      await expect(page.locator('#lastName')).toHaveValue('');
    });
  });

  // Declara un test para el escenario OWNER-SEARCH-004 (estado del botón Find Owner)
  test('OWNER-SEARCH-004: el botón "Find Owner" está visible y habilitado en todos los estados del campo', async ({
    // Recibe la fixture findOwnersPage del contexto del test
    findOwnersPage,
    // Recibe la fixture ownersListPage del contexto del test
    ownersListPage,
    // Recibe la fixture page del contexto del test
    page,
  }) => {
    // Paso 1: abre la pantalla de búsqueda
    await test.step('Abrir la pantalla de búsqueda de owners', async () => {
      // Abre la página de búsqueda usando el método open del Page Object
      await findOwnersPage.open();
    });

    // Paso 2: valida el estado inicial del botón con el campo vacío
    await test.step('Verificar el botón con el campo vacío (estado inicial)', async () => {
      // Localiza el botón Find Owner para reutilizarlo en todo el test
      const findButton = page.getByRole('button', { name: 'Find Owner' });
      // Localiza el input de apellido con su selector exacto
      const lastNameInput = page.locator('#lastName');
      // Verifica que el botón Find Owner sea visible
      await expect(findButton).toBeVisible();
      // Verifica que el botón Find Owner esté habilitado
      await expect(findButton).toBeEnabled();
      // Verifica que el botón no tenga el atributo disabled
      await expect(findButton).not.toHaveAttribute('disabled', /.*/);
      // Verifica que el botón no tenga aria-disabled en "true"
      await expect(findButton).not.toHaveAttribute('aria-disabled', 'true');
      // Verifica que el campo esté vacío en este estado
      await expect(lastNameInput).toHaveValue('');
    });

    // Paso 3: valida que el botón sigue habilitado con un valor en el campo
    await test.step('Verificar el botón con el campo relleno', async () => {
      // Rellena el input de apellido con Davis
      await page.locator('#lastName').fill('Davis');
      // Verifica que el botón Find Owner siga visible
      await expect(page.getByRole('button', { name: 'Find Owner' })).toBeVisible();
      // Verifica que el botón Find Owner siga habilitado con un valor
      await expect(page.getByRole('button', { name: 'Find Owner' })).toBeEnabled();
    });

    // Paso 4: valida que el botón sigue habilitado después de limpiar el campo
    await test.step('Verificar el botón con el campo limpiado de nuevo', async () => {
      // Limpia el input de apellido
      await page.locator('#lastName').fill('');
      // Verifica que el botón Find Owner siga habilitado tras limpiar el campo
      await expect(page.getByRole('button', { name: 'Find Owner' })).toBeEnabled();
    });

    // Paso 5: hace clic y confirma que el botón dispara una búsqueda (no está inerte)
    await test.step('Verificar que el clic dispara la búsqueda', async () => {
      // Espera la respuesta del API de owners y hace clic en Find Owner
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/owners')),
        page.getByRole('button', { name: 'Find Owner' }).click(),
      ]);
      // Verifica que la lista de owners se vuelve a mostrar tras la búsqueda
      await expect(ownersListPage.rows.first()).toBeVisible();
    });
  });
});

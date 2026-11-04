import { expect, test } from '@playwright/test';
import { NAVIGATION_MODULES } from '../../src/utils/permissions';
import { getPathForTab, NAVIGATION_ROUTES, type NavigationTab } from '../../src/routes/navigation';

const localOrigin = 'http://127.0.0.1:4178';

const navigationLabels: Record<string, string> = {
  dashboard: 'Dashboard Eksekutif',
  projects: 'Manajemen Proyek',
  rab: 'RAB, BOQ & AHSP',
  field_reports: 'Laporan Lapangan & Kurva S',
  procurement: 'Procurement / PO',
  warehouse: 'Gudang & Stok Material',
  subcontractors: 'Subkontraktor & Mandor',
  finance: 'Keuangan & Kasbon Proyek',
  hr_manpower: 'SDM & Absensi Pekerja',
  equipment: 'Peralatan & Aset Alat Berat',
  safety_qc: 'K3, Mutu & Punch List',
  documents: 'Dokumen & Gambar Kerja',
  approvals: 'Pusat Approval Berjenjang',
  reports: 'Laporan & Analitik',
  settings: 'Pengaturan & Tim',
};

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
] as const;

const themes = ['light', 'dark'] as const;

for (const tab of Object.keys(NAVIGATION_MODULES)) {
  test(`${tab} tab visual baseline`, async ({ browser }) => {
    test.setTimeout(120_000);

    for (const theme of themes) {
      const context = await browser.newContext({
        baseURL: localOrigin,
        colorScheme: 'light',
        locale: 'id-ID',
        reducedMotion: 'reduce',
        timezoneId: 'Asia/Jakarta',
        viewport: { width: 1280, height: 900 },
      });
      try {
        await context.route('**/*', async (route) => {
          if (new URL(route.request().url()).origin === localOrigin) {
            await route.continue();
            return;
          }
          await route.abort();
        });

        const page = await context.newPage();
        await page.addInitScript((initialTheme) => {
          localStorage.setItem('indotek_theme', initialTheme);
        }, theme);
        await page.goto('/');
        await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

        if (tab !== 'dashboard') {
          const tabButton = page
            .getByRole('navigation', { name: 'Navigasi aplikasi' })
            .getByRole('link', { name: navigationLabels[tab] });
          await tabButton.click();
          await expect(tabButton).toHaveAttribute('aria-current', 'page');
          await page.waitForLoadState('networkidle');
          await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
        }

        const expectedPath = getPathForTab(tab as NavigationTab);
        await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll('/', '\\/')}$`));

        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation: none !important;
              caret-color: transparent !important;
              scroll-behavior: auto !important;
              transition: none !important;
            }
          `,
        });
        await page.evaluate(() => document.fonts.ready);

        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          if (tab === 'dashboard') {
            await expect(page.locator('main[aria-busy="false"]')
              .getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible({ timeout: 30_000 });
          }
          await expect(page).toHaveScreenshot(`${tab}-${viewport.name}-${theme}.png`, {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.001,
            timeout: 15_000,
          });
        }

      } finally {
        await context.close();
      }
    }
  });
}

test('navigation routes load directly and remain available after refresh', async ({ page }) => {
  test.setTimeout(120_000);

  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  for (const { path } of NAVIGATION_ROUTES) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(`${localOrigin}${path}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(`${localOrigin}${path}`);
  }
});

test('tablet header keeps primary controls and project context in two rows', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const header = page.locator('header.safe-area-topbar');
  for (const width of [640, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('combobox', { name: 'Konteks proyek' })).toBeVisible();

    const layout = await header.evaluate((element) => {
      const rows = [...element.children].map((child) =>
        Math.round(child.getBoundingClientRect().top),
      );
      return {
        height: Math.round(element.getBoundingClientRect().height),
        rows,
      };
    });

    expect(layout.height, JSON.stringify({ width, ...layout })).toBeLessThanOrEqual(120);
    expect(Math.abs(layout.rows[0] - layout.rows[1])).toBeLessThanOrEqual(4);
    expect(layout.rows[2]).toBeGreaterThan(layout.rows[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('desktop header keeps route context readable beside primary controls', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const header = page.locator('header.safe-area-topbar');
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await header.evaluate((element) => {
      const [primary, controls] = [...element.children];
      const routeLabel = [...element.querySelectorAll('li')].find(
        (item) => item.textContent?.trim() === 'Dashboard Eksekutif',
      );
      const primaryBounds = primary.getBoundingClientRect();
      const controlsBounds = controls.getBoundingClientRect();
      const routeBounds = routeLabel?.getBoundingClientRect();

      return {
        height: Math.round(element.getBoundingClientRect().height),
        groupsOverlap: primaryBounds.right > controlsBounds.left,
        routeFits: routeLabel
          ? routeLabel.scrollWidth <= routeLabel.clientWidth
          : false,
        routeHasSpace: routeBounds ? routeBounds.width > 0 : false,
        documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    expect(layout.height, JSON.stringify({ width, ...layout })).toBe(64);
    expect(layout.groupsOverlap, JSON.stringify({ width, ...layout })).toBe(false);
    expect(layout.routeHasSpace, JSON.stringify({ width, ...layout })).toBe(true);
    expect(layout.documentFits, JSON.stringify({ width, ...layout })).toBe(true);
    if (width >= 1280) {
      expect(layout.routeFits, JSON.stringify({ width, ...layout })).toBe(true);
    }
  }
});

test('mobile header stays compact without horizontal overflow', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const header = page.locator('header.safe-area-topbar');
  for (const width of [360, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(header.getByText('Dashboard Eksekutif', { exact: true }).first()).toBeVisible();

    const height = await header.evaluate((element) => Math.round(element.getBoundingClientRect().height));
    expect(height, `header height at ${width}px`).toBeGreaterThanOrEqual(56);
    expect(height, `header height at ${width}px`).toBeLessThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('desktop sidebar groups routes and persists keyboard collapse state', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const navigation = page.getByRole('navigation', { name: 'Navigasi aplikasi' });
  const sidebar = page.locator('[data-slot="sidebar"][data-collapsible]');
  await expect(navigation.getByRole('link', { name: 'Dashboard Eksekutif' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByText('Operasional Proyek')).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Pengaturan & Tim' })).toHaveAttribute('href', '/settings');
  await expect(sidebar).toHaveAttribute('data-collapsible', '');

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(sidebar).toHaveAttribute('data-collapsible', '');

  await page.keyboard.press('Control+b');
  await expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain('sidebar_state=false');

  await page.setViewportSize({ width: 1516, height: 900 });
  const main = page.locator('main[aria-busy="false"]');
  await expect.poll(async () => {
    const bounds = await main.boundingBox();
    return bounds ? 1516 - (bounds.x + bounds.width) : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(8);

  await page.reload();
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-slot="sidebar"][data-collapsible]')).toHaveAttribute('data-collapsible', 'icon');

  await page.keyboard.press('Control+b');
  await expect(page.locator('[data-slot="sidebar"][data-collapsible]')).toHaveAttribute('data-collapsible', '');
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain('sidebar_state=true');
});

test('sidebar groups animate height and chevrons, remaining expanded in icon rail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const navigation = page.getByRole('navigation', { name: 'Navigasi aplikasi' });
  const sidebar = page.locator('[data-slot="sidebar"][data-collapsible]');
  const main = page.locator('main[aria-busy="false"]');
  const trigger = navigation.getByRole('button', { name: 'Pengadaan & Logistik' });
  const group = trigger.locator('xpath=ancestor::*[@data-slot="collapsible"]');
  const content = group.locator('[data-slot="collapsible-content"]');
  const chevron = trigger.locator('.sidebar-group-chevron');
  const mainBounds = await main.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });

  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(chevron).toHaveCSS('transition-duration', '0.2s');
  await content.evaluate((element) => {
    element.addEventListener('animationstart', () => {
      element.setAttribute('data-animation-started', 'true');
    }, { once: true });
  });
  await trigger.click();
  await expect(content).toHaveAttribute('data-animation-started', 'true');
  await expect.poll(() => main.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  })).toEqual(mainBounds);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toHaveAttribute('data-state', 'closed');
  await expect(content).toHaveCSS('animation-duration', '0.3s');

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toHaveAttribute('data-state', 'open');

  await page.getByRole('button', { name: 'Ciutkan atau lebarkan navigasi' }).first().click();
  await expect(page.locator('[data-slot="sidebar"][data-collapsible]')).toHaveAttribute('data-collapsible', 'icon');
  await expect(content).toHaveAttribute('data-state', 'open');
  await expect(trigger).toBeDisabled();

  const sidebarContainer = page.locator('[data-slot="sidebar-container"]');
  const railCenter = await sidebarContainer.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left + bounds.width / 2;
  });
  const iconCenters = await navigation.locator('[data-sidebar="menu-button"] svg').evaluateAll((icons) => (
    icons.map((icon) => {
      const bounds = icon.getBoundingClientRect();
      return bounds.left + bounds.width / 2;
    })
  ));
  const organizationIconCenter = await sidebarContainer.locator('[data-sidebar="header"] svg').evaluate((icon) => {
    const bounds = icon.getBoundingClientRect();
    return bounds.left + bounds.width / 2;
  });
  const toggleCenter = await sidebarContainer.locator('[data-sidebar="footer"] button').evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    return bounds.left + bounds.width / 2;
  });
  const alignedCenters = [...iconCenters, organizationIconCenter, toggleCenter];

  expect(iconCenters.length).toBeGreaterThan(0);
  for (const center of alignedCenters) {
    expect(Math.abs(center - railCenter), JSON.stringify({ railCenter, alignedCenters })).toBeLessThanOrEqual(1);
  }

  await page.getByRole('button', { name: 'Ciutkan atau lebarkan navigasi' }).first().click();
  await expect(sidebar).toHaveAttribute('data-collapsible', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  await expect(content).toHaveCSS('animation-duration', '1e-05s');
});

test('shared tabs, buttons, and table rows expose responsive hover and focus states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/');
  await page.evaluate(async (harnessPath) => {
    const { mountNavigationMotionHarness } = await import(harnessPath);
    mountNavigationMotionHarness();
  }, '/e2e/fixtures/NavigationMotionHarness.tsx');

  const button = page.getByRole('button', { name: 'Simpan', exact: true });
  await expect(button).toHaveCSS('transition-duration', '0.15s');
  await button.focus();
  await expect(button).toBeFocused();

  const primaryButton = page.getByRole('button', { name: 'Tombol utama' });
  await expect(primaryButton).toHaveAttribute('data-variant', 'default');
  await expect(primaryButton).toHaveCSS('min-height', '44px');
  await expect(page.getByRole('button', { name: 'Tombol aksen' })).toHaveCSS('background-color', 'rgb(245, 158, 11)');
  await expect(page.getByRole('button', { name: 'Memproses' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Memproses' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('heading', { name: 'Judul card uji', level: 2 })).toHaveAttribute('data-slot', 'card-title');
  await expect(page.getByText('Deskripsi card uji')).toHaveJSProperty('tagName', 'P');
  await expect(page.getByText('Status berhasil')).toHaveCSS('background-color', 'rgb(232, 246, 236)');
  const testInput = page.getByRole('textbox', { name: 'Kode uji' });
  await expect(testInput).toHaveAttribute('aria-describedby', 'test-code-message');
  await expect(page.locator('#test-code-message')).toHaveText('Petunjuk input');
  await expect(page.getByText('Rp', { exact: true })).toBeVisible();
  const testCheckbox = page.getByRole('checkbox', { name: 'Akses uji' });
  await expect(testCheckbox).toHaveAttribute('aria-checked', 'false');
  await testCheckbox.click();
  await expect(testCheckbox).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('input[name="test-checkbox"]')).toBeChecked();
  await page.getByText('Akses uji', { exact: true }).click();
  await expect(testCheckbox).toHaveAttribute('aria-checked', 'false');
  await testCheckbox.click();
  await expect(testCheckbox).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('input[name="test-checkbox"]')).toBeChecked();
  const submittedCheckboxValue = await page.locator('#checkbox-form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('test-checkbox'));
  expect(submittedCheckboxValue).toBe('enabled');
  await expect(page.getByRole('checkbox', { name: 'Pilihan sebagian' })).toHaveAttribute('aria-checked', 'mixed');
  const testSwitch = page.getByRole('switch', { name: 'Notifikasi uji' });
  await expect(testSwitch).toHaveAttribute('aria-checked', 'false');
  await page.getByText('Notifikasi uji', { exact: true }).click();
  await expect(testSwitch).toHaveAttribute('aria-checked', 'true');
  await testSwitch.press('Space');
  await expect(testSwitch).toHaveAttribute('aria-checked', 'false');
  const testSelect = page.getByRole('combobox', { name: 'Pilihan uji' });
  await expect(testSelect).toHaveAttribute('aria-describedby', 'test-select-message');
  await expect(page.locator('#test-select-message')).toHaveText('Pilih satu opsi');
  await expect(testSelect).toContainText('Alpha');
  await testSelect.click();
  await page.getByRole('option', { name: 'Pilih opsi' }).click();
  await expect(page.getByTestId('selected-value')).toHaveText('');
  await testSelect.click();
  await page.getByRole('option', { name: 'Beta' }).click();
  await expect(page.getByTestId('selected-value')).toHaveText('beta');
  await expect(page.locator('select[name="test-select"]')).toHaveValue('beta');
  const submittedSelectValue = await page.locator('#select-form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('test-select'));
  expect(submittedSelectValue).toBe('beta');

  const tab = page.getByRole('tab', { name: 'Aktivitas' });
  await expect(tab).toHaveCSS('transition-duration', '0.15s');
  await tab.hover();
  await expect(tab).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');

  const row = page.getByRole('row').filter({ hasText: 'Baris uji' });
  await expect(row).toHaveCSS('transition-duration', '0.15s');
  await row.hover();
  await expect(row).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.mouse.move(0, 0);
  await page.getByRole('checkbox', { name: 'Pilih baris row-1' }).focus();
  await expect(row).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('settings sections support arrow-key navigation', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const settingsLink = page
    .getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: navigationLabels.settings });
  await settingsLink.click();

  const companyTab = page.getByRole('tab', { name: 'Profil perusahaan' });
  const teamTab = page.getByRole('tab', { name: /Tim & anggota/ });
  await expect(companyTab).toHaveAttribute('aria-selected', 'true');
  await companyTab.focus();
  await page.keyboard.press('ArrowRight');

  await expect(teamTab).toBeFocused();
  await expect(teamTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Undang Pengguna Baru');
});

test('lazy route fallback shows token skeleton and an indeterminate progress bar', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  let releaseModule: (() => void) | undefined;
  let moduleRequested: (() => void) | undefined;
  const moduleGate = new Promise<void>((resolve) => {
    releaseModule = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    moduleRequested = resolve;
  });
  await page.route('**/src/features/projects/ProjectListView.tsx*', async (route) => {
    moduleRequested?.();
    await moduleGate;
    await route.continue();
  });

  await page.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Manajemen Proyek' }).click();
  await requestStarted;

  const progress = page.getByRole('progressbar', { name: 'Memuat data organisasi' });
  await expect(progress).toBeVisible();
  await expect(page.locator('main section[aria-busy="true"]')).toBeVisible();
  await expect(page.locator('main section[aria-busy="true"] [aria-hidden="true"]')).toHaveCount(6);
  await expect(progress).toHaveCSS('height', '2px');
  await expect(progress).toHaveCSS('animation-name', 'none');

  releaseModule?.();
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(progress).toHaveCount(0);
});

test('header shows route breadcrumbs and gains a shadow when content scrolls', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const header = page.getByRole('banner');
  const breadcrumbs = header.getByRole('navigation', { name: 'breadcrumb' });
  const main = page.locator('main[aria-busy="false"]');
  await expect(breadcrumbs).toContainText('Dashboard Eksekutif');
  await expect(header).toHaveAttribute('data-scrolled', 'false');
  await expect(header.getByRole('button', { name: 'Ganti organisasi' })).toBeVisible();
  await expect(header.getByRole('combobox', { name: 'Konteks proyek' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Cari dan jalankan perintah' })).toBeVisible();

  await main.evaluate((element) => {
    const spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = '1200px';
    element.append(spacer);
    element.scrollTop = 20;
  });
  await expect(header).toHaveAttribute('data-scrolled', 'true');

  await page.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Pengaturan & Tim' }).click();
  await expect(breadcrumbs).toContainText('Beranda');
  await expect(breadcrumbs).toContainText('Pengaturan & Tim');
});

test('mobile Menu opens the navigation sheet and preserves bottom navigation actions', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const bottomNavigation = page.getByRole('navigation', { name: 'Navigasi utama' });
  const menuButton = bottomNavigation.getByRole('button', { name: 'Buka menu navigasi' });
  await expect.poll(() => page.getByRole('banner').boundingBox()
    .then((box) => box?.height ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(72);
  await expect(bottomNavigation).toBeVisible();
  await expect(bottomNavigation.getByRole('button', { name: 'Aksi cepat' })).toBeVisible();
  await expect.poll(() => bottomNavigation.getByRole('button', { name: 'Aksi cepat' })
    .evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();
  const mobileSidebar = page.locator('[data-sidebar="sidebar"][data-mobile="true"]');
  await expect(mobileSidebar).toBeVisible();
  await expect(mobileSidebar).toHaveAttribute('id', 'app-sidebar');
  await expect(mobileSidebar.getByRole('combobox', { name: 'Konteks proyek' })).toBeVisible();
  await expect(mobileSidebar.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Pengaturan & Tim' })).toBeVisible();
  await expect.poll(() => mobileSidebar.getByRole('button', { name: 'Tutup navigasi' })
    .evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await mobileSidebar.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Pengaturan & Tim' }).click();
  await expect(page).toHaveURL(`${localOrigin}/settings`);
  await expect(mobileSidebar).toBeHidden();

  await menuButton.click();
  await expect(mobileSidebar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(mobileSidebar).toBeHidden();

  await page.setViewportSize({ width: 639, height: 812 });
  await expect(bottomNavigation).toBeVisible();
  await page.setViewportSize({ width: 640, height: 900 });
  await expect(bottomNavigation).toBeHidden();
  await expect(page.locator('[data-slot="sidebar"][data-collapsible]')).toHaveAttribute('data-collapsible', 'icon');
});

test('mobile quick actions trap focus and restore it when closed', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

  const trigger = page.getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('button', { name: 'Aksi cepat' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Aksi cepat' });
  const controls = dialog.getByRole('button');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toHaveCount(0);
  await expect(controls.first()).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(controls.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(controls.first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('browser back and forward restore route and scroll position', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  const main = page.locator('main[aria-busy="false"]');
  await page.addStyleTag({
    content: 'main[aria-busy="false"] { scroll-behavior: auto !important; } main[aria-busy="false"]::after { content: ""; display: block; height: 1200px; }',
  });
  await main.evaluate((element) => { element.scrollTo({ top: 400, behavior: 'instant' }); });
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(400);

  await page.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Pengaturan & Tim' }).click();
  await expect(page).toHaveURL(`${localOrigin}/settings`);
  const settingsMain = page.locator('main[aria-busy="false"]');
  await expect(settingsMain).toBeVisible();
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);
  await settingsMain.evaluate((element) => { element.scrollTo({ top: 250, behavior: 'instant' }); });
  await expect.poll(() => settingsMain.evaluate((element) => element.scrollTop)).toBe(250);

  await page.goBack();
  await expect(page).toHaveURL(`${localOrigin}/dashboard`);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(400);

  await page.goForward();
  await expect(page).toHaveURL(`${localOrigin}/settings`);
  await expect.poll(() => settingsMain.evaluate((element) => element.scrollTop)).toBe(250);
});

test('legacy home-screen shortcut URL redirects while retaining unrelated query parameters', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/?tab=field_reports&source=shortcut');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(`${localOrigin}/field-reports?source=shortcut`);
});

test('project details have a refreshable project-specific URL', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/projects');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^Buka detail/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`${localOrigin.replaceAll('.', '\\.')}\\/projects\\/[^/]+$`));
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Manajemen Proyek');

  const detailUrl = page.url();
  await page.reload();
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('restricted route shows a 403 page instead of rendering protected content', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/dashboard');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await page.getByTitle('Ganti Peran Pengguna untuk Simulasi RBAC').click();
  await page.getByRole('button', { name: 'Site Manager / Pelaksana' }).click();
  await expect(page.getByRole('navigation', { name: 'Navigasi aplikasi' })
    .getByRole('link', { name: 'Pengaturan & Tim' })).toHaveCount(0);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await expect(page.getByRole('alert')).toContainText('Akses tidak tersedia');
  await expect(page.getByRole('heading', { name: 'Akses tidak tersedia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/dashboard');
  await expect(page.getByRole('heading', { name: 'Pengaturan organisasi' })).toHaveCount(0);
});

test('unknown route shows a 404 page with a home link', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/route-that-does-not-exist');

  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/dashboard');
  await expect(page).toHaveURL(`${localOrigin}/route-that-does-not-exist`);
});

test('403 and 404 route status pages have mobile and desktop light and dark snapshots', async ({ browser }) => {
  for (const status of ['forbidden', 'not-found'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        baseURL: localOrigin,
        colorScheme: 'light',
        locale: 'id-ID',
        reducedMotion: 'reduce',
        timezoneId: 'Asia/Jakarta',
        viewport: { width: 1280, height: 900 },
      });
      try {
        await context.route('**/*', async (route) => {
          if (new URL(route.request().url()).origin === localOrigin) {
            await route.continue();
            return;
          }
          await route.abort();
        });

        const page = await context.newPage();
        await page.addInitScript((initialTheme) => {
          localStorage.setItem('indotek_theme', initialTheme);
        }, theme);

        if (status === 'forbidden') {
          await page.goto('/dashboard');
          await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
          await page.getByTitle('Ganti Peran Pengguna untuk Simulasi RBAC').click();
          await page.getByRole('button', { name: 'Site Manager / Pelaksana' }).click();
          await page.evaluate(() => {
            window.history.pushState({}, '', '/settings');
            window.dispatchEvent(new PopStateEvent('popstate'));
          });
          await expect(page.getByRole('heading', { name: 'Akses tidak tersedia' })).toBeVisible();
        } else {
          await page.goto('/route-that-does-not-exist');
          await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
        }

        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
        });
        for (const viewport of [
          { width: 375, height: 812 },
          { width: 768, height: 1024 },
          { width: 1280, height: 900 },
        ] as const) {
          await page.setViewportSize(viewport);
          await expect(page).toHaveScreenshot(`route-status-${status}-${viewport.width}-${theme}.png`, {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.001,
          });
        }
      } finally {
        await context.close();
      }
    }
  }
});

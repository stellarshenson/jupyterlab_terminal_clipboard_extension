import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });

test('should emit an activation console message', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', message => {
    logs.push(message.text());
  });

  await page.goto();

  expect(
    logs.filter(
      s =>
        s ===
        'JupyterLab extension @stellarshenson/jupyterlab-terminal-clipboard-extension is activated!'
    )
  ).toHaveLength(1);
});

test('should not copy again an OSC 52 the server resends after a reload', async ({
  page,
  context
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const logs: string[] = [];
  page.on('console', message => {
    logs.push(message.text());
  });
  const clipboard = () => page.evaluate(() => navigator.clipboard.readText());

  await page.goto();
  await page.menu.clickMenuItem('File>New>Terminal');
  await page.locator('.jp-Terminal').waitFor();
  // The first output of a connection is taken as resent, so wait for the prompt
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as any
          ).jupyterapp.shell.currentWidget.content._term?.buffer.active
            .getLine(0)
            ?.translateToString(true) ?? ''
      )
    )
    .not.toBe('');
  // 'Zmlyc3Q=' is base64 of 'first'
  const name = await page.evaluate(() => {
    const session = (window as any).jupyterapp.shell.currentWidget.content
      .session;
    session.send({
      type: 'stdin',
      content: ["printf '\\033]52;c;Zmlyc3Q=\\a'\r"]
    });
    return session.name;
  });
  await expect.poll(clipboard).toBe('first');

  await page.evaluate(() => navigator.clipboard.writeText('second'));
  logs.length = 0;
  // The default wait is for the Launcher tab, which a restored layout lacks
  await page.reload({ waitForIsReady: false });
  await page.evaluate(async name => {
    const app = (window as any).jupyterapp;
    await app.restored;
    await app.commands.execute('terminal:open', { name });
  }, name);
  // The resent sequence has been parsed once either line is logged
  await expect
    .poll(() => logs.some(s => /replayed OSC 52|OSC 52: copied/.test(s)))
    .toBe(true);
  expect(await clipboard()).toBe('second');
});

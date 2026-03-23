import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab_terminal_clipboard_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_terminal_clipboard_extension:plugin',
  description: 'Jupyterlab extension to handle copy to clipboard actions in a terminal to allow copy to clipboard of the browser/user',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_terminal_clipboard_extension is activated!');
  }
};

export default plugin;

const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let currentFile = null;

function createWindow() {
  // Always use dark mode background color
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/jonas-icon.png'), // Update icon path
    show: false,
    backgroundColor: '#121421', // Always use dark theme background
    frame: false,
    transparent: false,
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.loadFile('index.html');
  
  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Notify renderer when maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CommandOrControl+N',
          click: () => {
            mainWindow.webContents.send('file-new');
            currentFile = null;
          }
        },
        {
          label: 'Open',
          accelerator: 'CommandOrControl+O',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [
                { name: 'Text Files', extensions: ['txt', 'md', 'js', 'html', 'css', 'json', 'py'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (filePaths && filePaths.length > 0) {
              const content = fs.readFileSync(filePaths[0], 'utf8');
              currentFile = filePaths[0];
              mainWindow.webContents.send('file-opened', { filePath: filePaths[0], content });
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: async () => {
            if (currentFile) {
              mainWindow.webContents.send('save-file', { filePath: currentFile });
            } else {
              const { filePath } = await dialog.showSaveDialog({
                filters: [
                  { name: 'Text Files', extensions: ['txt'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });

              if (filePath) {
                currentFile = filePath;
                mainWindow.webContents.send('save-file', { filePath });
              }
            }
          }
        },
        {
          label: 'Save As',
          accelerator: 'CommandOrControl+Shift+S',
          click: async () => {
            const { filePath } = await dialog.showSaveDialog({
              filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
                ]
              });

              if (filePath) {
                currentFile = filePath;
                mainWindow.webContents.send('save-file', { filePath });
              }
            }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CommandOrControl+,',
          click: () => {
            mainWindow.webContents.send('show-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CommandOrControl+F',
          click: () => {
            mainWindow.webContents.send('show-find');
          }
        },
        {
          label: 'Replace',
          accelerator: 'CommandOrControl+H',
          click: () => {
            mainWindow.webContents.send('show-replace');
          }
        }
      ]
    },
    {
      label: 'Format',
      submenu: [
        {
          label: 'Bullet List',
          accelerator: 'CommandOrControl+Shift+B',
          click: () => {
            mainWindow.webContents.send('apply-bullet-list');
          }
        },
        {
          label: 'Numbered List',
          accelerator: 'CommandOrControl+Shift+N',
          click: () => {
            mainWindow.webContents.send('apply-numbered-list');
          }
        },
        {
          label: 'Checklist',
          accelerator: 'CommandOrControl+Shift+C',
          click: () => {
            mainWindow.webContents.send('apply-checklist');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        // Dark mode toggle removed since we're always in dark mode
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tabs',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CommandOrControl+T',
          click: () => {
            mainWindow.webContents.send('new-tab');
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CommandOrControl+W',
          click: () => {
            mainWindow.webContents.send('close-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Next Tab',
          accelerator: 'CommandOrControl+Tab',
          click: () => {
            mainWindow.webContents.send('next-tab');
          }
        },
        {
          label: 'Previous Tab',
          accelerator: 'CommandOrControl+Shift+Tab',
          click: () => {
            mainWindow.webContents.send('prev-tab');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Jonas Notepad',
          click: () => {
            dialog.showMessageBox({
              title: 'About Jonas Notepad',
              message: 'Jonas Notepad v1.0.0\nAn elegant, modern text editor',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            mainWindow.webContents.send('show-keyboard-shortcuts');
          }
        }
      ]
    }
  ];

  // Add Mac-specific menus
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on('save-content', (event, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf8');
  
  // Update the window title with the current file name
  const fileName = path.basename(filePath);
  mainWindow.setTitle(`Jonas Notepad - ${fileName}`);
});

ipcMain.on('update-title', (event, title) => {
  // Make sure title always has "Jonas Notepad" in it
  if (!title.includes("Jonas Notepad")) {
    title = title.replace("Better Notepad", "Jonas Notepad");
  }
  mainWindow.setTitle(title);
});

// Window control functions
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

// Auto-save settings - dark mode is always on
ipcMain.on('save-settings', (event, settings) => {
  // Ensure dark mode is always true
  settings.darkMode = true;
  store.set('settings', settings);
});

ipcMain.on('get-settings', (event) => {
  // Get the stored settings or default values
  let settings = store.get('settings', {
    darkMode: true, // Always dark mode
    autoSave: true,
    fontSize: 14,
    fontFamily: "'Fira Code', monospace",
    tabSize: 2,
    lineNumbers: true,
    wordWrap: true
  });
  
  // Ensure dark mode is always on regardless of stored value
  settings.darkMode = true;
  
  event.returnValue = settings;
});

// Change app name
app.name = 'Jonas Notepad';

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
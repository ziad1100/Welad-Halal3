import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { startBarcodeListener } from './barcode-listener';
import { printReceiptText, openCashDrawer } from '../src/services/printer.service';
import { pushPending } from '../src/lib/sync';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3001/api';

function createWindow(kind: 'cashier' | 'display') {
  const win = new BrowserWindow({
    width: kind === 'cashier' ? 1600 : 900,
    height: 900,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL(kind === 'cashier' ? `${WEB_URL}/cashier` : `${WEB_URL}/cashier`);
  return win;
}

app.whenReady().then(() => {
  createWindow('cashier');
  // HID scanner -> forward scans to cashier renderer
  startBarcodeListener((code) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('barcode:scan', code);
  });
  // background sync of offline queue
  setInterval(() => pushPending(API_URL).catch(() => undefined), 30_000);

  ipcMain.handle('print:receipt', (_e, text: string) => printReceiptText(text));
  ipcMain.handle('drawer:open', () => openCashDrawer());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow('cashier');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

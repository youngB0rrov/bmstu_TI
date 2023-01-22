import { promises as fsp, existsSync } from 'fs';
import { join } from 'path';
import { __dirname } from './globals.js';

const dirPath = join(__dirname, 'temp');
const filePath = join(dirPath, 'task-manager.json');

const readData = async () => {
  if (!existsSync(filePath)) {
    if (!existsSync(dirPath)) {
      await fsp.mkdir(dirPath);
    }

    const file = await fsp.open(filePath, 'w');
    await file.write('[]');
    await file.close();
    return [];
  }

  const data = await fsp.readFile(filePath, { encoding: 'utf-8'});
  return JSON.parse(data);
};

const writeData = async (data) => {
  if (data === undefined) return;

  if (!existsSync(dirPath)) {
    await fsp.mkdir(dirPath);
  }

  await fsp.writeFile(filePath, JSON.stringify(data), 'utf-8');
};

export {
  readData,
  writeData
};

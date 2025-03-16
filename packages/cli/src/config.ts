import path from 'path';
import os from 'os';

export const CONFIG_DIR = path.join(os.homedir(), '.openkit');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json'); 
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const sourceIcon = path.join(projectRoot, 'public', 'icons', 'app-icon-master.svg');
const outputDir = path.join(projectRoot, 'public', 'icons');

const iconJobs = [
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-maskable-192.png', size: 192 },
    { file: 'icon-maskable-512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'favicon-32.png', size: 32 },
    { file: 'favicon-16.png', size: 16 }
];

const ensureSourceExists = async () => {
    try {
        await fs.access(sourceIcon);
    } catch {
        throw new Error(`Source SVG not found at: ${sourceIcon}`);
    }
};

const renderIcon = async (size, outputFile) => {
    await sharp(sourceIcon, { density: 1200 })
        .resize(size, size, {
            fit: 'cover',
            position: 'centre'
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outputFile);
};

const main = async () => {
    await ensureSourceExists();
    await fs.mkdir(outputDir, { recursive: true });

    await Promise.all(
        iconJobs.map(async ({ file, size }) => {
            const target = path.join(outputDir, file);
            await renderIcon(size, target);
            process.stdout.write(`Generated ${file}\n`);
        })
    );
};

main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
});

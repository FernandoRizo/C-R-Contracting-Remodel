import sharp from "sharp";
import { readdir, mkdir, writeFile } from "fs/promises";
import path from "path";

const inputRoot = path.join(process.cwd(), "public", "evidencias");
const outputRoot = path.join(process.cwd(), "public", "evidencias-webp");

const validExtensions = [".jpg", ".jpeg", ".png", ".jfif"];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "n")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await walk(inputRoot);
const imageFiles = files.filter((file) =>
  validExtensions.includes(path.extname(file).toLowerCase())
);

const imageMap = {};

for (const file of imageFiles) {
  const relativePath = path.relative(inputRoot, file);
  const pathParts = relativePath.split(path.sep);

  const fileName = pathParts.pop();
  const extension = path.extname(fileName);
  const nameWithoutExtension = path.basename(fileName, extension);

  const cleanFolders = pathParts.map(slugify);
  const cleanFileName = `${slugify(nameWithoutExtension)}.webp`;

  const outputDirectory = path.join(outputRoot, ...cleanFolders);
  const outputFile = path.join(outputDirectory, cleanFileName);

  await mkdir(outputDirectory, { recursive: true });

  await sharp(file)
    .rotate()
    .resize({
      width: 1600,
      withoutEnlargement: true,
    })
    .webp({
      quality: 78,
    })
    .toFile(outputFile);

  const originalPublicPath =
    "/evidencias/" + relativePath.split(path.sep).join("/");

  const newPublicPath =
    "/evidencias-webp/" + [...cleanFolders, cleanFileName].join("/");

  imageMap[originalPublicPath] = newPublicPath;

  console.log(`${originalPublicPath} -> ${newPublicPath}`);
}

await writeFile(
  path.join(process.cwd(), "image-map.json"),
  JSON.stringify(imageMap, null, 2),
  "utf-8"
);

console.log("\nConversión terminada.");
console.log("Revisa image-map.json para actualizar tus rutas en index.astro.");
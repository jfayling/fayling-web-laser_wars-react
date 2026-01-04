
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import mime from "mime-types";
import minimist from "minimist";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = minimist(process.argv.slice(2));

const { profile, bucket, path: s3Path } = args;

if (!profile || !bucket || !s3Path) {
    console.error("Usage: node scripts/deploy.js --profile <profile> --bucket <bucket> --path <path>");
    process.exit(1);
}

// Ensure s3Path starts and ends with /
const basePath = s3Path.startsWith("/") ? s3Path : `/${s3Path}`;
const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;

console.log(`Using credentials from profile: ${profile}`);
console.log(`Target Bucket: ${bucket}`);
console.log(`Target Path: ${normalizedBasePath}`);

const s3Client = new S3Client({
    region: "us-east-1", // Defaulting to us-east-1, could be an arg
    credentials: fromIni({ profile }),
});

async function buildApp() {
    console.log("Building application...");
    // Ensure the base path ends with a slash for Vite
    try {
        const { stdout, stderr } = await execAsync(`npm run build -- --base=${normalizedBasePath}`);
        console.log(stdout);
        if (stderr) console.error(stderr);
        console.log("Build complete.");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

async function uploadDirectory(dir) {
    const files = await getFiles(dir);

    console.log(`Found ${files.length} files to upload.`);

    for (const file of files) {
        const relativePath = path.relative(dir, file);
        const s3Key = path.join(s3Path, relativePath).replace(/\\/g, "/"); // Ensure forward slashes
        // Remove leading slash from s3Key if present (S3 keys shouldn't strict start with / usually, but user path input might imply structure)
        // If s3Path was "playground/foo", key should be "playground/foo/index.html"
        // If s3Path was "/playground/foo", key might be "/playground/foo/index.html" which is valid but usually keys don't start with /

        // Let's sanitize s3Key: remove leading /
        const finalKey = s3Key.startsWith("/") ? s3Key.substring(1) : s3Key;

        const fileContent = fs.createReadStream(file);
        const contentType = mime.lookup(file) || "application/octet-stream";

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucket,
                Key: finalKey,
                Body: fileContent,
                ContentType: contentType,
            },
        });

        upload.on("httpUploadProgress", (progress) => {
            // Optional: verbose logging
        });

        try {
            await upload.done();
            console.log(`Uploaded: ${finalKey}`);
        } catch (error) {
            console.error(`Failed to upload ${finalKey}:`, error);
            process.exit(1);
        }
    }
    console.log("Deployment complete.");
}

async function getFiles(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return files.flat();
}

async function main() {
    await buildApp();
    const distDir = path.resolve(__dirname, "../dist");

    if (!fs.existsSync(distDir)) {
        console.error("Dist directory not found after build.");
        process.exit(1);
    }

    await uploadDirectory(distDir);
}

main().catch(console.error);

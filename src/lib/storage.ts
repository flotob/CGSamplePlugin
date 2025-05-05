import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

// Configuration from environment variables
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const region = process.env.STORAGE_REGION;
const bucketName = process.env.STORAGE_BUCKET_NAME;
const endpointUrl = process.env.STORAGE_ENDPOINT_URL;
const publicUrlPrefix = process.env.STORAGE_PUBLIC_URL_PREFIX;

// Basic validation
if (!accessKeyId || !secretAccessKey || !region || !bucketName || !endpointUrl) {
  console.error('Missing required storage environment variables.');
  // Optionally throw an error here to prevent initialization if critical
  // throw new Error('Storage service is not configured.');
}

// Initialize S3 Client
// Note: Force path style is often needed for non-AWS S3 endpoints like MinIO
const s3Client = new S3Client({
  region: region,
  endpoint: endpointUrl,
  forcePathStyle: true, // Important for MinIO/Railway etc.
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

/**
 * Downloads an image from a source URL and uploads it to the configured S3 bucket.
 * 
 * @param sourceUrl The temporary URL of the image to download (e.g., from OpenAI).
 * @param pathPrefix A prefix for the object key (e.g., 'communityId/wizardId/stepId').
 * @returns The persistent public URL of the uploaded image.
 * @throws If download or upload fails.
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  pathPrefix: string
): Promise<string> {
  if (!publicUrlPrefix) {
      throw new Error('STORAGE_PUBLIC_URL_PREFIX environment variable is not set.');
  }

  try {
    // 1. Fetch the image data from the source URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from source: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'image/png'; // Default to png
    const imageBuffer = await response.arrayBuffer();

    // 2. Generate a unique destination key
    const fileExtension = contentType.split('/')[1] || 'png';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const destinationKey = `${pathPrefix.replace(/\/$/, '')}/${uniqueFilename}`; // Ensure no trailing slash in prefix

    console.log(`Uploading image to: ${bucketName}/${destinationKey}`);

    // 3. Prepare the PutObject command
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: destinationKey,
      Body: Buffer.from(imageBuffer), // Pass buffer
      ContentType: contentType,
      ACL: 'public-read', // Make object publicly readable
    });

    // 4. Upload to S3-compatible storage
    await s3Client.send(putCommand);

    // 5. Construct and return the public URL
    // Ensure no double slashes
    const publicBase = publicUrlPrefix.endsWith('/') ? publicUrlPrefix : `${publicUrlPrefix}/`;
    const persistentUrl = `${publicBase}${destinationKey}`;

    console.log(`Successfully uploaded image. Public URL: ${persistentUrl}`);
    return persistentUrl;

  } catch (error) {
    console.error('Error in uploadImageFromUrl:', error);
    if (error instanceof Error) {
        throw new Error(`Image upload failed: ${error.message}`);
    } else {
        throw new Error('An unknown error occurred during image upload.');
    }
  }
} 
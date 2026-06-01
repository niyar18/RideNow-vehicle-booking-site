import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isPlaceholder = (val?: string) => {
  return !val || val === "" || val.includes("add your");
};

const uploadOnCloudinary = async (file: Blob): Promise<string | null> => {
  if (!file) {
    return null;
  }

  // ✅ Fallback to local storage if Cloudinary keys are placeholders or not set
  if (
    isPlaceholder(process.env.CLOUDINARY_CLOUD_NAME) ||
    isPlaceholder(process.env.CLOUDINARY_API_KEY) ||
    isPlaceholder(process.env.CLOUDINARY_API_SECRET)
  ) {
    try {
      console.log("Using local storage fallback for uploads (Cloudinary keys are placeholders)...");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate a unique filename using timestamp and random string
      const fileExt = file.type ? `.${file.type.split("/")[1]}` : ".jpg";
      const fileName = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      return `/uploads/${fileName}`;
    } catch (localError) {
      console.error("Local upload fallback failed:", localError);
      return null;
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result?.secure_url ?? null);
          }
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return null;
  }
};

export default uploadOnCloudinary;
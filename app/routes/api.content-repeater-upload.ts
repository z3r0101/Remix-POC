import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import fs from "fs";
import path from "path";

export const loader = async () => {
  return new Response("Method not allowed", { status: 405 });
};

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxFileSize: 10_000_000, // 10 MB
  });

  const formData = await unstable_parseMultipartFormData(request, uploadHandler);

  const savePathTemp = formData.get("save_path_temp") as string | null;
  const tempFilename = formData.get("temp_filename") as string | null;
  const originalFilename = formData.get("filename") as string | null;
  const tempFilenamePrev = formData.get("temp_filename_prev") as string | null; // Previous file with full path

  if (!savePathTemp || !tempFilename || !originalFilename) {
    return new Response("Invalid request: Missing required form data", { status: 400 });
  }

  const tempDirectory = path.resolve(`./public${savePathTemp}`);
  const tempFilePath = path.join(tempDirectory, tempFilename);

  console.log("tempDirectory:", tempDirectory);
  console.log("tempFilePath:", tempFilePath);

  try {
    // Check and delete the previous temporary file if it exists
    if (tempFilenamePrev) {
      const prevFilePath = path.resolve(`./public${tempFilenamePrev}`); // Resolve full path
      if (fs.existsSync(prevFilePath)) {
        fs.unlinkSync(prevFilePath);
        console.log(`Deleted previous temp file: ${prevFilePath}`);
      } else {
        console.warn(`Previous temp file not found: ${prevFilePath}`);
      }
    }

    // Ensure the directory exists
    fs.mkdirSync(tempDirectory, { recursive: true });

    const uploadedFile = formData.get("file") as File | null;

    if (!uploadedFile) {
      return new Response("No file uploaded", { status: 400 });
    }

    // Write the new file
    const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    return new Response(
      JSON.stringify({
        name: `${savePathTemp}/${tempFilename}`,
        content_type: uploadedFile.type,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("File upload error:", error);
    return new Response("Error saving file", { status: 500 });
  }
};

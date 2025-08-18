import { NextRequest } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { adminStorage, db } from "@/lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";
import {
  getCorrelationIdFromHeaders,
  logInfo,
  logWarn,
  logError,
  errorMeta,
} from "@/lib/log";

// Get all profile images for a user
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationIdFromHeaders(request.headers);
  return withFirebaseAuth(async (user: AuthenticatedUser) => {
    try {
      logInfo("images.GET.start", { correlationId, userId: user.id });
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId") || user.id;

      // Validate that the user is accessing their own images or is admin
      if (user.id !== userId && user.role !== "admin") {
        logWarn("images.GET.unauthorized", {
          correlationId,
          userId: user.id,
          target: userId,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: Cannot access images for another user",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // List files in the user's profile images directory
      const bucket = adminStorage.bucket();
      const [files] = await bucket.getFiles({
        prefix: `users/${userId}/profile-images/`,
      });

      // Get public URLs and metadata for all files
      const images = await Promise.all(
        files
          .filter((file) => !file.name.endsWith("/")) // Exclude directories
          .map(async (file) => {
            const [metadata] = await file.getMetadata();
            return {
              url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
              storageId: file.name,
              fileName: metadata.name,
              size: metadata.size,
              uploadedAt: metadata.metadata?.uploadedAt || metadata.timeCreated,
              contentType: metadata.contentType,
            };
          })
      );

      logInfo("images.GET.success", {
        correlationId,
        userId,
        count: images.length,
      });
      return new Response(
        JSON.stringify({
          success: true,
          images: images,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      logError("images.GET.error", { correlationId, ...errorMeta(error) });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to get profile images",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  })(request);
}

// Upload a profile image
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationIdFromHeaders(request.headers);
  return withFirebaseAuth(async (user: AuthenticatedUser) => {
    try {
      // For multipart form data, we need to parse it manually
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        // Handle multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const userId = formData.get("userId") as string | null;

        if (!file) {
          logWarn("images.POST.multipart.no_file", {
            correlationId,
            userId: user.id,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: "No file provided",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Validate that the user is uploading their own image
        if (userId && user.id !== userId) {
          logWarn("images.POST.multipart.unauthorized", {
            correlationId,
            userId: user.id,
            target: userId,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: "Unauthorized: Cannot upload image for another user",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate a unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split(".").pop() || "jpg";
        const fileName = `${timestamp}_${uuidv4()}.${fileExtension}`;
        const path = `users/${user.id}/profile-images/${fileName}`;

        // Upload to Firebase Storage
        const bucket = adminStorage.bucket();
        const fileUpload = bucket.file(path);

        await fileUpload.save(buffer, {
          metadata: {
            contentType: file.type,
            metadata: {
              uploadedBy: user.id,
              uploadedAt: new Date().toISOString(),
              originalName: file.name,
            },
          },
        });

        // Make the file publicly readable
        await fileUpload.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

        // Also save image metadata to Firestore
        await db
          .collection("users")
          .doc(user.id)
          .collection("images")
          .doc(fileName)
          .set({
            url: publicUrl,
            storageId: path,
            fileName: fileName,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.id,
          });

        logInfo("images.POST.multipart.success", {
          correlationId,
          userId: user.id,
          storageId: path,
        });
        return new Response(
          JSON.stringify({
            success: true,
            url: publicUrl,
            storageId: path,
            fileName: fileName,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        // Handle JSON data
        const { userId, storageId, fileName, contentType, size } =
          await request.json();

        // Validate that the user is uploading their own image
        if (userId && user.id !== userId) {
          logWarn("images.POST.json.unauthorized", {
            correlationId,
            userId: user.id,
            target: userId,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: "Unauthorized: Cannot upload image for another user",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Save image metadata to Firestore
        const imageId = uuidv4();
        const imageUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${storageId}`;

        await db
          .collection("users")
          .doc(user.id)
          .collection("images")
          .doc(imageId)
          .set({
            url: imageUrl,
            storageId: storageId,
            fileName: fileName,
            originalName: fileName,
            contentType: contentType,
            size: size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.id,
          });

        logInfo("images.POST.json.success", {
          correlationId,
          userId: user.id,
          storageId,
        });
        return new Response(
          JSON.stringify({
            success: true,
            url: imageUrl,
            storageId: storageId,
            imageId: imageId,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      logError("images.POST.error", { correlationId, ...errorMeta(error) });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to upload profile image",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  })(request);
}

// Delete a profile image
export async function DELETE(request: NextRequest) {
  const correlationId = getCorrelationIdFromHeaders(request.headers);
  return withFirebaseAuth(async (user: AuthenticatedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const storageId = searchParams.get("storageId");

      if (!storageId) {
        logWarn("images.DELETE.no_storage_id", {
          correlationId,
          userId: user.id,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "No storage ID provided",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate that the user owns this image
      if (!storageId.startsWith(`users/${user.id}/`)) {
        logWarn("images.DELETE.unauthorized", {
          correlationId,
          userId: user.id,
          storageId,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: Cannot delete image",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Delete the file from Firebase Storage
      const bucket = adminStorage.bucket();
      const file = bucket.file(storageId);
      await file.delete();

      // Also delete the metadata from Firestore
      const fileName = storageId.split("/").pop() || "";
      await db
        .collection("users")
        .doc(user.id)
        .collection("images")
        .doc(fileName)
        .delete();

      logInfo("images.DELETE.success", {
        correlationId,
        userId: user.id,
        storageId,
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Image deleted successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      logError("images.DELETE.error", {
        correlationId,
        ...errorMeta(error),
        code: error?.code,
      });
      if (error.code === 404) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Image not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete profile image",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  })(request);
}
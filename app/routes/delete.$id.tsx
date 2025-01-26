import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, Form } from "@remix-run/react";
import { db } from "../database/db.server";
import { Content } from "../database/schema";
import { eq } from "drizzle-orm";
import { ContentRepeaterUploadFile } from "../components/ContentRepeater/UploadFile";

// Loader to fetch the specific content item
export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  // Validate ID
  if (!id || isNaN(Number(id))) {
    throw new Response("Invalid ID", { status: 400 });
  }

  const content = await db
    .select()
    .from(Content)
    .where(eq(Content.id, Number(id)))
    .then((rows) => rows[0]);

  if (!content) {
    throw new Response("Not Found", { status: 404 });
  }

  return json(content);
};

// Action to delete the content item
export const action: ActionFunction = async ({ params }) => {
  const { id } = params;

  // Validate ID
  if (!id || isNaN(Number(id))) {
    throw new Response("Invalid ID", { status: 400 });
  }

  try {
    // Fetch content to check for attachments
    const content = await db
      .select()
      .from(Content)
      .where(eq(Content.id, Number(id)));

    if (content.length > 0) {
      const contentItem = content[0];

      // Delete database record
      await db.delete(Content).where(eq(Content.id, Number(id)));

      // Delete attachments if they exist
      if (contentItem.attachments) {
        ContentRepeaterUploadFile.delete(contentItem.attachments);
      }
    } else {
      throw new Response("Content not found for deletion.", { status: 404 });
    }
  } catch (error) {
    console.error("Error deleting content:", error);
    throw new Response("Failed to delete content", { status: 500 });
  }

  return redirect("/");
};

export default function Delete() {
  const content = useLoaderData();
  const navigate = useNavigate();

  return (
    <>
      <main className="dts-main-container">
        <div className="mg-container">
          <h1>Delete Content</h1>
          <p>Are you sure you want to delete "{content.title}"?</p>

          <Form method="post">
            <button type="submit">Confirm Delete</button>
            <button type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </Form>
        </div>
      </main>
    </>
  );
}
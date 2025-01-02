import React, { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { db } from "../database/db.server"; // Drizzle connection
import { Content } from "../database/schema"; // Drizzle schema for Content
import { z } from "zod"; // Validation library
import { ZodError } from "zod";
import { eq } from "drizzle-orm"; // For filtering
import { ContentRepeater } from "../components/ContentRepeater";
import { ContentRepeaterUploadFile } from "../components/ContentRepeaterUploadFile";

const BASE_PATH = process?.env.BASE_PATH || "";

// Validation schema using Zod
const contentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  copy: z.string().min(1, "Content is required"),
  attachments: z.string().optional(), // Allows empty strings or undefined
});

export async function loader({ params }) {
  const contentId = parseInt(params.id, 10);

  if (isNaN(contentId)) {
    throw new Response("Invalid content ID", { status: 400 });
  }

  // Fetch the content by ID
  const content = await db
    .select()
    .from(Content)
    .where(eq(Content.id, contentId))
    .then((results) => results[0]);

  if (!content) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ content });
}

export async function action({ request, params }) {
  const contentId = parseInt(params.id, 10);

  if (isNaN(contentId)) {
    throw new Response("Invalid content ID", { status: 400 });
  }

  const formData = await request.formData();

  const updatedContent = {
    title: formData.get("title")?.toString() || "",
    copy: formData.get("copy")?.toString() || "",
    polygonmapper: formData.get("polygonmapper")?.toString() || ""
  };

  // Validate input data using Zod
  try {
    contentSchema.parse(updatedContent);

    // Update the content in the database
    await db
      .update(Content)
      .set(updatedContent)
      .where(eq(Content.id, contentId));

      let attachmentsData = formData.get("attachments")?.toString();

      console.log('attachmentsData 1st:')
      console.log(JSON.parse(attachmentsData));

      if (attachmentsData) {
        const save_path = `/uploads/content/${contentId}`;
        const save_path_temp = `/uploads/temp`;
        attachmentsData = ContentRepeaterUploadFile.save(attachmentsData, save_path_temp, save_path);

        console.log('attachmentsData 2nd:')
        console.log(attachmentsData);
  
        await db
        .update(Content)
        .set({attachments: attachmentsData || "[]"})
        .where(eq(Content.id, contentId));
      }

    // Redirect to the index page or success page
    return redirect("/");
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ errors: error.flatten() }, { status: 400 });
    }

    throw error; // Re-throw unexpected errors
  }
}

export default function EditContent() {
  const { content } = useLoaderData();
  const actionData = useActionData();

  // Parse initial JSON data for attachments
  const initialAttachments = (() => {
    try {
      return JSON.parse(content.attachments) || [];
    } catch {
      return []; // Default to an empty array if parsing fails
    }
  })();
  const [attachments, setAttachments] = useState(initialAttachments);
  const handleRepeaterChange = (items) => {
    setAttachments(items); // Update the state when ContentRepeater changes
  };

  return (
    <>
      <main className="dts-main-container">
        <div className="mg-container">
          <h1>Edit Content</h1>
          <Form method="post" className="dts-form">
            <div className="dts-form__body">
              <fieldset className="dts-form__section">
                {/* Title Field */}
                <div className="dts-form-component mg-grid__col--offset-1">
                  <label>
                    <div className="dts-form-component__label">
                      <span>
                        <abbr title="mandatory">*</abbr>Title
                      </span>
                    </div>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      defaultValue={content.title}
                      required
                      aria-invalid={actionData?.errors?.fieldErrors?.title ? "true" : undefined}
                      aria-describedby="descriptionTextId"
                    />
                  </label>
                  {actionData?.errors?.fieldErrors?.title && (
                    <div className="dts-form-component__hint">
                      <div id="descriptionTextId">{actionData.errors.fieldErrors.title}</div>
                    </div>
                  )}
                </div>

                {/* Copy Field */}
                <div className="dts-form-component mg-grid__col--offset-1">
                  <label>
                    <div className="dts-form-component__label">
                      <span>
                        <abbr title="mandatory">*</abbr>Copy
                      </span>
                    </div>
                    <input
                      type="text"
                      id="copy"
                      name="copy"
                      defaultValue={content.copy}
                      required
                      aria-invalid={actionData?.errors?.fieldErrors?.copy ? "true" : undefined}
                      aria-describedby="descriptionTextId2"
                    />
                  </label>
                  {actionData?.errors?.fieldErrors?.copy && (
                    <div className="dts-form-component__hint">
                      <div id="descriptionTextId2">{actionData.errors.fieldErrors.copy}</div>
                    </div>
                  )}
                </div>

                {/* Attachments Field */}
                <div className="dts-form-component mg-grid__col--offset-1">
                  <label>
                    <div className="dts-form-component__label">
                      <span>Attachment</span>
                    </div>
                    <ContentRepeater
                      id="attachments"
                      dnd_order={true}
                      base_path={BASE_PATH}
                      save_path_temp="/uploads/temp"
                      table_columns={[
                        { type: "dialog_field", dialog_field_id: "title", caption: "Title" },
                        { type: "dialog_field", dialog_field_id: "type", caption: "Type" },
                        {
                          type: "custom",
                          caption: "File/URL",
                          render: (item) => {
                            // Get the file name or fallback to URL
                            const fullFileName = item.file?.name ? item.file.name.split('/').pop() : item.url;
                        
                            // Truncate long file names while preserving the file extension
                            const maxLength = 30; // Adjust to fit your design
                            let truncatedFileName = fullFileName;
                        
                            if (fullFileName && fullFileName.length > maxLength) {
                              const extension = fullFileName.includes('.')
                                ? fullFileName.substring(fullFileName.lastIndexOf('.'))
                                : '';
                              const baseName = fullFileName.substring(0, maxLength - extension.length - 3); // Reserve space for "..."
                              truncatedFileName = `${baseName}...${extension}`;
                            }
                        
                            return truncatedFileName || "N/A"; // Return the truncated name or fallback to "N/A"
                          },
                        },                        
                        { type: "action", caption: "Action" },
                      ]}
                      dialog_fields={[
                        { id: "title", caption: "Title", type: "input" },
                        {
                          id: "type",
                          caption: "Type",
                          type: "select",
                          options: ["Document", "Media", "Other"],
                          onChange: (e) => {
                            const value = e.target.value;
                            const otherField = document.getElementById("attachments_other"); // Assuming ID is "attachments_other"

                            if (otherField) {
                              const parentDiv = otherField.closest(".dts-form-component"); // Closest parent with the specific class
                              if (value === "Other") {
                                parentDiv?.style.setProperty("display", "block");
                              } else {
                                parentDiv?.style.setProperty("display", "none");
                              }
                            }
                          },
                        },
                        { id: "other", caption: "Other", type: "input", placeholder: "Enter value", show: false },
                        {
                          id: "file_option",
                          caption: "Option",
                          type: "option",
                          options: ["File", "Link"],
                          onChange: (e) => {
                            const value = e.target.value;
                            const fileField = document.getElementById("attachments_file");
                            const urlField = document.getElementById("attachments_url");

                            if (fileField && urlField) {
                              const fileDiv = fileField.closest(".dts-form-component");
                              const urlDiv = urlField.closest(".dts-form-component");

                              if (value === "File") {
                                fileDiv?.style.setProperty("display", "block");
                                urlDiv?.style.setProperty("display", "none");
                              } else if (value === "Link") {
                                fileDiv?.style.setProperty("display", "none");
                                urlDiv?.style.setProperty("display", "block");
                              }
                            }
                          },
                        },
                        { id: "file", caption: "File Upload", type: "file" },
                        { id: "url", caption: "Link", type: "input", placeholder: "Enter URL" },
                        /*{ id: "comment", caption: "Comment", type: "textarea", placeholder: "" },*/
                      ]}
                      data={(() => {
                        try {
                          return JSON.parse(content.attachments) || [];
                        } catch {
                          return []; // Default to an empty array if parsing fails
                        }
                      })()}
                      onChange={(items) => {
                        try {
                          const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
                          console.log("Updated Items:", parsedItems);
                          // Save or process `parsedItems` here, e.g., updating state or making an API call
                        } catch {
                          console.error("Failed to process items.");
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Attachments Field */}
                <div className="dts-form-component mg-grid__col--offset-1">
                  <label>
                    <div className="dts-form-component__label">
                      <span>Polygon Mapper</span>
                    </div>
                    <ContentRepeater
                      id="polygonmapper"
                      dnd_order={true}
                      base_path={BASE_PATH}
                      table_columns={[
                        { type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "50%" },                        
                        { type: "action", caption: "Action", width: "50%" },
                      ]}
                      dialog_fields={[
                        { id: "title", caption: "Title", type: "input", required: true },
                        { id: "map_coords", caption: "Map Coords", type: "mapper", placeholder: "", required: true }
                      ]}
                      data={(() => {
                        try {
                          return JSON.parse(content.polygonmapper) || [];
                        } catch {
                          return []; // Default to an empty array if parsing fails
                        }
                      })()}
                      onChange={(items) => {
                        try {
                          const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
                          console.log("Updated Items:", parsedItems);
                          // Save or process `parsedItems` here, e.g., updating state or making an API call
                        } catch {
                          console.error("Failed to process items.");
                        }
                      }}
                    />
                  </label>
                </div>

              </fieldset>

              {/* Action Buttons */}
              <div className="dts-form__actions">
                <button type="submit" className="mg-button mg-button-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="mg-button mg-button-outline"
                  onClick={() => window.history.back()}
                >
                  Discard
                </button>
              </div>
            </div>
          </Form>
        </div>
      </main>
    </>
  );
}
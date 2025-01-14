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

export async function action({ request }) {
  const formData = await request.formData();

  const newContent = {
    title: formData.get("title"),
    copy: formData.get("copy"),
    attachments: formData.get("attachments"),
    polygonmapper: formData.get("polygonmapper")
  };

  // Validate input data using Zod
  try {
    contentSchema.parse(newContent);

    // Insert into the database and get the new ID
    const [newRecord] = await db.insert(Content).values(newContent).returning({ id: Content.id });

    const newId = newRecord?.id;
    if (!newId) {
      throw new Error("Failed to retrieve the new ID after insertion.");
    }

    let attachmentsData = formData.get("attachments")?.toString();
    if (attachmentsData) {
      const save_path = `/uploads/content/${newId}`;
      const save_path_temp = `/uploads/temp`;
      attachmentsData = ContentRepeaterUploadFile.save(attachmentsData, save_path_temp, save_path);

      const updatedContent = {
        attachments: attachmentsData || "[]", // Default to an empty array string
      };

      await db
      .update(Content)
      .set(updatedContent)
      .where(eq(Content.id, newId));
    }

    // Redirect to a page using the new ID
    return redirect(`/`);
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ errors: error.flatten() }, { status: 400 });
    }

    throw error; // Re-throw unexpected errors
  }
}


export default function AddContent() {
  const actionData = useActionData();

  return (
    <>
      <main className="dts-main-container">
        <div className="mg-container">
          <h1>Add New Content</h1>
          <Form method="post" className="dts-form">
            <div className="dts-form__body">
                <fieldset className="dts-form__section">
                    <div className="dts-form-component mg-grid__col--offset-1">
                        <label>
                            <div className="dts-form-component__label">
                            <span><abbr title="mandatory">*</abbr>Title</span>
                            </div>
                            <input type="text" id="title" name="title" placeholder="Input type to be defined" required="" aria-invalid={actionData?.errors?.fieldErrors?.title ? "true" : undefined} aria-describedby="descriptionTextId" />
                        </label>
                        {actionData?.errors?.fieldErrors?.title && (
                        <div className="dts-form-component__hint">
                        <div id="descriptionTextId">{actionData.errors.fieldErrors.title}</div>
                        </div>
                        )}
                    </div>


                    <div className="dts-form-component mg-grid__col--offset-1">
                        <label>
                            <div className="dts-form-component__label">
                            <span><abbr title="mandatory">*</abbr>Copy</span>
                            </div>
                            <input type="text" id="copy" name="copy" placeholder="Input type to be defined" required="" aria-invalid={actionData?.errors?.fieldErrors?.title ? "true" : undefined} aria-describedby="descriptionTextId2" />
                        </label>
                        {actionData?.errors?.fieldErrors?.copy && (
                        <div className="dts-form-component__hint">
                        <div id="descriptionTextId2">{actionData.errors.fieldErrors.copy}</div>
                        </div>
                        )}
                    </div>

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
                            { id: "file", caption: "File Upload", type: "file", accept: "jpg|jpeg|gif|png|webp", note: "Image file only", download: false  }, 
                            { id: "url", caption: "Link", type: "input", placeholder: "Enter URL" },
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
                      <span>Mapper</span>
                    </div>
                    <ContentRepeater
                      id="polygonmapper"
                      base_path={BASE_PATH}
                      table_columns={[
                        { type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "50%" },                        
                        { type: "action", caption: "Action", width: "50%" },
                      ]}
                      dialog_fields={[
                        { id: "title", caption: "Title", type: "input" },
                        { id: "map_coords", caption: "Map Coords", type: "mapper", placeholder: "" }
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

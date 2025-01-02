import React, { useRef, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { db } from "../database/db.server"; // Import Drizzle connection
import { Content } from "../database/schema"; // Import Content schema
import { desc } from "drizzle-orm"; // Import desc utility for ordering

const BASE_PATH = process?.env.BASE_PATH || "";

export default function Index() {
  const { contents } = useLoaderData();
  const dialogRef = useRef(null);
  const [selectedContent, setSelectedContent] = useState(null); // Use state for better reactivity

  const handleDeleteClick = (event, content) => {
    event.preventDefault();
    setSelectedContent(content); // Set the selected content
    dialogRef.current.showModal();
  };

  const handleCloseDialog = () => {
    if (dialogRef.current) dialogRef.current.close();
    setSelectedContent(null); // Clear the selected content
  };

  const handleConfirmDelete = async () => {
    if (!selectedContent) return;

    try {
      const response = await fetch(`${BASE_PATH}/delete/${selectedContent.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      // Refresh the page or update the UI after successful deletion
      window.location.reload();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("An error occurred while trying to delete the content.");
    } finally {
      // Ensure the dialog closes even if there's an error
      handleCloseDialog();
    }
  };

  return (
    <>
      <main className="dts-main-container">
        <div className="mg-container">
          <table className="dts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {contents.length > 0 ? (
                contents.map((content) => (
                  <tr key={content.id}>
                    <td>{content.id}</td>
                    <td>{content.title}</td>
                    <td>
                      <a className="dts-lin" href={`${BASE_PATH}/edit/${content.id}`}>
                        Edit
                      </a>{" "}
                      |{" "}
                      <a
                        className="dts-lin"
                        href="#"
                        onClick={(e) => handleDeleteClick(e, content)}
                      >
                        Delete
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center" }}>
                    No content available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="dts-chart-card">
            <button
              type="button"
              className="mg-button mg-button-primary"
              onClick={() => (window.location.href = `${BASE_PATH}/add`)}
            >
              Add
            </button>
          </div>
        </div>

        {/* Dialog */}
        <dialog className="dts-dialog" ref={dialogRef}>
          <div className="dts-dialog__content">
            <div>
              <div className="dts-form__intro">
                <h2 className="dts-heading-2">Delete Confirmation</h2>
              </div>
              <div className="dts-form__body">
                Are you sure you want to delete "{selectedContent?.title}"?
              </div>
              <div className="dts-form__actions">
                <a
                  href="#"
                  className="mg-button mg-button-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirmDelete();
                  }}
                >
                  Confirm Delete
                </a>
                <a
                  href="#"
                  className="mg-button mg-button-outline"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCloseDialog();
                  }}
                >
                  Cancel
                </a>
              </div>
            </div>
          </div>
        </dialog>
      </main>
    </>
  );
}

export async function loader() {
  // Fetch all content from the database and order by created_at in descending order
  const contents = await db
    .select()
    .from(Content)
    .orderBy(desc(Content.created_at)); // Use `desc` utility for ordering

  return { contents };
}

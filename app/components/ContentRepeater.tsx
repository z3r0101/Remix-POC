import React, { useState, useRef, useEffect } from "react";

interface TableColumn {
  type: "dialog_field" | "action";
  dialog_field_id?: string;
  caption: string;
  render?: (item: any) => React.ReactNode; // Custom render function for "custom" type
}

interface DialogField {
  id: string;
  caption: string;
  type: "input" | "select" | "file" | "option" | "textarea" | "nmapper";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  show?: boolean;
  onChange?: (
    e: React.ChangeEvent<any>,
    formData: any,
    setFormData: React.Dispatch<React.SetStateAction<any>>,
    currentDialogFields: DialogField[],
    setDialogFields: React.Dispatch<React.SetStateAction<DialogField[]>>
  ) => void;
}

interface ContentRepeaterProps {
  id: string;
  dnd_order?: boolean; // Enable/disable drag-and-drop
  base_path?: string;
  table_columns?: TableColumn[];
  dialog_fields?: DialogField[];
  data?: any[];
  onChange: (items: any[]) => void;
  save_path_temp: string;
  api_upload_url: string;
  debug?: boolean;
}

const loadLeaflet = (() => {
  let isLoaded = false;

  return () => {
    if (!isLoaded) {
      const leafletCSS = document.createElement("link");
      leafletCSS.rel = "stylesheet";
      leafletCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(leafletCSS);

      const leafletJS = document.createElement("script");
      leafletJS.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      leafletJS.async = true;
      leafletJS.onload = () => {
        // Add inline CSS override for Leaflet SVG
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `
          .leaflet-container svg {
            width: auto !important;
            height: auto !important;
          }
        `;
        document.head.appendChild(style);
      };
      document.head.appendChild(leafletJS);

      isLoaded = true;
    }
  };
})();

export const ContentRepeater: React.FC<ContentRepeaterProps> = ({
  id,
  dnd_order = false,
  base_path = "",
  table_columns = [],
  dialog_fields = [],
  data = [],
  onChange,
  save_path_temp,
  api_upload_url = "/api/content-repeater-upload",
  debug = false
}) => {
  const [items, setItems] = useState<Record<string, any>>(() => {
    const initialState: Record<string, any> = {};
    data.forEach((item) => {
      initialState[item.id] = item;
    });
    return initialState;
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogMapOpen, setIsDialogMapOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formData, setFormData] = useState<any>({});
  const [currentDialogFields, setDialogFields] = useState<DialogField[]>(dialog_fields);
  const fileInputRefs = useRef<{ [key: string]: React.RefObject<HTMLInputElement> }>({});
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    setDialogFields(dialog_fields);
  }, [dialog_fields]);

  useEffect(() => {
    const refs: { [key: string]: React.RefObject<HTMLInputElement> } = {};
    dialog_fields.forEach((field) => {
      if (field.type === "file") {
        refs[field.id] = React.createRef<HTMLInputElement>();
      }
    });
    fileInputRefs.current = refs;
  }, [dialog_fields]);

  useEffect(() => {
    const hasMapperField = dialog_fields.some((field) => field.type === "mapper");
  
    if (hasMapperField) {
      loadLeaflet();
    } else {
      if (debug) console.log("No 'mapper' type found in dialog_fields. Leaflet will not be loaded.");
    }
  }, [dialog_fields]);  

  const openDialog = (item: any = null, dialogRef: any = null) => {
    const initialFormData = item
      ? { ...item }
      : dialog_fields.reduce((acc, field) => {
          if (field.type === "select" && field.options?.length) {
            acc[field.id] = field.options[0];
          } else if (field.type === "option" && field.options?.length) {
            acc[field.id] = field.options[0];
          } else if (field.type === "input" || field.type === "textarea") {
            acc[field.id] = "";
          }
          return acc;
        }, {});

    Object.values(fileInputRefs.current).forEach((ref) => {
      if (ref.current) {
        ref.current.value = "";
      }
    });

    const dialogFieldsWithDOM = dialog_fields.map((field) => ({
      ...field,
      domElement: document.getElementById(`${id}_${field.id}`), // Attach DOM element
    }));

    dialog_fields.forEach((field) => {
      if ((field.type === "select" || field.type === "option") && field.onChange) {
        const initialValue = initialFormData[field.id];
        field.onChange(
          { target: { value: initialValue } },
          dialogFieldsWithDOM // Pass updated dialog fields with DOM references
        );
      }
    });

    const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error");
    errorDiv.style.display = "none";

    setEditingItem(item);
    setFormData(initialFormData);
    setDialogFields(dialogFieldsWithDOM); // Update dialog fields with DOM references
    setIsDialogOpen(true);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    dialogRef.current?.close();
  };

  const dialogMapRef = useRef<HTMLDialogElement>(null);
  const mapRef = useRef(null);
  const state = useRef({
    mode: "autoPolygon",
    polygon: null,
    polyline: null,
    points: [],
    wasPolygonized: false,
  });
  const initializeMap = (initialData) => {
    if (!mapRef.current && window.L) {
      // Initialize the map
      console.log(`${id}_mapper_modeSelect`);

      mapRef.current = L.map(`${id}_mapper_container`).setView([43.833, 87.616], 2); // Urumqi center
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

      // Attach a click event to the map
      mapRef.current.on("click", (e) => {
        const latLng = e.latlng; // Get clicked coordinates
      
        if (state.current.mode === "autoPolygon") {
          // Handle auto-polygon mode
          state.current.points.push([latLng.lat, latLng.lng]);
      
          // Remove the previous polygon if it exists
          if (state.current.polygon) {
            mapRef.current.removeLayer(state.current.polygon);
          }
      
          // Draw a new polygon with updated points
          state.current.polygon = L.polygon(state.current.points, { color: "red" }).addTo(mapRef.current);
      
          if (debug) console.log("Polygon Points:", state.current.points);
        } else if (state.current.mode === "drawLines") {
          // Handle draw-lines mode
      
          // Clear all markers if there are no points
          if (state.current.points.length === 0) {
            if (state.current.startMarker) {
              mapRef.current.removeLayer(state.current.startMarker);
              state.current.startMarker = null;
            }
      
            if (state.current.polyline) {
              mapRef.current.removeLayer(state.current.polyline);
              state.current.polyline = null;
            }
          }
      
          const newPoint = [latLng.lat, latLng.lng];
      
          if (state.current.points.length === 0) {
            // First point - add a marker to indicate the starting point
            state.current.startMarker = L.circleMarker(newPoint, {
              color: "blue",
              radius: 1, // Adjust the radius for better visibility
            }).addTo(mapRef.current);
          }
      
          let isCollision = false;
          let isConnected = false;
      
          if (state.current.points.length > 1) {
            // Check for collision with existing lines
            for (let i = 0; i < state.current.points.length - 1; i++) {
              if (
                doLinesIntersect(
                  state.current.points[i],
                  state.current.points[i + 1],
                  state.current.points[state.current.points.length - 1],
                  newPoint
                )
              ) {
                //isCollision = true;
                break;
              }
            }
      
            // Check if the line connects to the starting point
            const startPoint = state.current.points[0];
            isConnected = isConnectedToStart(newPoint, L.latLng(startPoint[0], startPoint[1]));
          }
      
          // Add the new point to the line
          state.current.points.push(newPoint);
      
          // Remove the previous polyline if it exists
          if (state.current.polyline) {
            mapRef.current.removeLayer(state.current.polyline);
          }
      
          // Draw a new polyline with updated points
          state.current.polyline = L.polyline(state.current.points, { color: "blue" }).addTo(mapRef.current);
      
          if (debug) console.log("Polyline Points:", state.current.points);
      
          // If there is a collision or the line connects to the starting point, close the polygon
          if (isCollision || isConnected) {
            closePolygon();
          }
        }
      });            

      if (debug) console.log(initialData);

      // If initialData is provided, draw the saved shape
      if (initialData) {
        try {
          if (debug) console.log("Initial Data Received:", initialData);

          if (Array.isArray(initialData) && Array.isArray(initialData[0])) {
            // Assume this is a polygon
            if (debug) console.log("Processing Polygon Data:", initialData);

            // Convert to Leaflet-compatible format
            const polygonPoints = initialData.map(([lat, lng], index) => {
              if (typeof lat === "number" && typeof lng === "number") {
                return { lat, lng }; // Convert to { lat, lng }
              } else {
                throw new Error(`Invalid coordinate format at index ${index}: ${JSON.stringify([lat, lng])}`);
              }
            });

            // Update state and draw the polygon
            state.current.points = polygonPoints.map(({ lat, lng }) => [lat, lng]); // Preserve array format for state
            if (debug) console.log("Polygon Points Ready:", polygonPoints);
            state.current.polygon = L.polygon(polygonPoints, { color: "red" }).addTo(mapRef.current);

            // Adjust map view to fit the polygon
            mapRef.current.fitBounds(state.current.polygon.getBounds());
          } else if (Array.isArray(initialData)) {
            // Assume this is a polyline
            if (debug) console.log("Processing Polyline Data:", initialData);

            // Convert to Leaflet-compatible format
            const polylinePoints = initialData.map(([lat, lng], index) => {
              if (typeof lat === "number" && typeof lng === "number") {
                return { lat, lng }; // Convert to { lat, lng }
              } else {
                throw new Error(`Invalid coordinate format at index ${index}: ${JSON.stringify([lat, lng])}`);
              }
            });

            // Update state and draw the polyline
            state.current.points = polylinePoints.map(({ lat, lng }) => [lat, lng]); // Preserve array format for state
            state.current.polyline = L.polyline(state.current.points, { color: "blue" }).addTo(mapRef.current);

            // Adjust map view to fit the polyline
            mapRef.current.fitBounds(state.current.polyline.getBounds());
          } else {
            console.warn("Invalid initialData format. Expected array of coordinates.");
          }
        } catch (error) {
          console.error("Error processing initialData:", error.message);
        }
      }

      //Removing Ukrainian Flag
      document.querySelector('.leaflet-control-attribution.leaflet-control a')?.remove();

      document.getElementById(`${id}_mapper_modeSelect`).selectedIndex = 0;

      if (debug) console.log("Map initialized");
    }
  };
  const closeMapDialog = () => {
    if (debug) console.log('Unload: ', (`${id}_mapper_container`));
    setIsDialogMapOpen(false);
    dialogMapRef.current?.close();
    //L.map(`${id}_mapper_container`).remove();
    document.getElementById(`${id}_mapper_container`)?.remove();

    if (mapRef.current) {
      mapRef.current.off("click");
      mapRef.current.remove();
      mapRef.current = null;
      state.current.mode = "autoPolygon";
      state.current.polygon = null;
      state.current.polyline = null;
      state.current.points = [];
      state.current.wasPolygonized = false;
    }

    // Dynamically append a div to the target container
    const container = document.querySelector(`#${id}_mapper .dts-form__body .mapper-holder`);
    if (container) {
      const mapperContainer = document.createElement("div");
      mapperContainer.id = `${id}_mapper_container`;
      mapperContainer.style.flex = "1";
      mapperContainer.style.width = "100%";
      mapperContainer.style.height = "500px";
      container.appendChild(mapperContainer);
    } else {
      console.error(`Container not found for selector: ${id}_mapper .dts-form__body`);
    }
  }
  const closePolygon = () => {
    if (state.current.polyline) {
      mapRef.current.removeLayer(state.current.polyline);
    }
    if (state.current.polygon) {
      mapRef.current.removeLayer(state.current.polygon);
    }
  
    // Complete the loop by connecting to the first point
    state.current.points.push(state.current.points[0]);
    state.current.polygon = L.polygon(state.current.points, { color: "red" }).addTo(mapRef.current);
    state.current.wasPolygonized = true;
    state.current.polyline = null;
  
    if (debug) console.log("Polygon closed. Points:", state.current.points);
  };  
  const isConnectedToStart = (newPoint, startPoint) => {
    const distance = mapRef.current.distance(newPoint, startPoint); // Use Leaflet's distance method
    return distance < 10; // Close if within 10 meters
  };
  const doLinesIntersect = (p1, p2, p3, p4) => {
    const det = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (det === 0) return false; // Lines are parallel
  
    const lambda =
      ((p4[1] - p3[1]) * (p4[0] - p1[0]) + (p3[0] - p4[0]) * (p4[1] - p1[1])) / det;
    const gamma =
      ((p1[1] - p2[1]) * (p4[0] - p1[0]) + (p2[0] - p1[0]) * (p4[1] - p1[1])) / det;
  
    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  };
  const resetDrawing = () => {
    if (state.current.polygon) {
      mapRef.current.removeLayer(state.current.polygon);
    }
    if (state.current.polyline) {
      mapRef.current.removeLayer(state.current.polyline);
    }
    // Remove the starting marker if it exists
    if (state.current.startMarker) {
      mapRef.current.removeLayer(state.current.startMarker);
      state.current.startMarker = null; // Reset the marker reference
    }
    state.current.polygon = null;
    state.current.polyline = null;
    state.current.points = [];
    state.current.wasPolygonized = false;
  
    if (debug) console.log("Drawing state reset.");
  };  

  const handleSave = () => {
    // Find missing required fields
    const missingFields = dialog_fields
      .filter((field) => field.required) // Only check fields marked as required
      .filter((field) => {
        const fieldValue = formData[field.id]; // Get value from formData by id
        return !fieldValue || !fieldValue.trim(); // Check if the value is empty or only whitespace
      });

    // Access the error message container
    const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error");

    if (missingFields.length > 0) {
      // Construct the error message
      const errorMessage = `Please fill out the following required fields: ${missingFields
        .map((field) => field.caption)
        .join(", ")}`;

      // Display the error message in the error div
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = "block";
      }
      return; // Stop saving if validation fails
    }

    if (editingItem) {
      setItems((prevItems) => ({
        ...prevItems,
        [editingItem.id]: { ...prevItems[editingItem.id], ...formData },
      }));
    } else {
      const newId = Date.now().toString();
      setItems((prevItems) => ({
        ...prevItems,
        [newId]: { id: newId, ...formData },
      }));
    }
    onChange(Object.values(items));
    closeDialog();
  };

  const handleFileUpload = async (file: File, previousHref: string | null): Promise<{ name: string; content_type: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save_path_temp", `${save_path_temp}`);
    formData.append("temp_filename", `${Date.now()}_${file.name}`);
    formData.append("filename", `${file.name}`);

    if (previousHref) {
      // Append the previous href value if available
      formData.append("temp_filename_prev", previousHref);
    }

    const response = await fetch(`${base_path}${api_upload_url}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("File upload failed.");
    }

    return await response.json();
  };  

  const handleDelete = (itemId: string) => {
    setItems((prevItems) => {
      const updatedItems = { ...prevItems };
      delete updatedItems[itemId];
      return updatedItems;
    });
    onChange(Object.values(items));
  };

  const handleFieldChange = (field: DialogField, value: any) => {
    if (debug) console.log(`handleFieldChange triggered!`, field);
    setFormData((prev) => ({ ...prev, [field.id]: value }));
    if (field.onChange) {
      field.onChange(
        { target: { value } },
        formData,
        setFormData,
        currentDialogFields,
        setDialogFields
      );
    }
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    const draggedIndex = dragIndex.current;
    if (draggedIndex === null || draggedIndex === index) return;

    const itemsArray = Object.values(items);
    const [movedItem] = itemsArray.splice(draggedIndex, 1);
    itemsArray.splice(index, 0, movedItem);

    const reorderedItems: Record<string, any> = {};
    itemsArray.forEach((item) => {
      reorderedItems[item.id] = item;
    });

    setItems(reorderedItems);
    onChange(itemsArray);
    dragIndex.current = null;
  };

  return (
    <div id={id} className="content-repeater">
      <table className="dts-table" style={{ background: "#ffffff" }}>
        <thead>
          <tr>
            {table_columns.map((column, index) => {
              if (column.type === "action") {
                return <th key={index} style={{textAlign: "right", width: (column.width) ? column.width : 'auto'}}>{column.caption}</th>
              } else {
                return <th key={index} style={{width: (column.width) ? column.width : 'auto'}}>{column.caption}</th>
              }
            })}
          </tr>
        </thead>
        <tbody>
          {Object.values(items).map((item, index) => (
            <tr
              key={item.id}
              draggable={dnd_order}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
            >
            {table_columns.map((column, colIndex) => {
              if (column.type === "dialog_field" && column.dialog_field_id) {
                // Safely access the value or provide a fallback
                const value = item[column.dialog_field_id] ?? "N/A"; // Default to "N/A" if undefined
                return <td key={colIndex} style={{width: (column.width) ? column.width : 'auto'}}>{typeof value === "object" ? value?.name : value}</td>;
              } else if (column.type === "custom" && typeof column.render === "function") {
                // Call the render function for custom column type
                return <td key={colIndex}>{column.render(item)}</td>;
              } else if (column.type === "action") {
                // Render action buttons
                return (
                  <td key={colIndex} style={{textAlign: "right", width: (column.width) ? column.width : 'auto'}}>
                    <a
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(item.id);
                      }}
                    >
                      Delete
                    </a>{" "}
                    |{" "}
                    <a
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openDialog(item, dialogRef);
                      }}
                    >
                      Edit
                    </a>
                  </td>
                );
              }
              return null; // Fallback for unhandled column types
            })}
            </tr>
          ))}
        </tbody>
      </table>

      <textarea
        id={id}
        name={id}
        className="dts-hidden-textarea"
        style={{ display: "none" }}
        value={JSON.stringify(Object.values(items))}
        readOnly
      ></textarea>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.6rem",
          background: "#F2F2F2",
        }}
      >
        <li>
          <a
            type="button"
            className="mg-button mg-button-system"
            style={{ width: "fit-content" }}
            onClick={(e) => {
              e.preventDefault();
              openDialog(null, dialogRef);
            }}
          >
            Add
          </a>
        </li>

        {debug &&
          (() => {
            <li>
            <a
              type="button"
              className="mg-button mg-button-system"
              style={{ width: "fit-content" }}
              onClick={(e) => {
                e.preventDefault();
                if (debug) console.log("JSON Data:", Object.values(items));
              }}
            >
              Console Log Data
            </a>
          </li>
          })()
        }
      </ul>

      <dialog
        id={`${id}_mapper`}
        ref={dialogMapRef}
        className="dts-dialog"
        style={{
          position: "fixed",
          width: "100vw !important",
          height: "100vh !important",
          margin: 0,
          border: "none",
          backgroundColor: "white",
          zIndex: 9999,
          maxWidth: "none !important",
          maxHeight: "none !important",
        }}
      >
        <div className="dts-dialog__content" style={{overflowY: "hidden"}}>
          <div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
            <h2 className="dts-heading-2" style={{marginBottom: "0px"}}>Mapper</h2>
            <a type="button" aria-label="Close dialog" onClick={closeMapDialog} style={{ color: "#000" }}>
              <svg aria-hidden="true" focusable="false" role="img">
                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
              </svg>
            </a>
          </div>
          <div>
            <div className="dts-form__body">
              <div className="mapper-menu" style={{display: "flex", justifyContent: "space-between", padding: "10px", background: "#777"}}>
                <input type="text" id={`${id}_mapper_search`} style={{flex: 1, marginRight: "10px"}} 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const query = document.getElementById(`${id}_mapper_search`).value;
                    if (!query) {
                        alert("Please enter a location to search.");
                        return;
                    }

                    fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                      if (data.length > 0) {
                        const { lat, lon, boundingbox } = data[0];
                  
                        if (boundingbox) {
                          // Use the bounding box to fit the map to the area
                          const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
                          const bounds = [
                            [latMin, lonMin], // Southwest corner
                            [latMax, lonMax], // Northeast corner
                          ];
                  
                          mapRef.current.fitBounds(bounds, { padding: [50, 50] }); // Adjust padding as needed
                          if (debug) console.log(`Moved to bounds: ${JSON.stringify(bounds)}`);
                        } else {
                          // If no bounding box, fall back to a default zoom level and center on the lat/lon
                          mapRef.current.setView([lat, lon], 14);
                          if (debug) console.log(`Moved to location: ${query} (${lat}, ${lon})`);
                        }
                      } else {
                        alert("Location not found. Try a different query.");
                      }
                    })
                    .catch(err => {
                      console.error("Error fetching location:", err);
                      alert("An error occurred while searching. Please try again.");
                    });                  

                    if (debug) console.log(dialogMapRef.current.querySelector(`#${id}_mapper_container`));
                  }
                }}
                placeholder="Type location and enter" />
              <select
                id={`${id}_mapper_modeSelect`}
                style={{ width: "20%", marginRight: "10px" }}
                onChange={(e) => {
                  resetDrawing();
                  state.current.mode = e.target.value; // Update the mode in state.current
                  if (debug) console.log("Mode changed to:", state.current.mode);
                }}
              >
                <option value="autoPolygon">Auto Polygon</option>
                <option value="drawLines">Draw Lines</option>
              </select>
              <div id={`${id}_mapper_buttons`} style={{display: "flex", gap: "10px"}}>
                  <button type="button" id={`${id}_mapper_clearCoords`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    resetDrawing();
                  }}
                  >Clear</button>
                  <button type="button" id={`${id}_mapper_undoAction`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    if (state.current.points.length > 0) {
                        if (state.current.wasPolygonized) {
                            if (state.current.polygon) mapRef.current.removeLayer(state.current.polygon);
                            state.current.points.pop(); // Remove closing point
                            state.current.polyline = L.polyline(state.current.points, { color: 'blue' }).addTo(mapRef.current);
                            state.current.wasPolygonized = false;
                        } else {
                          state.current.points.pop();

                          if (state.current.mode === "autoPolygon") {
                              if (state.current.polygon) mapRef.current.removeLayer(state.current.polygon);
                              if (state.current.points.length > 0) {
                                state.current.polygon = L.polygon(state.current.points, { color: 'red' }).addTo(mapRef.current);
                              }
                          } else if (state.current.mode === "drawLines") {
                              if (state.current.polyline) mapRef.current.removeLayer(state.current.polyline);
                              if (state.current.points.length > 0) {
                                state.current.polyline = L.polyline(state.current.points, { color: 'blue' }).addTo(mapRef.current);
                              }
                          }
                        }
                    } else {
                      if (debug) console.log("No actions to undo!");
                    }
                  }}
                  >Undo</button>
                  <button type="button" id={`${id}_mapper_getCoords`} 
                  className="mg-button mg-button--small mg-button-primary" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    const field = dialogMapRef.current?.mapperField;
                  
                    if (!field) {
                      console.error("Field is not set on dialogMapRef.");
                      return;
                    }
                  
                    if (debug) console.log("Field passed to dialog:", field);
                  
                    const targetElement = field.domElement;
                  
                    let updatedValue = "";
                  
                    if (state.current.polygon) {
                      // Convert polygon LatLng objects to plain arrays
                      const polygonCoordinates = state.current.polygon
                        .getLatLngs()[0] // Leaflet polygons are arrays of arrays
                        .map((latLng) => [latLng.lat, latLng.lng]);
                    
                        if (debug) console.log("Polygon Coordinates:", JSON.stringify(polygonCoordinates));
                      updatedValue = JSON.stringify(polygonCoordinates); // Save as JSON array
                    } else if (state.current.polyline) {
                      // Convert polyline LatLng objects to plain arrays
                      const lineCoordinates = state.current.polyline
                        .getLatLngs()
                        .map((latLng) => [latLng.lat, latLng.lng]);
                    
                        if (debug) console.log("Line Coordinates:", JSON.stringify(lineCoordinates));
                      updatedValue = JSON.stringify(lineCoordinates); // Save as JSON array
                    } else {
                      if (debug) console.log("No shape created yet.");
                    }                    
                  
                    // Update the textarea value
                    targetElement.value = updatedValue;
                  
                    // Trigger the field's onChange handler
                    handleFieldChange(field, updatedValue);

                    closeMapDialog();
                  }}
                                    
                  >Get Coordinates</button>
              </div>
              </div>
              <div className="mapper-holder">
                <div id={`${id}_mapper_container`} 
                style={{ flex: 1, width: "100%", height: "500px" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </dialog>

      <dialog ref={dialogRef} className="dts-dialog" {...(isDialogOpen ? { open: true } : {})}>
        <div className="dts-dialog__content">
          <div className="dts-dialog__header">
            <a type="button" aria-label="Close dialog" onClick={closeDialog} style={{ color: "#000" }}>
              <svg aria-hidden="true" focusable="false" role="img">
                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
              </svg>
            </a>
          </div>
          <div>
            <div className="dts-form__intro">
              <h2 className="dts-heading-2">{editingItem ? "Edit Item" : "Add New Item"}</h2>
            </div>
            <div className="dts-form__body">
              <div className="dts-alert dts-alert--error" style={{display: "none"}}></div>
              {currentDialogFields.map((field, index) => {
                const fieldId = `${id}_${field.id}`;
                const value = formData[field.id] || "";

                return (
                  <div
                    className="dts-form-component"
                    key={index}
                    style={{ display: field.show === false ? "none" : "block" }}
                  >
                    <label {...(field.type !== "option" ? { htmlFor: fieldId } : {})}>
                      <div className="dts-form-component__label">
                        <span>{field.caption}</span>
                      </div>
                      {field.type === "input" && (
                        <input
                          id={fieldId}
                          type="text"
                          placeholder={field.placeholder || ""}
                          value={value}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                        />
                      )}
                      {field.type === "textarea" && (
                        <textarea
                          id={fieldId}
                          placeholder={field.placeholder || ""}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          style={{ marginBottom: "2rem" }}
                          value={value}
                        ></textarea>
                      )}
                      {field.type === "mapper" && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1%' }}>
                            <div
                              id={`${id}_${fieldId}`}
                              style={{
                                position: "relative",
                                width: "100%",
                                padding: '0.4rem 0.8rem',
                                backgroundColor: 'white',
                                border: '1px solid #cccccc',
                                borderRadius: '6px',
                                color: '#999',
                                minHeight: '3rem',
                                overflow: 'hidden',
                                cursor: "pointer",
                              }}
                            >  
                              <a 
                                style={{
                                  width: "auto",
                                  zIndex: "1000",
                                  textAlign: "center",
                                  padding: "0.7rem 0.8rem",
                                  color: "#000",
                                  textDecoration: "none",
                                  borderRadius: "4px",
                                  display: "inline-flex", // Use inline-flex for centering inline content
                                  alignItems: "center",   // Vertically center items
                                  justifyContent: "center", // Optional: Center items horizontally
                                  backgroundColor: "#cccccc",
                                  ...(value ? { position: "absolute", top: "-2px", right: "-2px" } : {})
                                }}
                                onClick={() => {
                                  setIsDialogMapOpen(true);
                                  dialogMapRef.current?.showModal();
                                  dialogMapRef.current.mapperField = field;
                                  initializeMap(value ? JSON.parse(value) : null);
                                }}
                              >
                                <img 
                                  src={`${base_path}/assets/icons/globe.svg`}
                                  alt="Globe SVG File" 
                                  title="Globe SVG File" 
                                  style={{ width: "20px", height: "20px", marginRight: "0.5rem" }} // Adjust size and spacing
                                /> 
                                Open Map
                              </a>                    
                              {value &&
                                (() => {
                                  try {
                                    const coordinates = JSON.parse(value); // Parse JSON array
                                    if (Array.isArray(coordinates)) {
                                      return (
                                        <ul 
                                        style={{
                                          fontSize: "1rem",
                                          margin: "0.5rem",
                                          padding: "1rem",
                                          position: "relative"
                                        }}
                                        title="Click to open coords in array"
                                        onClick={() => {
                                          const newWindow = window.open();
                                          if (newWindow) {
                                            newWindow.document.write(
                                              `<pre>${JSON.stringify(coordinates, null, 2)}</pre>`
                                            );
                                            newWindow.document.close();
                                          }
                                        }}
                                        >
                                          {coordinates.map((coordinate, index) => (
                                            <li key={index}>
                                              Lat: {coordinate[0]}, Lng: {coordinate[1]}
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    }
                                    return <pre>{value}</pre>; // Fallback for invalid structures
                                  } catch (err) {
                                    console.error("Failed to parse value:", err);
                                    return <pre>Invalid data</pre>;
                                  }
                              })()}
                            </div>
                            <textarea
                              id={fieldId}
                              name={fieldId}
                              className="dts-hidden-textarea"
                              style={{ display: "none" }}
                              value={value}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      )}
                      {field.type === "select" && (
                        <select
                          id={fieldId}
                          value={value}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === "option" && (
                        <div>
                          <div id={fieldId} className="mg-grid mg-grid__col-auto">
                            {field.options?.map((option, i) => (
                              <label htmlFor={`${fieldId}_${i}`} key={i} style={{ display: "block", marginBottom: "0.5rem" }}>
                                <div className="dts-form-component__field--horizontal">
                                  <input
                                    type="radio"
                                    id={`${fieldId}_${i}`}
                                    name={fieldId}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                  />
                                  <span>{option}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {field.type === "file" && (
                        <div>
                          <div 
                            id={`file-link-loading-${field.id}`}
                            style={{
                              display: 'none',
                              width: '100%',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: 'white',
                              border: '1px solid #cccccc',
                              borderRadius: '6px',
                              marginBottom: '1rem',
                              color: '#999'
                            }}   
                          >Uploading, please wait...</div>
                          {formData[field.id]?.name && (
                            <a
                              id={`file-link-${field.id}`}
                              href={`${base_path}${formData[field.id]?.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-block",
                                width: "100%",
                                padding: "0.4rem 0.8rem",
                                backgroundColor: "white",
                                border: "1px solid #cccccc",
                                borderRadius: "6px",
                                marginBottom: "1rem",
                              }}
                            >
                              {formData[field.id]?.name.split("/").pop()}
                            </a>
                          )}
                          <input
                            id={fieldId}
                            type="file"
                            ref={fileInputRefs.current[field.id]} // Attach the correct ref
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  document.getElementById(`file-link-loading-${field.id}`).style.display = 'block';
                                  if (document.getElementById(`file-link-${field.id}`))
                                    document.getElementById(`file-link-${field.id}`).style.display = 'none';

                                  const previousHrefElement = document.getElementById(`file-link-${field.id}`);
                                  const previousHref = previousHrefElement?.getAttribute("href") || null;

                                  const fileData = await handleFileUpload(file, previousHref);
                                  handleFieldChange(field, fileData);

                                  // Reset the file input after upload
                                  if (fileInputRefs.current[field.id]?.current) {
                                    fileInputRefs.current[field.id].current!.value = "";
                                    document.getElementById(`file-link-loading-${field.id}`).style.display = 'none';
                                    if (document.getElementById(`file-link-${field.id}`))
                                      document.getElementById(`file-link-${field.id}`).style.display = 'block';
                                  }
                                } catch (error) {
                                  console.error("File upload failed:", error);
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="dts-form__actions">
              <a type="submit" className="mg-button mg-button-primary" onClick={handleSave}>
                Save
              </a>
              <a type="button" className="mg-button mg-button-outline" onClick={closeDialog}>
                Cancel
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

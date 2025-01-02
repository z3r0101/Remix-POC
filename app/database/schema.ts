import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const Content = pgTable("Content", {
  id: serial("id").primaryKey(), // Use serial for auto-incrementing primary key
  title: text("title").notNull(),
  copy: text("copy").notNull(),
  attachments: text("attachments"),
  polygonmapper: text("polygonmapper"),
  created_at: timestamp("created_at").default(sql`NOW()`), // Use sql helper for default value
});

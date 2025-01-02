CREATE TABLE "Content" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"copy" text NOT NULL,
	"attachments" text NOT NULL,
	"polygonmapper" text NOT NULL,
	"created_at" timestamp DEFAULT NOW()
);

-- CreateTable
CREATE TABLE "pdf_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdf_hash" TEXT NOT NULL,
    "title" TEXT,
    "total_pages" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdf_hash" TEXT NOT NULL,
    "page_num" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "translations_pdf_hash_fkey" FOREIGN KEY ("pdf_hash") REFERENCES "pdf_metadata" ("pdf_hash") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_metadata_pdf_hash_key" ON "pdf_metadata"("pdf_hash");

-- CreateIndex
CREATE INDEX "translations_pdf_hash_page_num_idx" ON "translations"("pdf_hash", "page_num");

-- CreateIndex
CREATE UNIQUE INDEX "translations_content_hash_key" ON "translations"("content_hash");

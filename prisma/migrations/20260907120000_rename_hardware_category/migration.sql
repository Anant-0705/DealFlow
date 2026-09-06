UPDATE "Category"
SET name = 'Product'
WHERE name = 'Hardware'
  AND NOT EXISTS (SELECT 1 FROM "Category" AS existing WHERE existing.name = 'Product');

UPDATE "Product"
SET "categoryId" = (SELECT id FROM "Category" WHERE name = 'Product')
WHERE "categoryId" = (SELECT id FROM "Category" WHERE name = 'Hardware')
  AND EXISTS (SELECT 1 FROM "Category" WHERE name = 'Product')
  AND EXISTS (SELECT 1 FROM "Category" WHERE name = 'Hardware');

DELETE FROM "Category"
WHERE name = 'Hardware'
  AND EXISTS (SELECT 1 FROM "Category" WHERE name = 'Product');

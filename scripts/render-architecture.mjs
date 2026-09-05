import sharp from "sharp";

await sharp("docs/architecture.svg").png().toFile("docs/architecture.png");
console.log("Rendered docs/architecture.png");

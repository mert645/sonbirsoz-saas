const markdownpdf = require("markdown-pdf");
const path = require("path");
const fs = require("fs");

const mdPath = path.join(__dirname, "../docs/PROJE-DOKUMANTASYONU.md");
const pdfPath = path.join(__dirname, "../docs/PROJE-DOKUMANTASYONU.pdf");

const options = {
  cssPath: path.join(__dirname, "pdf-style.css"),
  paperFormat: "A4",
  paperBorder: "20mm",
  remarkable: {
    html: true,
    breaks: true,
  },
};

// CSS dosyası oluştur
const cssContent = `
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  font-size: 11pt;
}
h1 {
  color: #1a1a2e;
  border-bottom: 3px solid #4F46E5;
  padding-bottom: 10px;
  margin-top: 30px;
  page-break-after: avoid;
}
h2 {
  color: #16213e;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
  margin-top: 25px;
  page-break-after: avoid;
}
h3 {
  color: #0f3460;
  margin-top: 20px;
  page-break-after: avoid;
}
code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', monospace;
  font-size: 9pt;
}
pre {
  background: #f8f8f8;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 5px;
  overflow-x: auto;
  font-size: 9pt;
  page-break-inside: avoid;
}
pre code {
  background: none;
  padding: 0;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
  font-size: 10pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
th {
  background: #4F46E5;
  color: white;
}
tr:nth-child(even) {
  background: #f9f9f9;
}
a {
  color: #4F46E5;
  text-decoration: none;
}
hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 25px 0;
}
ul, ol {
  margin: 10px 0;
  padding-left: 25px;
}
li {
  margin: 5px 0;
}
blockquote {
  border-left: 4px solid #4F46E5;
  margin: 15px 0;
  padding: 10px 20px;
  background: #f9f9f9;
}
`;

fs.writeFileSync(path.join(__dirname, "pdf-style.css"), cssContent);

console.log("PDF oluşturuluyor...");

markdownpdf(options)
  .from(mdPath)
  .to(pdfPath, function () {
    console.log("PDF başarıyla oluşturuldu:", pdfPath);
  });

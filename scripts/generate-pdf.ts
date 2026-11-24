import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/^\- \[x\] (.*$)/gim, '<li class="done">✓ $1</li>');
  html = html.replace(/^\- \[ \] (.*$)/gim, '<li class="todo">☐ $1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gim, (match, content) => {
    const cells = content.split('|').map((c: string) => c.trim());
    if (cells.every((c: string) => /^[-:]+$/.test(c))) {
      return ''; // Skip separator row
    }
    const cellTags = cells.map((c: string) => `<td>${c}</td>`).join('');
    return `<tr>${cellTags}</tr>`;
  });

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');

  // Paragraphs
  html = html.replace(/\n\n/gim, '</p><p>');

  // Line breaks
  html = html.replace(/\n/gim, '<br>');

  return html;
};

const generatePdf = async () => {
  const mdPath = path.join(__dirname, "../docs/PROJE-DOKUMANTASYONU.md");
  const pdfPath = path.join(__dirname, "../docs/PROJE-DOKUMANTASYONU.pdf");

  const markdown = fs.readFileSync(mdPath, "utf-8");
  const htmlContent = markdownToHtml(markdown);

  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 {
      color: #1a1a2e;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 10px;
      margin-top: 40px;
    }
    h2 {
      color: #16213e;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    h3 {
      color: #0f3460;
      margin-top: 20px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1a1a2e;
      color: #e0e0e0;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
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
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    li.done {
      color: #22c55e;
      list-style: none;
    }
    li.todo {
      color: #ef4444;
      list-style: none;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      border: none;
      margin-top: 0;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    printBackground: true,
  });
  await browser.close();

  console.log(`PDF oluşturuldu: ${pdfPath}`);
};

generatePdf().catch(console.error);

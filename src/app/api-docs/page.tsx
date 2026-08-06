"use client";

import { useEffect, useRef } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <SwaggerUI url="/api/docs/openapi.json" />
      </div>
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 30px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }
        .swagger-ui .scheme-container {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .swagger-ui .opblock .opblock-summary {
          border-radius: 8px;
        }
        .swagger-ui .btn {
          border-radius: 6px;
        }
        .swagger-ui select {
          border-radius: 6px;
        }
        .swagger-ui input[type=text] {
          border-radius: 6px;
        }
        .swagger-ui textarea {
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <div>
        <h1>Paper Translate AI - Backend</h1>
        <p>
          This is the backend API server. Please use the frontend application to access the service.
        </p>
        <div>
          <p>API Endpoints:</p>
          <ul>
            <li>POST /api/translate - Translate text</li>
            <li>POST /api/pdf/upload - Upload PDF</li>
            <li>POST /api/pdf/export - Export translated PDF</li>
          </ul>
        </div>
      </div>
    </main>
  );
}


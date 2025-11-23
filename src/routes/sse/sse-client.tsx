/** eslint-disable react-dom/no-dangerously-set-innerhtml */
import { createRouter } from "@/lib/create-app";
import { Layout } from "@/lib/layout";

const router = createRouter();

router.get("/sse/client", (c) => {
  return c.html(
    <Layout title="SSE Test Client - api.oluwasetemi.dev">
      <div class="container">
        <header>
          <h1>Server-Sent Events (SSE) Test Client</h1>
          <p class="subtitle">
            Real-time event streaming from api.oluwasetemi.dev
          </p>
        </header>

        <main>
          <section class="connection-section">
            <h2>Connection Settings</h2>

            <div class="form-group">
              <label for="endpoint">SSE Endpoint:</label>
              <select id="endpoint" class="form-control">
                <option value="/sse/tasks">Tasks (/sse/tasks)</option>
                <option value="/sse/products">Products (/sse/products)</option>
                <option value="/sse/posts">Posts (/sse/posts)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="filter-id">Filter by ID (optional):</label>
              <input
                type="text"
                id="filter-id"
                class="form-control"
                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              />
              <small>Leave empty to receive all events</small>
            </div>

            <div class="form-group">
              <label for="auth-token">Authorization Token (optional):</label>
              <input
                type="password"
                id="auth-token"
                class="form-control"
                placeholder="Bearer token for authenticated streams"
              />
              <small>Optional: Add JWT token to filter events by user</small>
            </div>

            <div class="button-group">
              <button type="button" id="connect-btn" class="btn btn-primary">
                Connect
              </button>
              <button type="button" id="disconnect-btn" class="btn btn-danger" disabled>
                Disconnect
              </button>
              <button type="button" id="clear-btn" class="btn btn-secondary">
                Clear Events
              </button>
            </div>

            <div id="status" class="status disconnected">
              <span class="status-indicator"></span>
              <span class="status-text">Disconnected</span>
            </div>
          </section>

          <section class="stats-section">
            <h2>Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Connection Time</div>
                <div id="connection-time" class="stat-value">
                  --
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Events Received</div>
                <div id="events-count" class="stat-value">
                  0
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Last Event</div>
                <div id="last-event-time" class="stat-value">
                  --
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Event Type</div>
                <div id="last-event-type" class="stat-value">
                  --
                </div>
              </div>
            </div>
          </section>

          <section class="events-section">
            <h2>Event Stream</h2>
            <div id="events-container" class="events-container">
              <div class="empty-state">
                No events yet. Connect to start receiving events.
              </div>
            </div>
          </section>
        </main>
      </div>

      <style>
        {`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'IBM Plex Serif', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
          color: #333;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        main {
          padding: 2rem;
        }

        section {
          margin-bottom: 2rem;
        }

        h2 {
          color: #667eea;
          font-size: 1.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
          font-family: 'IBM Plex Mono', monospace;
        }

        .form-control:focus {
          outline: none;
          border-color: #667eea;
        }

        small {
          display: block;
          margin-top: 0.25rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          font-weight: 600;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status.disconnected {
          background: #fee2e2;
          color: #991b1b;
        }

        .status.disconnected .status-indicator {
          background: #ef4444;
        }

        .status.connected {
          background: #d1fae5;
          color: #065f46;
        }

        .status.connected .status-indicator {
          background: #10b981;
        }

        .status.connecting {
          background: #fef3c7;
          color: #92400e;
        }

        .status.connecting .status-indicator {
          background: #f59e0b;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
          font-family: 'IBM Plex Mono', monospace;
        }

        .events-container {
          max-height: 600px;
          overflow-y: auto;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          background: #f9fafb;
        }

        .empty-state {
          text-align: center;
          color: #6b7280;
          padding: 3rem;
          font-style: italic;
        }

        .event-item {
          background: white;
          border-left: 4px solid #667eea;
          padding: 1rem;
          margin-bottom: 0.75rem;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .event-item.event-created {
          border-left-color: #10b981;
        }

        .event-item.event-updated {
          border-left-color: #3b82f6;
        }

        .event-item.event-deleted {
          border-left-color: #ef4444;
        }

        .event-item.event-published {
          border-left-color: #8b5cf6;
        }

        .event-item.event-heartbeat {
          border-left-color: #6b7280;
          opacity: 0.6;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .event-type {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .event-time {
          font-size: 0.75rem;
          color: #6b7280;
          font-family: 'IBM Plex Mono', monospace;
        }

        .event-data {
          background: #f3f4f6;
          padding: 0.75rem;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.875rem;
        }

        .event-data pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}
      </style>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        let eventSource = null;
        let connectionStartTime = null;
        let eventsCount = 0;
        let connectionTimeInterval = null;

        const connectBtn = document.getElementById('connect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const clearBtn = document.getElementById('clear-btn');
        
        const endpointSelect = document.getElementById('endpoint');
        
        const filterIdInput = document.getElementById('filter-id');
        const authTokenInput = document.getElementById('auth-token');
        
        const statusDiv = document.getElementById('status');
        const statusText = statusDiv.querySelector('.status-text');
        
        const eventsContainer = document.getElementById('events-container');
        const eventsCountDiv = document.getElementById('events-count');
        
        const lastEventTimeDiv = document.getElementById('last-event-time');
        const lastEventTypeDiv = document.getElementById('last-event-type');
        
        const connectionTimeDiv = document.getElementById('connection-time');

        function updateStatus(status, text) {
          statusDiv.className = 'status ' + status;
          statusText.textContent = text;
        }

        function updateConnectionTime() {
          if (connectionStartTime) {
            const elapsed = Date.now() - connectionStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            connectionTimeDiv.textContent = minutes + 'm ' + remainingSeconds + 's';
          }
        }

        function addEvent(eventType, data) {
          // Remove empty state
          const emptyState = eventsContainer.querySelector('.empty-state');
          if (emptyState) {
            emptyState.remove();
          }

          eventsCount++;
          eventsCountDiv.textContent = eventsCount;
          lastEventTimeDiv.textContent = new Date().toLocaleTimeString();
          lastEventTypeDiv.textContent = eventType;

          const eventItem = document.createElement('div');
          const [entity, action] = eventType.split('.');
          const key = action || entity || 'default';
          const eventClass = 'event-' + key;
          eventItem.className = 'event-item ' + eventClass;

          // Safely construct DOM nodes to prevent XSS
          const eventHeader = document.createElement('div');
          eventHeader.className = 'event-header';

          const eventTypeSpan = document.createElement('span');
          eventTypeSpan.className = 'event-type';
          eventTypeSpan.textContent = eventType;

          const eventTimeSpan = document.createElement('span');
          eventTimeSpan.className = 'event-time';
          eventTimeSpan.textContent = new Date().toLocaleTimeString();

          eventHeader.appendChild(eventTypeSpan);
          eventHeader.appendChild(eventTimeSpan);

          const eventDataDiv = document.createElement('div');
          eventDataDiv.className = 'event-data';

          const preElement = document.createElement('pre');
          preElement.textContent = JSON.stringify(data, null, 2);

          eventDataDiv.appendChild(preElement);

          eventItem.appendChild(eventHeader);
          eventItem.appendChild(eventDataDiv);

          eventsContainer.insertBefore(eventItem, eventsContainer.firstChild);

          // Limit to 100 events
          while (eventsContainer.children.length > 100) {
            eventsContainer.removeChild(eventsContainer.lastChild);
          }
        }

        function connect() {
          if (eventSource) {
            disconnect();
          }

          const endpoint = endpointSelect.value;
          const filterId = filterIdInput.value.trim();
          const authToken = authTokenInput.value.trim();

          // Build URL with query params (use relative URL to work with current origin)
          const params = new URLSearchParams();

          if (filterId) {
            const paramName = endpoint.includes('tasks') ? 'taskId' :
                            endpoint.includes('products') ? 'productId' : 'postId';
            params.append(paramName, filterId);
          }

          // EventSource doesn't support custom headers, so pass auth token as query param
          if (authToken) {
            params.append('token', authToken);
          }

          const url = endpoint + (params.toString() ? '?' + params.toString() : '');

          updateStatus('connecting', 'Connecting...');

          eventSource = new EventSource(url);
          connectionStartTime = Date.now();
          eventsCount = 0;

          connectionTimeInterval = setInterval(updateConnectionTime, 1000);

          eventSource.addEventListener('connected', (e) => {
            updateStatus('connected', 'Connected');
            addEvent('connected', JSON.parse(e.data));
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
          });

          eventSource.addEventListener('heartbeat', (e) => {
            addEvent('heartbeat', JSON.parse(e.data));
          });

          // Task events
          eventSource.addEventListener('task.created', (e) => {
            addEvent('task.created', JSON.parse(e.data));
          });

          eventSource.addEventListener('task.updated', (e) => {
            addEvent('task.updated', JSON.parse(e.data));
          });

          eventSource.addEventListener('task.deleted', (e) => {
            addEvent('task.deleted', JSON.parse(e.data));
          });

          // Product events
          eventSource.addEventListener('product.created', (e) => {
            addEvent('product.created', JSON.parse(e.data));
          });

          eventSource.addEventListener('product.updated', (e) => {
            addEvent('product.updated', JSON.parse(e.data));
          });

          eventSource.addEventListener('product.deleted', (e) => {
            addEvent('product.deleted', JSON.parse(e.data));
          });

          // Post events
          eventSource.addEventListener('post.created', (e) => {
            addEvent('post.created', JSON.parse(e.data));
          });

          eventSource.addEventListener('post.updated', (e) => {
            addEvent('post.updated', JSON.parse(e.data));
          });

          eventSource.addEventListener('post.deleted', (e) => {
            addEvent('post.deleted', JSON.parse(e.data));
          });

          eventSource.addEventListener('post.published', (e) => {
            addEvent('post.published', JSON.parse(e.data));
          });

          eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            updateStatus('disconnected', 'Connection Error');
            disconnect();
          };
        }

        function disconnect() {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (connectionTimeInterval) {
            clearInterval(connectionTimeInterval);
            connectionTimeInterval = null;
          }
          connectionStartTime = null;
          updateStatus('disconnected', 'Disconnected');
          connectBtn.disabled = false;
          disconnectBtn.disabled = true;
          connectionTimeDiv.textContent = '--';
        }

        function clearEvents() {
          eventsContainer.innerHTML = '<div class="empty-state">No events yet. Connect to start receiving events.</div>';
          eventsCount = 0;
          eventsCountDiv.textContent = '0';
          lastEventTimeDiv.textContent = '--';
          lastEventTypeDiv.textContent = '--';
        }

        connectBtn.addEventListener('click', connect);
        disconnectBtn.addEventListener('click', disconnect);
        clearBtn.addEventListener('click', clearEvents);

        // Cleanup on page unload
        window.addEventListener('beforeunload', disconnect);
      `,
        }}
      />
    </Layout>,
  );
});

export default router;

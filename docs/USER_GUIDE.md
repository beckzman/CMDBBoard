# CMDB Dashboard - User Guide

This guide provides instructions on how to use the CMDB Dashboard to manage your IT inventory.

## Table of Contents
1.  [Dashboard Overview](#dashboard-overview)
2.  [Managing Configuration Items](#managing-configuration-items)
    *   [Viewing CIs](#viewing-cis)
    *   [Adding & Editing](#adding--editing)
    *   [Deleting](#deleting)
    *   [Health Checks](#health-checks)
3.  [Dependency Visualization](#dependency-visualization)
4.  [Data Import/Export](#data-importexport)

---

## Dashboard Overview
The main dashboard provides a high-level view of your infrastructure:
-   **Total CIs**: The total count of tracked items.
-   **By Type**: Breakdown of items by category (Server, Application, etc.).
-   **By Status**: Breakdown by operational status (Active, Maintenance, etc.).
-   **Recent Activity**: The latest changes made to the database.

## Managing Configuration Items

### Viewing CIs
Navigate to the **Configuration Items** page via the sidebar. Here you can:
-   **Search**: Use the search bar to find items by name.
-   **Filter**: Use the dropdown menus to filter by Status (e.g., Active, Retired) or Type.
-   **View Details**: Click the **Eye icon** to see full technical details, ownership, and location info.

### Adding & Editing
-   **Add New**: Click the **"+ Add Item"** button. Fill in the required fields (Name, Type, Owner) and any optional details.
-   **Edit**: Click the **Pencil icon** on any row to modify its details.

### Deleting
To remove an item:
1.  Click the **Trash icon** on the item's row.
2.  A confirmation modal will appear: "Are you sure you want to delete [Item Name]?".
3.  Click **"Delete Item"** to confirm. This action is permanent.

### Health Checks
You can verify the connectivity of a CI (if it has a valid hostname/IP):
1.  Click the **Heartbeat/Activity icon** on the item's row.
2.  A modal will open showing the check progress ("Pinging...").
4.  **Result**:
    *   **ONLINE**: The host is reachable.
        *   For **Database** CIs: Connectivity is verified by checking the database port (default or configured).
        *   For **Other** CIs: Connectivity is verified by standard Ping (ICMP).
        *   The IP address (e.g., `192.168.1.5`) is also displayed.
    *   **UNREACHABLE**: The host could not be reached. Error details are provided.

## Dependency Visualization

The **Dependency Graph** allows you to visualize relationships between Configuration Items, helping you understand the impact of changes and dependencies within your infrastructure.

### Accessing the Graph
Navigate to the **Dependency Graph** page via the sidebar menu.

### Features
-   **Interactive Nodes**: Each CI is represented as a node, color-coded by its type (e.g., Application, Server, Database).
-   **Relationships**: Arrows connect nodes to show dependencies (e.g., "Application A" -> *Run On* -> "Server B").
-   **Auto-Layout**:
    -   **Vertical**: Arranges the graph from top to bottom (hierarchical).
    -   **Horizontal**: Arranges the graph from left to right.
-   **Navigation**:
    -   **Zoom**: Use your mouse wheel to zoom in and out.
    -   **Pan**: Click and drag on the canvas to move around.
    -   **Drag Nodes**: You can manually reposition nodes by dragging them.

### Filters & Search
You can refine the graph to focus on specific items:
-   **Search CI**: Type a name in the "Search CI" input. The graph will update to show only the matching CI(s) and their immediate neighbors.
-   **Filter by CI Type**: Select a type (e.g., "Server") to show only items of that category.
-   **Filter by Relation**: Select a relationship type (e.g., "runs_on") to show only specific connections.
-   **Clear Filters**: Click the "Clear Filters" button to reset the view.

## Data Import/Export

### Importing Data
You have two options for importing CIs:

#### 1. Quick Import (CSV)
For ad-hoc uploads of inventory data:
1.  Go to the **Import/Export** page.
2.  In the "Quick Import" area, select your CSV file.
3.  Click **Upload**.

#### 2. Scheduled Imports
To set up recurring data synchronization:
1.  Click **"New Import Source"** on the Import Dashboard.
2.  Choose a **Source Type**:
    *   **CSV File (Server Path)**: Reads a CSV file from a path on the server.
    *   **Oracle DB**: Connects to an Oracle database view.
    *   **SharePoint / i-doit**: (Coming Soon).
3.  **Configuration**:
    *   Enter the required details (e.g., File Path or Connection String).
    *   **Test Connection**: Click this button to verify your settings before saving.
4.  **Schedule**: Set a Cron expression (e.g., `0 0 * * *` for daily) to run the import automatically.

### Exporting Data
To download your inventory:
1.  On the **Configuration Items** page, click the **Download icon**.

### Raw Data Inspection
For advanced debugging and data verification, the system captures the full "Raw Data" record from the source during every import.

1.  **View Raw Data**:
    *   On the **Configuration Items** page, click the **Columns** button.
    *   Enable the **"Raw Data"** column.
    *   Click the **{} (JSON)** icon on any row to open the full source record.

2.  **Captured Data per Source**:
    *   **VMware vCenter**: Captures `name`, `id`, `uuid`, `path`, `memory_mb`, `cpu_count`, `status`, `ip_address`, `hostname`, `guest_os`, `notes`.
    *   **CSV**: Captures the entire row as a key-value pair (Header -> Value).
    *   **Oracle DB**: Captures the entire database row (Column -> Value).
    *   **i-doit**: Captures the full JSON object returned by the `cmdb.objects.read` API.
    *   **SharePoint**: Captures all list item properties (excluding internal `_` fields).

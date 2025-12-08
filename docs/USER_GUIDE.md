# CMDB Dashboard - User Guide

This guide provides instructions on how to use the CMDB Dashboard to manage your IT inventory.

## Table of Contents
1.  [Dashboard Overview](#dashboard-overview)
2.  [Managing Configuration Items](#managing-configuration-items)
    *   [Viewing CIs](#viewing-cis)
    *   [Adding & Editing](#adding--editing)
    *   [Deleting](#deleting)
    *   [Health Checks](#health-checks)
3.  [Data Import/Export](#data-importexport)

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
3.  **Result**:
    *   **ONLINE**: The host is reachable. The modal displays the latency and the resolved IP address (e.g., `192.168.1.5`).
    *   **UNREACHABLE**: The host could not be reached. Error details are provided.

## Data Import/Export

### Importing Data
You can bulk import CIs from CSV files:
1.  Go to the **Import/Export** section.
2.  Upload a CSV file matching the required format (see `README.md` for the template).
3.  Review the import status.

### Exporting Data
To download your inventory:
1.  On the **Configuration Items** page, click the **Download icon**.
2.  Select your preferred format: **CSV**, **Excel**, or **JSON**.

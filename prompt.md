Build a modern, professional, mobile-first web application called:

# VEDHAS Tracker

The application is a simple customer/business data collection and tracking system for sales employees.

The primary purpose is:

**Login → Enter Customer Information → Save to Supabase → View/Edit Customers → Export Data as CSV**

Keep the application simple, clean and production-quality. Do not add unnecessary CRM features.

---

# 1. Application Branding

Application name:

**VEDHAS Tracker**

Display the application name exactly as:

**VEDHAS Tracker**

Use the logo provided by the user.

IMPORTANT:

The user will provide a logo image separately.

Use the uploaded logo as the actual application logo.

Do NOT redesign, recreate, modify or replace the logo.

Use the exact provided logo wherever appropriate.

---

# 2. Splash / Loading Screen

When the application is opened, show a professional loading/splash screen before the main application loads.

The splash screen should contain:

- VEDHAS logo
- `VEDHAS Tracker`
- Minimal loading animation

Keep it professional and clean.

Example visual hierarchy:

[VEDHAS LOGO]

VEDHAS Tracker

Loading...

The splash screen should disappear automatically once the application has loaded.

Do not make the splash screen unnecessarily long.

---

# 3. Authentication

Create a login page.

Users should authenticate using:

- Email
- Password

Use Supabase Authentication.

After successful login:

→ Show the VEDHAS Tracker dashboard.

Each customer record must be associated with the authenticated user.

Use Supabase Row Level Security.

Normal users should only access their own records.

---

# 4. Dashboard

Create a clean professional dashboard.

Header:

- VEDHAS logo
- VEDHAS Tracker
- Logged-in user
- Logout

Dashboard cards:

- Total Customers
- Hotels & Residency
- Hospitals
- Schools
- Colleges
- Other Sectors

Main actions:

`+ Add Customer`

`View Customers`

`Export CSV`

Show a recent customers section below.

Keep the dashboard simple.

---

# 5. Add Customer

Create a clean mobile-friendly customer entry form.

The following fields must be available:

### Salesperson/User

Automatically identify the currently logged-in user through Supabase Authentication.

Do not require the salesperson to manually type their username.

---

### S.No.

Automatically generated.

The salesperson should NOT manually enter this.

---

### Customer Name

Text input.

Required.

---

### Sector

Dropdown options:

- Hotels & Residency
- Hospitals
- Schools
- Colleges
- Café & Restaurants
- IT Parks & Offices
- Showrooms
- Fun Parks
- Clubs
- Others

If `Others` is selected:

Display:

`Other Sector`

as a text input.

Only show this field when Others is selected.

---

### POC

Label:

`POC (Point of Contact)`

This means the person whom the salesperson contacts at the customer organization.

Text input.

---

### Contact Number

Phone number input.

Store as TEXT.

---

### Beat No.

Text input.

Allow values such as:

- 01
- B01
- BEAT-05
- 12A

Therefore store as TEXT.

---

### Area

Text input.

---

### City

Text input.

---

### Location

Text input.

This can contain the detailed location/address.

---

### Room Count

Text input.

IMPORTANT:

Store as TEXT in Supabase.

Do NOT use integer.

Examples:

- 50
- 100+
- 25 rooms
- NA
- 20-30

---

### Strength

Text input.

Store as TEXT.

Examples:

- 500
- 1000+
- 250 students
- 50 staff
- NA

---

### Brands

Text input.

This represents the brands currently being used by the customer.

Allow multiple brands to be entered as text.

Example:

`Bisleri, Kinley`

Store as TEXT for the first version.

---

### Required Litres per Month

Numeric/decimal input.

Store as NUMERIC.

Examples:

- 500
- 1000
- 2500
- 1250.5

---

### Current Purchase

Text input.

Examples:

- Bisleri
- Local Supplier
- Own Plant
- Multiple Suppliers
- Not Purchasing

---

### Remarks

Multiline textarea.

Allow the salesperson to enter additional observations and information.

---

# 6. Customer List

Create a customer listing page.

Desktop:

Use a professional table.

Mobile:

Use responsive cards or a horizontally scrollable table.

Show:

- S.No.
- Customer Name
- Sector
- POC
- Contact Number
- Beat No.
- Area
- City
- Location
- Room Count
- Strength
- Brands
- Required Litres per Month
- Current Purchase
- Remarks

Provide:

- Search
- Sector filter
- City filter
- Sort
- View
- Edit
- Delete

---

# 7. CSV EXPORT — VERY IMPORTANT

Implement a proper CSV export feature.

The exported CSV MUST follow the exact same column structure/order as the user's original Excel/CSV format.

The CSV header MUST be exactly:

S.No,Customer Name,Sector,POC,Contact Number,Beat No,Area,City,Location,Room Count,Strength,Branches,Required Litres per month,Current Purchase,Remarks

IMPORTANT:

The exported file must preserve this exact column order.

Do NOT change:

- Column names
- Column order
- Capitalization unnecessarily
- Meaning of columns

The exported file should be compatible with Excel.

---

# 8. CSV Column Mapping

Map application/database fields to the CSV columns as follows:

| CSV Column | Application Field |
|---|---|
| S.No | serial_number |
| Customer Name | customer_name |
| Sector | sector / other_sector |
| POC | poc_name |
| Contact Number | contact_number |
| Beat No | beat_no |
| Area | area |
| City | city |
| Location | location |
| Room Count | room_count |
| Strength | strength |
| Branches | branches |
| Required Litres per month | required_litres_per_month |
| Current Purchase | current_purchase |
| Remarks | remarks |

IMPORTANT:

The original template contains a `Branches` column.

Therefore the application MUST also include:

### Branches

Text input.

Store it as TEXT in Supabase.

Examples:

- 1
- 3
- 5
- 10+
- Multiple branches

This field must appear between:

`Strength`

and

`Required Litres per month`

in the exported CSV.

---

# 9. CSV Export Behaviour

When the user clicks:

`Export CSV`

export the customer records currently accessible to that logged-in user.

The generated filename should be something like:

`VEDHAS_Tracker_Customers_YYYY-MM-DD.csv`

Example:

`VEDHAS_Tracker_Customers_2026-10-21.csv`

The CSV should:

- Open correctly in Microsoft Excel
- Preserve commas and special characters correctly
- Properly quote values containing commas
- Preserve text fields such as `100+`, `NA`, `B01`, etc.
- Include the header row
- Use UTF-8 encoding
- Not corrupt Indian/local-language text
- Export all customer records available to the user

Do not export internal fields such as:

- UUID
- user_id
- created_at
- updated_at

unless explicitly required later.

Only export the 15 business columns defined above.

---

# 10. Supabase Database

Create a table:

`customers`

Fields:

- id → UUID
- serial_number → BIGINT/integer
- user_id → UUID
- customer_name → TEXT
- sector → TEXT
- other_sector → TEXT nullable
- poc_name → TEXT
- contact_number → TEXT
- beat_no → TEXT
- area → TEXT
- city → TEXT
- location → TEXT
- room_count → TEXT
- strength → TEXT
- branches → TEXT
- brands → TEXT
- required_litres_per_month → NUMERIC
- current_purchase → TEXT
- remarks → TEXT
- created_at → TIMESTAMPTZ
- updated_at → TIMESTAMPTZ

---

# 11. Important Data-Type Requirements

These must NOT be changed:

`room_count` → TEXT

`strength` → TEXT

`branches` → TEXT

`contact_number` → TEXT

`beat_no` → TEXT

`required_litres_per_month` → NUMERIC

This is intentional because values such as:

`100+`

`NA`

`B01`

`20-30`

may need to be stored.

---

# 12. Security

Enable Supabase Row Level Security.

A normal authenticated user can:

- INSERT their own records
- SELECT their own records
- UPDATE their own records
- DELETE their own records

Use:

`auth.uid()`

to enforce ownership.

Never expose the Supabase service-role key in frontend code.

Use environment variables for Supabase configuration.

---

# 13. UI Design

The UI should look like a premium business application.

Design principles:

- Clean
- Modern
- Professional
- Minimal
- Responsive
- Mobile-first
- Easy for salespeople to use

Use the provided VEDHAS logo consistently.

The logo should appear:

- Splash screen
- Login page
- Main application header/sidebar

Do not distort the logo.

Maintain its aspect ratio.

---

# 14. Navigation

Use simple navigation:

Dashboard

Customers

Add Customer

Export CSV

Profile / Logout

On mobile, use an appropriate mobile navigation such as bottom navigation or a hamburger menu.

---

# 15. Form UX

The Add Customer form must be optimized for fast data entry.

Use:

- Large touch-friendly inputs
- Clear labels
- Logical sections
- Required field indicators
- Dropdowns
- Helpful placeholders
- Inline validation
- Save button
- Loading state

After successful submission:

Show:

`Customer saved successfully`

Then provide:

`Add Another`

and

`View Customer`

Do not lose form data if validation fails.

---

# 16. Customer Details

When a customer is selected, display all information clearly.

Actions:

- Edit
- Delete
- Back

Before deletion:

Show a confirmation dialog.

---

# 17. Search and Filtering

Customer list should support:

### Search

Search by:

- Customer Name
- POC
- Contact Number
- Area
- City
- Location

### Filters

- Sector
- City

---

# 18. Loading and Error States

Implement proper loading states for:

- Application startup
- Login
- Dashboard
- Customer loading
- Customer saving
- Customer updating
- Customer deletion
- CSV generation

Handle:

- Network errors
- Supabase errors
- Authentication errors
- Validation errors
- Duplicate submission

Display friendly messages.

Never expose raw database errors to users.

---

# 19. Scope

This is intentionally a SIMPLE application.

Do NOT add:

- CRM pipeline
- Lead management
- AI
- WhatsApp
- Email automation
- GPS tracking
- Maps
- Payments
- Inventory
- Invoice management
- Complex analytics
- Notifications
- Advanced reporting
- Complex admin system

The application is primarily:

**A secure customer data collection + storage + CSV export tool.**

---

# 20. Final User Flow

The complete flow should be:

Open VEDHAS Tracker

↓

Splash / Loading Screen

↓

Login

↓

Dashboard

↓

Add Customer

↓

Enter customer information

↓

Save

↓

Data stored securely in Supabase

↓

Customer appears in Customer List

↓

User can View / Edit / Delete

↓

User can click Export CSV

↓

CSV downloads in the EXACT required 15-column format.

The final exported CSV must match this structure:

S.No | Customer Name | Sector | POC | Contact Number | Beat No | Area | City | Location | Room Count | Strength | Branches | Required Litres per month | Current Purchase | Remarks

Do not change this order.

---

# 21. Final Verification

Before considering the project complete, test the following:

1. Login works.
2. Splash screen appears on startup.
3. VEDHAS logo appears correctly.
4. VEDHAS Tracker branding appears correctly.
5. Customer can be added.
6. `Others` sector reveals the Other Sector field.
7. Branches field exists.
8. Room Count is stored as TEXT.
9. Strength is stored as TEXT.
10. Contact Number is stored as TEXT.
11. Beat No is stored as TEXT.
12. Required Litres is stored as NUMERIC.
13. Data is successfully stored in Supabase.
14. User can view their customers.
15. User can edit customers.
16. User can delete customers.
17. RLS prevents users from accessing other users' records.
18. Search works.
19. Filtering works.
20. CSV export works.
21. CSV has exactly the required 15 columns.
22. CSV column order is exactly correct.
23. CSV opens correctly in Excel.
24. CSV values containing commas are handled correctly.
25. No Supabase service-role secret is exposed in frontend code.
26. Application works properly on mobile and desktop.
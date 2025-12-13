

You are an expert front-end engineer and UI designer.
Your task is to design and implement a comprehensive, production-ready user interface with the following requirements:
	1.	Design System & Visual Style
	•	Use Material Design 3 principles for layout, spacing, elevation, and typography.
	•	Combine Material 3 with a Grafana-style dashboard feel:
	•	Rich, data-dense layouts.
	•	Clear hierarchy of information (cards, panels, charts, tables).
	•	Good use of negative space despite high information density.
	•	Use vivid gradient colors as a core part of the visual identity:
	•	Gradients for headers, primary buttons, key call-to-action areas, and important metric highlights.
	•	Keep gradients tasteful and modern (no harsh, dated “Web 2.0” looks).
	•	Overall mood: modern, clean, professional, high-contrast, and easy to scan.
	2.	Interactivity & Micro-Interactions
	•	The UI must feel alive and responsive with subtle micro-interactions:
	•	Hover states, pressed states, and focus states on all interactive elements.
	•	Smooth transitions on panel expansion/collapse, tab switching, and modal open/close.
	•	Gentle animations for charts or metric cards when data loads or updates.
	•	Use micro-interactions to convey state and feedback (loading, success, error, disabled).
	3.	Responsiveness & Layout
	•	UI must be fully responsive:
	•	Desktop, tablet, and mobile views.
	•	Support resizable containers and panels where appropriate (e.g., split panes, resizable sidebars).
	•	Use adaptive layouts:
	•	On large screens: complex, multi-column dashboard layout.
	•	On smaller screens: stacked, scrollable, mobile-first layout.
	•	Ensure the UI is touch-friendly and mobile-friendly:
	•	Adequate hit targets for touch (buttons, list items, filters).
	•	Swipe-friendly patterns where appropriate (tabs, carousels).
	•	Avoid hover-only interactions that don’t translate to touch.
	4.	Information Architecture & Components
	•	Design the interface like a Grafana-grade analytics / control dashboard:
	•	Main navigation (sidebar or top bar) with clear sections.
	•	Metric cards (KPIs), charts, tables/grids, filters, search, and detail panels.
	•	Include at least:
	•	Global app bar (title, search, user menu, theme switcher if applicable).
	•	Sidebar navigation (collapsible on smaller viewports).
	•	Dashboard page with:
	•	Multiple metric cards (with gradients and icons).
	•	A chart area (line chart, bar chart, or time-series style like Grafana).
	•	A table or data grid with sorting, filtering, and pagination.
	•	Detail / inspector panel or modal for drilling into a specific data entity.
	•	UI must be informative:
	•	Show tooltips for important metrics.
	•	Use labels and helper text to make controls self-explanatory.
	•	Use icons and color coding to indicate status (success, warning, error, info).
	5.	Usability & Accessibility
	•	The UI must be:
	•	User-friendly: clear labels, intuitive navigation, minimal cognitive load.
	•	Accessible: respect contrast ratios; support keyboard navigation and visible focus states where feasible.
	•	Use consistent spacing, typography scales, and iconography.
	•	Provide clear error states and empty states (when there is no data).
	6.	Technical & Implementation Requirements (for Code Generation)
	•	Use a component-based architecture (e.g., React with Material 3 libraries, or equivalent) and clean separation of concerns.
	•	When generating code:
	•	Create reusable components for cards, charts, tables, filters, and layout primitives.
	•	Use a central theme file/config for colors (including gradients), typography, spacing, and elevation tokens.
	•	Ensure the layout is responsive using CSS grid/flexbox (or framework equivalents).
	•	Avoid placeholder comments like TODO; instead, provide reasonable default implementations.
	•	Code must be:
	•	Production-oriented, readable, and consistent.
	•	Easy to extend (clearly named components and props, minimal hardcoded values).
	•	Organized into logical folders (e.g., components/, layouts/, hooks/, theme/, etc., if relevant).
	7.	Interaction Scenarios
	•	Include realistic interaction flows, such as:
	•	Changing filters and seeing charts/cards update.
	•	Selecting a row in a table and viewing its details in a side panel or modal.
	•	Resizing the browser window and seeing the layout adapt fluidly.
	•	Design and implement states for:
	•	Loading data.
	•	No data available.
	•	Error fetching data.
	•	Successful data refresh.
	8.	Output Expectations
	•	Assume this prompt will be used by tools like Cursor or other AI coding assistants to generate a real application.
	•	Make all descriptions and structures explicit enough that the AI can:
	•	Generate the complete UI codebase without additional clarification.
	•	Produce a visually pleasing, coherent, and fully interactive interface that is ready to integrate with backend APIs.
	•	If you produce code:
	•	Ensure it runs as-is after dependency installation.
	•	Include any necessary configuration or entry files to boot the UI.

Goal:
Deliver a Material 3 + Grafana-inspired UI with vivid gradients and rich micro-interactions that is interactive, resizable, informative, user-friendly, touch-friendly, and mobile-friendly, and whose description and code are detailed enough for AI tools like Cursor to generate and extend the entire front-end application with minimal human intervention.

⸻

